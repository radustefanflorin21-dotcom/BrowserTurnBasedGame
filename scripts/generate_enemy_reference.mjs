import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadGameConfig() {
  const src = fs.readFileSync(path.join(root, "config.js"), "utf8");
  const sandbox = {};
  vm.runInNewContext(`${src}\nthis.GAME_CONFIG = GAME_CONFIG;`, sandbox);
  return sandbox.GAME_CONFIG;
}

function extractFunctionBody(src, fnName) {
  const sig = `function ${fnName}`;
  const start = src.indexOf(sig);
  if (start < 0) return "";
  const braceStart = src.indexOf("{", start + sig.length);
  let depth = 0;
  for (let i = braceStart; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(braceStart + 1, i);
    }
  }
  return "";
}

function extractScriptBlocks(fnBody) {
  const blocks = new Map();
  const re = /if \(scriptId === "([^"]+)"\) \{/g;
  let m;
  while ((m = re.exec(fnBody))) {
    const id = m[1];
    const open = m.index + m[0].length - 1;
    let depth = 0;
    for (let i = open; i < fnBody.length; i++) {
      if (fnBody[i] === "{") depth++;
      else if (fnBody[i] === "}") {
        depth--;
        if (depth === 0) {
          blocks.set(id, fnBody.slice(open + 1, i));
          break;
        }
      }
    }
  }
  return blocks;
}

function extractHandlerBlocks(serverJs) {
  const blocks = new Map();
  const start = serverJs.indexOf("const SCRIPT_HANDLERS = {");
  if (start < 0) return blocks;
  const bodyStart = serverJs.indexOf("{", start) + 1;
  let depth = 1;
  let end = bodyStart;
  for (let i = bodyStart; i < serverJs.length; i++) {
    if (serverJs[i] === "{") depth++;
    else if (serverJs[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const handlersBody = serverJs.slice(bodyStart, end);
  const re = /\n\s{2}([a-z_]+)\(foe,\s*st,\s*ctx\)\s*\{/g;
  let m;
  while ((m = re.exec(handlersBody))) {
    const id = m[1];
    const open = m.index + m[0].length - 1;
    depth = 0;
    for (let i = open; i < handlersBody.length; i++) {
      if (handlersBody[i] === "{") depth++;
      else if (handlersBody[i] === "}") {
        depth--;
        if (depth === 0) {
          blocks.set(id, handlersBody.slice(open + 1, i));
          break;
        }
      }
    }
  }
  return blocks;
}

function titleCaseKey(key) {
  return String(key || "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function inferEffects(chunk) {
  const effect = [];
  if (/applyBleed|Bleed/i.test(chunk)) effect.push("bleed");
  if (/applyPoison|Poison/i.test(chunk)) effect.push("poison");
  if (/applyBurn|Burn/i.test(chunk)) effect.push("burn");
  if (/applyPlayerAccuracyDown|applyPartyMemberBlind|Blind|accuracy/i.test(chunk))
    effect.push("blind / accuracy down");
  if (/applyPartyMemberCripple|Cripple|staminaCostUp/i.test(chunk))
    effect.push("cripple (+1 stamina cost)");
  if (/tryPartyMemberStun|tryPlayerStun|stun/i.test(chunk)) effect.push("stun chance");
  if (/playerFragile|incomingDamageUp/i.test(chunk)) effect.push("fragile / increased damage taken");
  if (/healSelf|\.hp = Math\.min|Mends|Rootmend|Seedling Mend|Recovery/i.test(chunk))
    effect.push("heal ally or self");
  if (/spawnReinforcement|spawnMirage|emerges|summon|Call Fallen/i.test(chunk))
    effect.push("summon reinforcement");
  if (/physResBonus|magicResBonus|mitigation|absorb|evade|Guard|Hide|Shell|Barkskin|Thick Hide/i.test(chunk))
    effect.push("defensive buff");
  if (/outgoingDamageBonus|Rage|Rampage|Fury|Pack Howl|Predator Focus/i.test(chunk))
    effect.push("offensive buff");
  if (/hitAdjacent|dealRawDamageToPlayerAdjacent|for \(const m of \(st\.party|rollBlindAll/i.test(chunk))
    effect.push("multi-target / AoE");
  if (/extendPlayerDebuff|extends your debuffs/i.test(chunk)) effect.push("extends debuff duration");
  if (/taunt|Taunt/i.test(chunk)) effect.push("taunt");
  if (/reflect/i.test(chunk)) effect.push("damage reflect");
  if (/Phase|hpFrac.*!foe\.combat\./i.test(chunk)) effect.push("phase transition");
  if (/comboChanceDown|Constrict/i.test(chunk)) effect.push("reduces combo chance");
  if (/SuppressedDamage|damage down/i.test(chunk)) effect.push("reduces player damage dealt");
  return effect.length ? effect.join("; ") + "." : "Combat ability.";
}

function parseSkillsFromBlock(body) {
  const byKey = new Map();

  const addSkill = (key, data) => {
    if (!key || key === "basic") return;
    const existing = byKey.get(key) || {
      name: titleCaseKey(key),
      cd: null,
      mult: null,
      effect: "Combat ability.",
      type: "Active"
    };
    byKey.set(key, { ...existing, ...data, name: data.name || existing.name });
  };

  const cdRe = /setCd\("([^"]+)",\s*(\d+)\)/g;
  let cm;
  while ((cm = cdRe.exec(body))) {
    addSkill(cm[1], { cd: Number(cm[2]) });
  }

  const usesRe = /(?:appendFightLog|ctx\.log)\(`\$\{foe\.name\} uses ([^`.]+)`\)/g;
  while ((cm = usesRe.exec(body))) {
    const label = cm[1].replace(/\.$/, "").trim();
    const keyMatch = body.slice(Math.max(0, cm.index - 400), cm.index).match(/ready\("([^"]+)"\)[\s\S]*$/);
    if (keyMatch) addSkill(keyMatch[1], { name: label.split("(")[0].trim(), effect: inferEffects(body.slice(cm.index - 200, cm.index + 400)) });
  }

  const flavorRe = /appendFightLogFlavorWithEffects\(`\$\{foe\.name\} uses ([^`.]+)`/g;
  while ((cm = flavorRe.exec(body))) {
    const label = cm[1].replace(/\.$/, "").trim();
    const keyMatch = body.slice(Math.max(0, cm.index - 400), cm.index).match(/ready\("([^"]+)"\)[\s\S]*$/);
    if (keyMatch) addSkill(keyMatch[1], { name: label, effect: inferEffects(body.slice(cm.index - 200, cm.index + 600)) });
  }

  const readyRe = /if\s*\([^)]*ready\("([^"]+)"\)[^)]*\)\s*\{/g;
  while ((cm = readyRe.exec(body))) {
    const key = cm[1];
    const chunkStart = cm.index;
    let depth = 0;
    let chunkEnd = chunkStart;
    const open = body.indexOf("{", chunkStart);
    for (let i = open; i < body.length; i++) {
      if (body[i] === "{") depth++;
      else if (body[i] === "}") {
        depth--;
        if (depth === 0) {
          chunkEnd = i;
          break;
        }
      }
    }
    const chunk = body.slice(chunkStart, chunkEnd + 1);

    let mult = null;
    if (/atk\s*\*\s*([\d.]+)/.test(chunk)) {
      mult = Number(chunk.match(/atk\s*\*\s*([\d.]+)/)[1]);
    } else if (/(?:strv|intv)\s*\*\s*([\d.]+)/.test(chunk)) {
      mult = Number(chunk.match(/(?:strv|intv)\s*\*\s*([\d.]+)/)[1]);
    } else if (/ctx\.hit\([^,]+,\s*ctx\.atk\s*\*\s*([\d.]+)/.test(chunk)) {
      mult = Number(chunk.match(/ctx\.hit\([^,]+,\s*ctx\.atk\s*\*\s*([\d.]+)/)[1]);
    }
    // monsterPhysicalDamageFromBase uses level-scaled damage — omit bogus ATK %

    const namedHit = chunk.match(/dealRawDamageToPlayer\([^,]+,[^,]+,[^,]+,\s*"([^"]+)"/) ||
      chunk.match(/ctx\.hit\([^,]+,[^,]+,\s*"([^"]+)"/);
    let name = titleCaseKey(key);
    if (namedHit) {
      name = namedHit[1]
        .replace(/\s+(you|at you|over you|under you|into you|onto you|through you)$/i, "")
        .replace(/\s+you$/i, "")
        .trim();
    }

    addSkill(key, { name, mult, effect: inferEffects(chunk) });
  }

  const basicMult =
    body.match(/Basic filler[\s\S]*?atk\s*\*\s*([\d.]+)\s*\*\s*outMult/)?.[1] ||
    body.match(/dealRawDamageToPlayer\([^)]*Math\.floor\(atk\s*\*\s*([\d.]+)\s*\*\s*outMult[^)]*nips/)?.[1] ||
    body.match(/dealRawDamageToPlayer\([^)]*Math\.floor\(atk\s*\*\s*([\d.]+)\s*\*\s*outMult[^)]*bites/)?.[1] ||
    body.match(/dealRawDamageToPlayer\([^)]*Math\.floor\(atk\s*\*\s*outMult\)/) ? 1 : null;

  return { skills: [...byKey.values()], basicMult: basicMult != null ? Number(basicMult) : null };
}

function roleDescription(role) {
  const map = {
    tank: "High VIT, physical resist; taunts, shields, mitigation.",
    bruiser: "STR-focused; heavy single-target and AoE hits.",
    assassin: "DEX-focused; burst damage, bleed, evasion.",
    mage: "INT-focused; magic damage and DoTs.",
    controller: "Disrupts with blind, cripple, accuracy down, debuff extension.",
    support: "Heals allies, party buffs, light damage.",
    summoner: "Spawns reinforcements, buffs minions.",
    harasser: "Low damage, debuff pressure (controller-style).",
    buffer: "Party buffs for allies (support-style)."
  };
  return map[role] || map.bruiser;
}

function fmtMult(mult) {
  if (mult == null || !Number.isFinite(mult)) return "—";
  return `${Math.round(mult * 100)}% ATK`;
}

function exampleDamage(atk, mult) {
  if (mult == null) return "—";
  return String(Math.max(1, Math.floor(atk * mult)));
}

const cfg = loadGameConfig();
const gameJs = fs.readFileSync(path.join(root, "game.js"), "utf8");
const serverJs = fs.readFileSync(path.join(root, "server/combat/enemy_scripts.js"), "utf8");

const blocks = new Map();
for (const [k, v] of extractScriptBlocks(extractFunctionBody(gameJs, "runExtendedBiomeEnemyScripts"))) {
  blocks.set(k, v);
}
for (const [k, v] of extractScriptBlocks(extractFunctionBody(gameJs, "enemyCombatRunScriptInner"))) {
  blocks.set(k, v);
}
for (const [k, v] of extractHandlerBlocks(serverJs)) {
  if (!blocks.has(k)) blocks.set(k, v);
}

const ms = cfg.monsterScaling || {};
const exampleAtk = 45;

const lines = [];
lines.push("ENEMY SKILLS REFERENCE");
lines.push("Browser Turn-Based Game — generated from config.js + combat scripts");
lines.push("=".repeat(80));
lines.push("");
lines.push("Each enemy has a combat role, spawn rarity, and a scripted ability rotation.");
lines.push("Bosses (isBoss) and dungeon elites often have phase transitions at ~70% and ~35% HP.");
lines.push("");
lines.push("HOW ENEMY DAMAGE IS CALCULATED");
lines.push("-".repeat(80));
lines.push("Enemy attack (ATK) scales with level, rarity stat budget, and role stat split.");
lines.push("Skill hit ≈ floor(ATK × skill multiplier × outgoing damage modifiers × mood/region).");
lines.push("Some skills use monsterPhysicalDamageFromBase(level-scaled) instead of a flat ATK %.");
lines.push("");
lines.push(`Example damage below uses ATK ≈ ${exampleAtk} (typical mid-level foe), BEFORE`);
lines.push("player resist, buffs/debuffs, and crit. Actual values vary by level and rarity.");
lines.push("");
lines.push("Enemy stamina: common 6, rare 7, epic 7, myth 8, ancient 9 (per turn budget).");
lines.push("Cooldown (CD): turns until the ability can be used again after casting.");
lines.push("");
lines.push("COMBAT ROLES");
lines.push("-".repeat(80));
for (const role of ["tank", "bruiser", "assassin", "mage", "controller", "support", "summoner"]) {
  lines.push(`${role.padEnd(12)} ${roleDescription(role)}`);
}
lines.push("");
lines.push("=".repeat(80));

const byRole = new Map();
for (const e of cfg.enemies) {
  const role = (e.combatRole || "bruiser").toLowerCase();
  if (!byRole.has(role)) byRole.set(role, []);
  byRole.get(role).push(e);
}

const roleOrder = ["tank", "bruiser", "assassin", "mage", "controller", "support", "summoner", "harasser", "buffer"];

for (const role of roleOrder) {
  const list = byRole.get(role);
  if (!list?.length) continue;
  lines.push("");
  lines.push("=".repeat(80));
  lines.push(`${role.toUpperCase()} ENEMIES`);
  lines.push("=".repeat(80));

  for (const e of list.sort((a, b) => a.name.localeCompare(b.name))) {
    const script = e.combatScript || "(role fallback)";
    const rarity = e.spawnRarity || "common";
    const levels = Array.isArray(e.possibleLevels)
      ? `${Math.min(...e.possibleLevels)}–${Math.max(...e.possibleLevels)}`
      : "—";
    const boss = e.isBoss ? "  |  BOSS" : "";
    const stam = e.staminaPerTurn || ms.foeStaminaByRarity?.[rarity] || 6;

    lines.push("");
    lines.push(e.name);
    lines.push(
      `  Role: ${e.combatRole || role}  |  Rarity: ${rarity}${boss}  |  Levels: ${levels}  |  Stamina/turn: ${stam}`
    );
    lines.push(`  Script: ${script}`);

    const body = e.combatScript ? blocks.get(e.combatScript) : null;
    const parsed = body ? parseSkillsFromBlock(body) : { skills: [], basicMult: null };

    if (parsed.skills.length) {
      for (const sk of parsed.skills) {
        lines.push("");
        lines.push(`  ${sk.name}`);
        lines.push(`    CD: ${sk.cd != null ? sk.cd : "—"}  |  Type: ${sk.type}`);
        if (sk.mult != null) {
          lines.push(`    Scaling: ${fmtMult(sk.mult)}`);
          lines.push(`    ~Damage @ ATK ${exampleAtk}: ${exampleDamage(exampleAtk, sk.mult)}`);
        } else if (/heal|Mend|Recovery|Prayer|Guard|Hide|Shell|Howl|Focus|Instinct|Phase|Summon|Vanish|Burrow|Taunt|Ward|Carapace|Barkskin|Rage|Fury|Chant|Empower|opens|enters|raises|declares|wakes|pulses|hard/i.test(sk.name)) {
          lines.push("    Damage: 0");
        }
        lines.push(`    Effect: ${sk.effect}`);
      }
    } else if (!e.combatScript) {
      lines.push("");
      lines.push("  (Uses generic role rotation by combatRole — no custom script.)");
    } else {
      lines.push("");
      lines.push("  (Uses generic role rotation — Power Strike / basic attacks by role.)");
    }

    if (parsed.basicMult != null) {
      lines.push("");
      lines.push("  Basic Attack");
      lines.push("    CD: 0  |  Type: Active");
      lines.push(`    Scaling: ${fmtMult(parsed.basicMult)}`);
      lines.push(`    ~Damage @ ATK ${exampleAtk}: ${exampleDamage(exampleAtk, parsed.basicMult)}`);
      lines.push("    Effect: Standard filler when specials are on cooldown.");
    }
  }
}

lines.push("");
lines.push("=".repeat(80));
lines.push("END OF REFERENCE");
lines.push("=".repeat(80));

const outPath = path.join(root, "docs", "enemy-skills-reference.txt");
fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
console.log(`Wrote ${outPath} (${cfg.enemies.length} enemies, ${blocks.size} script blocks parsed)`);
