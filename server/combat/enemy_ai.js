import { getEnemyDefByName, getItemDef } from "../load_game_config.js";
import { resolveIncomingToMember } from "./formulas.js";
import { getPlayerDamageReductionPct, getPlayerEvasionUpPct, getMemberIncomingDamageUpPct } from "./status.js";
import {
  absorbDamageWithShield,
  applyHeroIncomingDamageModifiers,
  tryRiposteAfterHit
} from "./class_state.js";
import { trySecondBreath } from "./combat_passives.js";
import { getFoeEffectiveAttack, getFoeOutgoingDamageMult } from "./monster_stats.js";
import { runEnemyScriptTurn } from "./enemy_scripts.js";
import { isFoeStunned } from "./status.js";
import { tryProcFrosthornCrippleOnHit, tryProcHeldColossusCrippleOnHit } from "./set_procs.js";

function countEquippedSetPieces(equipment, setName) {
  const want = typeof setName === "string" ? setName.trim() : "";
  if (!want || !equipment || typeof equipment !== "object") return 0;
  let count = 0;
  Object.values(equipment).forEach((itemName) => {
    if (!itemName) return;
    const def = getItemDef(itemName);
    if (def?.set === want) count += 1;
  });
  return count;
}

function tryProcThornbackGraveguardBleed(equipment, foe, damageTaken, rng) {
  if (!foe || foe.hp <= 0) return;
  const pieces = countEquippedSetPieces(equipment || null, "Thornback Graveguard Set");
  if (pieces < 3) return;
  if (!rng?.chance?.(15)) return;
  if (!foe.combat || typeof foe.combat !== "object") foe.combat = { skillCd: {} };
  const tick = Math.max(1, Math.floor(Math.max(1, Number(damageTaken) || 0) * 0.08));
  foe.combat.bleedTurns = Math.max(foe.combat.bleedTurns || 0, 2);
  foe.combat.bleedDamage = Math.max(foe.combat.bleedDamage || 0, tick);
}

export function initFoeCombatRuntime(foe) {
  const def = getEnemyDefByName(foe.name);
  const script = def?.combatScript?.trim?.() || "";
  foe.combat = {
    script,
    skillCd: {},
    actCount: 0,
    raptorActCount: 0,
    wolfHowlDone: false
  };
}

function syncHeroHp(st) {
  const hero = st.party?.find((m) => m?.kind === "hero");
  if (hero) {
    st.playerHp = hero.hp;
    st.playerMax = hero.maxHp;
  }
}

/** Living party member a taunted foe must attack (Vanguard / taunt caster). */
export function getTauntedPartyMember(st, attackingFoe) {
  const living = (st.party || []).filter((m) => m && m.hp > 0);
  if (!living.length || !attackingFoe?.combat) return null;
  if ((attackingFoe.combat.tauntedByVanguardTurns || 0) <= 0) return null;
  const uid = attackingFoe.combat.tauntedByVanguardTargetUid;
  if (typeof uid === "number") {
    const forced = living.find((m) => m.uid === uid);
    if (forced) return forced;
  }
  return living.find((m) => m.kind === "hero") || living[0];
}

export function pickPartyTarget(st, targetRule, rng, attackingFoe) {
  const living = (st.party || []).filter((m) => m && m.hp > 0);
  if (!living.length) return null;

  const taunted = getTauntedPartyMember(st, attackingFoe);
  if (taunted) return taunted;

  const guarded = living.filter((m) => (m.guardedTurns || 0) > 0 && (m.guardedRedirectPct || 0) > 0);
  if (guarded.length && rng) {
    const maxRedirect = Math.max(...guarded.map((m) => m.guardedRedirectPct || 0));
    if (rng.chance(maxRedirect)) {
      const pick = guarded.reduce((a, b) =>
        (a.guardedRedirectPct || 0) >= (b.guardedRedirectPct || 0) ? a : b
      );
      const guardian = living.find((m) => m.uid === pick.guardedByUid);
      if (guardian && guardian.hp > 0) return guardian;
    }
  }

  const hpFrac = (m) => m.hp / Math.max(1, m.maxHp);
  const pickMinHp = () => living.reduce((a, b) => (hpFrac(a) <= hpFrac(b) ? a : b));
  const pickMaxHp = () => living.reduce((a, b) => (hpFrac(a) >= hpFrac(b) ? a : b));

  switch (String(targetRule || "")) {
    case "assassin":
    case "weakest":
      return pickMinHp();
    case "bruiser":
    case "tank":
      return pickMaxHp();
    case "mage":
    case "controller":
    default:
      return pickMinHp();
    case "highest_damage":
      return living.reduce((a, b) => {
        const sa = (a.str || 0) + (a.kind === "hero" ? 5 : 0);
        const sb = (b.str || 0) + (b.kind === "hero" ? 5 : 0);
        return sa >= sb ? a : b;
      });
  }
}

export function dealFoeDamageToMember(st, foe, member, rawDamage, verb, rng, player) {
  if (!member || member.hp <= 0) return { dmg: 0, shieldLog: null, evaded: false, riposteLog: null };
  if (member.kind === "hero" && rng) {
    const eva = getPlayerEvasionUpPct(st);
    if (eva > 0 && rng.chance(eva)) {
      return { dmg: 0, shieldLog: null, evaded: true, riposteLog: null };
    }
  }
  let raw = Math.max(1, Math.floor(rawDamage));
  const dr = getPlayerDamageReductionPct(st);
  if (dr > 0) raw = Math.max(1, Math.floor(raw * (1 - dr / 100)));
  if (member.kind === "hero" && player) {
    raw = applyHeroIncomingDamageModifiers(st, member, player, raw);
  }
  if (st.status?.playerFragileTurns > 0) raw = Math.floor(raw * 1.1);
  const incUp = getMemberIncomingDamageUpPct(st, member);
  if (incUp > 0) raw = Math.max(1, Math.floor(raw * (1 + incUp / 100)));
  const shielded = absorbDamageWithShield(st, raw);
  const dmg = resolveIncomingToMember(shielded.damage, member);
  member.hp = Math.max(0, member.hp - dmg);
  let heldColossusLog = null;
  if (dmg > 0) {
    if (member.kind === "hero") {
      tryProcThornbackGraveguardBleed(player?.equipment, foe, dmg, rng);
    }
    const equipment =
      member.kind === "hero"
        ? player?.equipment
        : typeof member.companionSlotIndex === "number"
          ? player?.companions?.[member.companionSlotIndex]?.equipment
          : null;
    heldColossusLog = tryProcHeldColossusCrippleOnHit(equipment, foe, rng, dmg);
    const frosthornLog = tryProcFrosthornCrippleOnHit(equipment, foe, rng, dmg, "physical");
    if (frosthornLog) heldColossusLog = heldColossusLog || frosthornLog;
  }
  syncHeroHp(st);
  let secondBreathLog = null;
  if (member.kind === "hero" && player) {
    secondBreathLog = trySecondBreath(st, player, member);
  }
  let riposteLog = null;
  if (dmg > 0 && member.kind === "hero" && player) {
    const rip = tryRiposteAfterHit(st, foe, member, player);
    if (rip?.log) riposteLog = rip.log;
  }
  return { dmg, shieldLog: shielded.log, evaded: false, riposteLog, secondBreathLog, heldColossusLog };
}

function getAdjacentPartyMembers(st, centerMember, count) {
  const living = (st.party || []).filter((m) => m && m.hp > 0);
  const idx = living.findIndex((m) => m.uid === centerMember.uid);
  if (idx < 0) return [];
  const out = [];
  for (let d = 1; d <= count && out.length < count; d++) {
    if (idx - d >= 0) out.push(living[idx - d]);
    if (out.length >= count) break;
    if (idx + d < living.length) out.push(living[idx + d]);
  }
  return out.slice(0, count);
}

export function createEnemyTurnContext(st, foe, rng, appendLog, player, enemyHits) {
  const atk = getFoeEffectiveAttack(foe);
  const outMult = getFoeOutgoingDamageMult(st, foe);
  const cd = foe.combat.skillCd;

  return {
    rng,
    atk,
    outMult,
    player,
    ready(key) {
      return !cd[key] || cd[key] <= 0;
    },
    setCd(key, turns) {
      cd[key] = Math.max(0, Math.floor(turns));
    },
    pickTarget(rule) {
      return pickPartyTarget(st, rule, rng, foe);
    },
    hit(member, raw, verb) {
      if (!member) return;
      const res = dealFoeDamageToMember(st, foe, member, raw, verb, rng, player);
      if (Array.isArray(enemyHits)) {
        enemyHits.push({
          foeUid: foe.uid,
          targetPartyUid: member.uid,
          damage: res.evaded ? 0 : Math.max(0, Math.floor(res.dmg || 0)),
          missed: !!res.evaded
        });
      }
      if (res.evaded) {
        appendLog(`${foe.name} attacks ${member.name} — ${member.name} evades!`);
        return;
      }
      if (res.shieldLog) appendLog(res.shieldLog);
      appendLog(`${foe.name} ${verb} ${member.name} for ${res.dmg} damage.`);
      if (res.riposteLog) appendLog(res.riposteLog);
      if (res.secondBreathLog) appendLog(res.secondBreathLog);
      if (res.heldColossusLog) appendLog(res.heldColossusLog);
    },
    hitAdjacent(centerMember, raw, verb, adjacentCount = 1, perTargetMult = 1) {
      if (!centerMember) return;
      const mult = typeof perTargetMult === "number" && perTargetMult > 0 ? perTargetMult : 1;
      const targets = [centerMember, ...getAdjacentPartyMembers(st, centerMember, adjacentCount)];
      const seen = new Set();
      for (const m of targets) {
        if (!m || seen.has(m.uid)) continue;
        seen.add(m.uid);
        this.hit(m, Math.max(1, Math.floor(raw * mult)), verb);
      }
    },
    log(line) {
      appendLog(line);
    },
    foeHpFrac() {
      return foe.maxHp > 0 ? foe.hp / foe.maxHp : 1;
    },
    healSelf(pct) {
      const amt = Math.max(1, Math.floor(foe.maxHp * pct));
      const before = foe.hp;
      foe.hp = Math.min(foe.maxHp, foe.hp + amt);
      if (foe.hp > before) appendLog(`${foe.name} recovers ${foe.hp - before} HP.`);
    }
  };
}

function tickEnemyCooldowns(foe) {
  const cd = foe.combat?.skillCd;
  if (!cd) return;
  Object.keys(cd).forEach((k) => {
    if (cd[k] > 0) {
      cd[k] -= 1;
      if (cd[k] <= 0) delete cd[k];
    }
  });
}

/** Run one enemy's turn (scripted or role fallback). */
export function runSingleEnemyTurn(foe, st, rng, appendLog, player, enemyHits) {
  if (!foe.combat) initFoeCombatRuntime(foe);
  if (isFoeStunned(foe)) {
    appendLog(`${foe.name} is stunned and cannot act.`);
    tickEnemyCooldowns(foe);
    return;
  }
  foe.combat.actCount = (foe.combat.actCount || 0) + 1;

  const def = getEnemyDefByName(foe.name);
  const scriptId = def?.combatScript?.trim?.() || foe.combat.script || "";
  const ctx = createEnemyTurnContext(st, foe, rng, appendLog, player, enemyHits);

  if (scriptId) {
    const ran = runEnemyScriptTurn(scriptId, foe, st, ctx);
    if (ran) {
      tickEnemyCooldowns(foe);
      return;
    }
  }

  const member = ctx.pickTarget("bruiser");
  if (member) {
    ctx.hit(member, ctx.atk * ctx.outMult, "hits");
  }
  tickEnemyCooldowns(foe);
}
