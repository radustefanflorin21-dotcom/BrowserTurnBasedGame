import { getEnemyDefByName, getItemDef, loadGameConfig } from "../load_game_config.js";
import { resolveIncomingToMember, totalStat, sumEquippedBonusStats } from "./formulas.js";
import { getPlayerDamageReductionPct, getPlayerEvasionUpPct, getMemberIncomingDamageUpPct } from "./status.js";
import {
  absorbDamageWithShield,
  applyHeroIncomingDamageModifiers,
  tryRiposteAfterHit
} from "./class_state.js";
import { trySecondBreath } from "./combat_passives.js";
import { getFoeEffectiveAttack, getFoeOutgoingDamageMult, getEnemyCombatRoleKey } from "./monster_stats.js";
import { runEnemyScriptTurn } from "./enemy_scripts.js";
import { isFoeStunned, applyPlayerBurn, ensureCombatStatus } from "./status.js";
import { tryProcFrosthornCrippleOnHit, tryProcHeldColossusCrippleOnHit } from "./set_procs.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const TacticalEnemyResolve = require("../../shared/tactical_enemy_resolve.js");
const EnemyTacticalTargeting = require("../../shared/enemy_tactical_targeting.js");
const EnemyTacticalCombat = require("../../shared/enemy_tactical_combat.js");
require("../../shared/enemy_tactical_skills_data.js");

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

function formulaDexEvasionPct(dex) {
  return Math.min(50, Math.max(0, Math.floor((Number(dex) || 0) * 0.35)));
}

function rollEnemyHitVsHero(st, foe, player, rng) {
  if (!rng) return true;
  const cfg = loadGameConfig();
  const sys = cfg?.statSystem && typeof cfg.statSystem === "object" ? cfg.statSystem : {};
  let enemyHit =
    typeof sys.enemyBaseHitChancePct === "number" && Number.isFinite(sys.enemyBaseHitChancePct)
      ? sys.enemyBaseHitChancePct
      : 100;
  if (foe && typeof foe.moodAccuracyPct === "number") enemyHit += foe.moodAccuracyPct;
  if (st?.status?.playerAccuracyDownTurns > 0 && typeof st.status.playerAccuracyDownPct === "number") {
    enemyHit -= Math.max(0, Math.min(50, st.status.playerAccuracyDownPct));
  }
  let eva = getPlayerEvasionUpPct(st);
  if (player) {
    const dex = totalStat(player, "dex");
    const gear = sumEquippedBonusStats(player.equipment);
    eva += formulaDexEvasionPct(dex) + (gear.evasion || 0);
  }
  const minH = typeof sys.minHitChancePct === "number" ? sys.minHitChancePct : 15;
  const maxH = typeof sys.maxHitChancePct === "number" ? sys.maxHitChancePct : 100;
  const hitPct = Math.min(maxH, Math.max(minH, enemyHit - eva));
  return rng.chance(hitPct);
}

function applyFoeCritToRaw(foe, raw, rng) {
  if (!rng || !foe) return raw;
  const cfg = loadGameConfig();
  const ms = cfg?.monsterScaling && typeof cfg.monsterScaling === "object" ? cfg.monsterScaling : {};
  const dex = typeof foe.dex === "number" && foe.dex > 0 ? foe.dex : 0;
  const base = typeof ms.enemyCritBasePct === "number" ? ms.enemyCritBasePct : 5;
  const perDex = typeof ms.enemyCritPerDexPct === "number" ? ms.enemyCritPerDexPct : 0.2;
  const moodCrit = typeof foe.moodCritPct === "number" ? foe.moodCritPct : 0;
  const p = Math.min(55, base + dex * perDex + moodCrit);
  if (!rng.chance(p)) return raw;
  const mult = typeof ms.enemyCritDamageMult === "number" ? ms.enemyCritDamageMult : 1.5;
  return Math.max(1, Math.floor(raw * mult));
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
    if (!rollEnemyHitVsHero(st, foe, player, rng)) {
      return { dmg: 0, shieldLog: null, evaded: true, riposteLog: null };
    }
  }
  let raw = Math.max(1, Math.floor(rawDamage));
  if (rng) raw = applyFoeCritToRaw(foe, raw, rng);
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

export function createEnemyTurnContext(st, foe, rng, appendLog, player, enemyHits, recorder = null) {
  const atk = getFoeEffectiveAttack(foe);
  const outMult = getFoeOutgoingDamageMult(st, foe);
  const cd = foe.combat.skillCd;
  const def = getEnemyDefByName(foe.name);
  const scriptId = def?.combatScript?.trim?.() || foe.combat.script || "";
  const role = getEnemyCombatRoleKey(def) || "bruiser";

  function skillCfg(skillKey) {
    return EnemyTacticalTargeting.getEnemySkillTargeting(scriptId, skillKey, role);
  }

  return {
    rng,
    atk,
    outMult,
    player,
    scriptId,
    role,
    ready(key) {
      return !cd[key] || cd[key] <= 0;
    },
    setCd(key, turns) {
      cd[key] = Math.max(0, Math.floor(turns));
      foe.combat.__pendingSkillKey = key;
    },
    pickTarget(rule) {
      if (st?.tactical && typeof foe.gridX === "number") {
        const basic = EnemyTacticalTargeting.getBasicAttackForRole(role);
        const picked = TacticalEnemyResolve.pickBestPlayer(st, foe, basic, rule, rng);
        if (picked) return picked;
      }
      return pickPartyTarget(st, rule, rng, foe);
    },
    pickTargetForSkill(skillKey, rule) {
      const cfg = skillCfg(skillKey);
      if (st?.tactical && typeof foe.gridX === "number") {
        return TacticalEnemyResolve.pickBestPlayer(st, foe, cfg, rule || "nearest", rng);
      }
      return pickPartyTarget(st, rule || "bruiser", rng, foe);
    },
    applySkill(skillKey, opts) {
      EnemyTacticalCombat.applyEnemySkill(st, foe, scriptId, role, skillKey, { ...opts, rng }, {
        hitMember: (member, raw, verb) => this.hit(member, raw, verb),
        log: (line) => this.log(line),
        healSelf: (pct) => this.healSelf(pct),
        healFoe: (targetFoe, amount) => this.healFoe(targetFoe, amount)
      });
    },
    hit(member, raw, verb) {
      const pending = foe.combat?.__pendingSkillKey;
      if (pending && st?.tactical && typeof foe.gridX === "number") {
        foe.combat.__pendingSkillKey = null;
        this.applySkill(pending, { member, raw, verb });
        return;
      }
      if (!member) return;
      const res = dealFoeDamageToMember(st, foe, member, raw, verb, rng, player);
      const hitRecord = {
        foeUid: foe.uid,
        targetPartyUid: member.uid,
        damage: res.evaded ? 0 : Math.max(0, Math.floor(res.dmg || 0)),
        missed: !!res.evaded
      };
      if (Array.isArray(enemyHits)) enemyHits.push(hitRecord);
      if (recorder) recorder.recordHit(hitRecord);
      if (res.evaded) {
        appendLog(`${foe.name} attacks ${member.name} — ${member.name} evades!`);
        if (recorder) recorder.flushStep();
        return;
      }
      if (res.shieldLog) appendLog(res.shieldLog);
      appendLog(`${foe.name} ${verb} ${member.name} for ${res.dmg} damage.`);
      if (res.riposteLog) appendLog(res.riposteLog);
      if (res.secondBreathLog) appendLog(res.secondBreathLog);
      if (res.heldColossusLog) appendLog(res.heldColossusLog);
      if (recorder) recorder.flushStep();
    },
    hitAdjacent(centerMember, raw, verb, adjacentCount = 1, perTargetMult = 1) {
      const pending = foe.combat?.__pendingSkillKey;
      if (pending && st?.tactical && typeof foe.gridX === "number") {
        foe.combat.__pendingSkillKey = null;
        this.applySkill(pending, { member: centerMember, raw, verb });
        return;
      }
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
      if (recorder) recorder.flushStep();
    },
    foeHpFrac() {
      return foe.maxHp > 0 ? foe.hp / foe.maxHp : 1;
    },
    healSelf(pct) {
      const amt = Math.max(1, Math.floor(foe.maxHp * pct));
      const before = foe.hp;
      foe.hp = Math.min(foe.maxHp, foe.hp + amt);
      const restored = foe.hp - before;
      if (restored > 0) {
        appendLog(`${foe.name} recovers ${restored} HP.`);
        if (recorder) recorder.recordHeal({ foeUid: foe.uid, amount: restored });
      }
      if (recorder) recorder.flushStep();
    },
    healFoe(targetFoe, amount) {
      if (!targetFoe || targetFoe.hp <= 0) return 0;
      const before = targetFoe.hp;
      const amt = Math.max(1, Math.floor(amount));
      targetFoe.hp = Math.min(targetFoe.maxHp, targetFoe.hp + amt);
      const restored = targetFoe.hp - before;
      if (restored > 0 && recorder) {
        recorder.recordHeal({ foeUid: targetFoe.uid, amount: restored });
      }
      return restored;
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
export function runSingleEnemyTurn(foe, st, rng, appendLog, player, enemyHits, recorder = null) {
  if (!foe.combat) initFoeCombatRuntime(foe);
  if (isFoeStunned(foe)) {
    appendLog(`${foe.name} is stunned and cannot act.`);
    if (recorder) recorder.flushStep();
    tickEnemyCooldowns(foe);
    return;
  }
  foe.combat.actCount = (foe.combat.actCount || 0) + 1;
  if (foe.combat) foe.combat.__pendingSkillKey = null;

  const def = getEnemyDefByName(foe.name);
  const scriptId = def?.combatScript?.trim?.() || foe.combat.script || "";
  const ctx = createEnemyTurnContext(st, foe, rng, appendLog, player, enemyHits, recorder);

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

/** Ember Forgeling Meltdown when slain. @returns {string|null} */
export function tryEmberForgelingMeltdown(st, deadFoe, rng, appendLog, player) {
  if (!deadFoe || deadFoe.name !== "Ember Forgeling") return null;
  const living = (st.party || []).filter((m) => m && m.hp > 0);
  if (!living.length) return null;
  const pick = living[Math.floor(rng.next() * living.length)];
  const intv = deadFoe.int || 46;
  const hit = Math.max(1, Math.floor(intv * 0.3));
  const res = dealFoeDamageToMember(st, deadFoe, pick, hit, "Meltdown bursts on", rng, player);
  if (!res.evaded && res.dmg > 0) {
    appendLog(`${deadFoe.name} Meltdown bursts on ${pick.name} for ${res.dmg} damage.`);
    if (rng.chance(0.25)) {
      applyPlayerBurn(st, Math.max(1, Math.floor(hit * 0.08)), 1);
      appendLog(`${pick.name} is scorched by unstable slag.`);
    }
    return null;
  }
  if (res.evaded) appendLog(`${deadFoe.name} Meltdown bursts — ${pick.name} evades!`);
  return null;
}

/** Pale Rime Wisp Fade Cold when slain. @returns {string|null} */
export function tryPaleRimeWispFadeCold(st, deadFoe, rng, appendLog, player) {
  if (!deadFoe || deadFoe.name !== "Pale Rime Wisp") return null;
  const living = (st.party || []).filter((m) => m && m.hp > 0);
  if (!living.length) return null;
  const pick = living[Math.floor(rng.next() * living.length)];
  const intv = deadFoe.int || 58;
  const hit = Math.max(1, Math.floor(intv * 0.25));
  const res = dealFoeDamageToMember(st, deadFoe, pick, hit, "Fade Cold chills", rng, player);
  if (!res.evaded && res.dmg > 0) {
    appendLog(`${deadFoe.name} collapses into cold mist on ${pick.name} for ${res.dmg} damage.`);
    if (rng.chance(0.25)) {
      ensureCombatStatus(st);
      st.status.playerMagicDamageDownPct = Math.max(st.status.playerMagicDamageDownPct || 0, 5);
      st.status.playerMagicDamageDownTurns = Math.max(st.status.playerMagicDamageDownTurns || 0, 1);
      appendLog(`${pick.name}'s spell force falters in the cold.`);
    }
    return null;
  }
  if (res.evaded) appendLog(`${deadFoe.name} Fade Cold dissipates — ${pick.name} evades!`);
  return null;
}
