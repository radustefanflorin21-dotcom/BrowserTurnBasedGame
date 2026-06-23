/**
 * Unified skill combat (classless pool). Depends on globals from game.js and SKILL_CATALOG from skills_catalog.js.
 * Loaded after game.js; exposes window.unifiedSkillCombatAction.
 */
(function () {
  const BASIC = { "Basic Physical Attack": 1, "Basic Magical Attack": 1 };

  function catalogDef(name) {
    return typeof SKILL_CATALOG !== "undefined" && SKILL_CATALOG && SKILL_CATALOG[name] ? SKILL_CATALOG[name] : null;
  }

  function combatActor() {
    const st = typeof combatState !== "undefined" ? combatState : null;
    if (st && st.__combatActor) return st.__combatActor;
    return typeof player !== "undefined" ? player : null;
  }

  function combatActorMember() {
    const st = typeof combatState !== "undefined" ? combatState : null;
    if (st && st.__combatActorMember) return st.__combatActorMember;
    return st && Array.isArray(st.party) ? st.party.find((m) => m && m.kind === "hero") : null;
  }

  function combatActorGear(actor) {
    const act = actor || combatActor();
    const eq = act && act.equipment ? act.equipment : typeof emptyEquipment === "function" ? emptyEquipment() : {};
    return typeof sumEquippedBonusStatsFromEquipment === "function" ? sumEquippedBonusStatsFromEquipment(eq) : {};
  }

  function combatActorStr(actor) {
    return typeof totalStrFromActor === "function" ? totalStrFromActor(actor || combatActor()) : 0;
  }

  function combatActorDex(actor) {
    return typeof totalDexFromActor === "function" ? totalDexFromActor(actor || combatActor()) : 0;
  }

  function combatActorInt(actor) {
    return typeof totalIntFromActor === "function" ? totalIntFromActor(actor || combatActor()) : 0;
  }

  function allyStrikeVfx(st, foe, hitRes, dmgKind) {
    if (typeof window.playCombatStrikeEffect !== "function" || !st || !foe) return;
    const member =
      st.__combatActorMember ||
      (Array.isArray(st.party) ? st.party.find((m) => m && m.kind === "hero") : null);
    if (!member) return;
    window.playCombatStrikeEffect({
      attackerSide: "ally",
      attackerUid: member.uid,
      targetSide: "foe",
      targetUid: foe.uid,
      dmgKind: dmgKind === "magic" ? "magic" : "physical",
      damage: hitRes && typeof hitRes.damage === "number" ? hitRes.damage : 0,
      crit: !!(hitRes && hitRes.crit),
      missed: !!(hitRes && hitRes.missed)
    });
  }

  function getActingStamina(st) {
    const m = combatActorMember();
    if (m && m.kind === "companion") return typeof m.stamina === "number" ? m.stamina : 0;
    return typeof st.stamina === "number" ? st.stamina : 0;
  }

  function spendActingStamina(st, cost) {
    const m = combatActorMember();
    if (m && m.kind === "companion") {
      m.stamina = Math.max(0, (typeof m.stamina === "number" ? m.stamina : 0) - cost);
      return;
    }
    st.stamina = Math.max(0, (typeof st.stamina === "number" ? st.stamina : 0) - cost);
  }

  function skillLevelForCombat(name) {
    if (BASIC[name]) return 1;
    const lv = typeof getActorSkillLevel === "function" ? getActorSkillLevel(combatActor(), name) : 0;
    return Math.max(1, Math.min(5, lv || 1));
  }

  function levelRow(def, name) {
    const lv = skillLevelForCombat(name);
    return def.levels[lv - 1] || def.levels[0];
  }

  function actorAccuracyPct() {
    const actor = combatActor();
    const dex = combatActorDex(actor);
    const intv = combatActorInt(actor);
    const gear = combatActorGear(actor);
    const acc = attribBonusPer10(dex) + attribBonusPer10(intv) + (gear.accuracy || 0);
    const st = typeof combatState !== "undefined" ? combatState : null;
    const member = combatActorMember();
    const pen =
      typeof getPlayerOutgoingAccuracyPenaltyPct === "function"
        ? getPlayerOutgoingAccuracyPenaltyPct(st, member)
        : 0;
    return Math.max(0, acc - pen);
  }

  function actorCritStatPct() {
    const actor = combatActor();
    const dex = combatActorDex(actor);
    const gear = combatActorGear(actor);
    return (typeof formulaDexCritChancePct === "function" ? formulaDexCritChancePct(dex) : 0) + (gear.crit || 0);
  }

  function foeStatusResistPct(foe) {
    const d = typeof getEnemyDefCombatFields === "function" ? getEnemyDefCombatFields(foe) : {};
    if (typeof d.statusResistPct === "number" && Number.isFinite(d.statusResistPct)) return Math.max(0, d.statusResistPct);
    return 0;
  }

  function hitChanceFromSkill(baseHit, extraHit, foe) {
    const sys = typeof getStatSystem === "function" ? getStatSystem() : {};
    const minH = typeof sys.minHitChancePct === "number" ? sys.minHitChancePct : 15;
    const maxH = typeof sys.maxHitChancePct === "number" ? sys.maxHitChancePct : 100;
    const acc = actorAccuracyPct();
    const ev =
      typeof getFoeEvasionPct === "function" && foe
        ? getFoeEvasionPct(foe) + (foe.combat && typeof foe.combat.evasionDownPct === "number" ? foe.combat.evasionDownPct : 0)
        : 0;
    const bh = typeof baseHit === "number" ? baseHit : 90;
    const ex = typeof extraHit === "number" ? extraHit : 0;
    /** Accuracy % is bonus on top of skill base hit; stack additively (see character sheet Accuracy %). */
    const total = bh + ex + acc - ev;
    return Math.min(maxH, Math.max(minH, total));
  }

  function debuffLandPct(baseChance, foe) {
    const acc = actorAccuracyPct();
    const sr = foeStatusResistPct(foe);
    return Math.min(100, Math.max(0, baseChance + acc - sr));
  }

  function buffLandPct(baseChance) {
    const acc = actorAccuracyPct();
    return Math.min(100, Math.max(0, baseChance + acc));
  }

  function critChanceFromSkill(baseCrit, foe) {
    const sr = foeStatusResistPct(foe);
    const p = (typeof baseCrit === "number" ? baseCrit : 3) + actorCritStatPct() - sr;
    return Math.min(0.95, Math.max(0, p / 100));
  }

  function ensureFoeCombat(foe) {
    if (!foe.combat) {
      if (typeof initFoeCombatRuntime === "function") initFoeCombatRuntime(foe);
      else foe.combat = {};
    }
  }

  function rollDebuff(st, foe, deb) {
    if (!deb || typeof deb.chance !== "number") return;
    const p = debuffLandPct(deb.chance, foe) / 100;
    if (Math.random() >= p) return;
    ensureFoeCombat(foe);
    const t = Math.max(1, Math.floor(deb.turns || 1));
    const set = (key, val, turns) => {
      foe.combat[key] = Math.max(foe.combat[key] || 0, turns);
      if (val != null) foe.combat[key + "Val"] = Math.max(foe.combat[key + "Val"] || 0, val);
    };
    switch (deb.type) {
      case "physDmgDown":
        set("physDmgDownTurns", deb.value, t);
        foe.combat.physDmgDownPct = Math.max(foe.combat.physDmgDownPct || 0, deb.value || 0);
        break;
      case "magDmgDown":
        set("magDmgDownTurns", deb.value, t);
        foe.combat.magDmgDownPct = Math.max(foe.combat.magDmgDownPct || 0, deb.value || 0);
        break;
      case "bothDmgDown":
        set("bothDmgDownTurns", deb.value, t);
        foe.combat.bothDmgDownPct = Math.max(foe.combat.bothDmgDownPct || 0, deb.value || 0);
        break;
      case "physResDown":
        set("physResDownTurns", deb.value, t);
        foe.combat.physResDownPct = Math.max(foe.combat.physResDownPct || 0, deb.value || 0);
        break;
      case "magResDown":
        set("magResDownTurns", deb.value, t);
        foe.combat.magResDownPct = Math.max(foe.combat.magResDownPct || 0, deb.value || 0);
        break;
      case "bothResDown":
        set("bothResDownTurns", deb.value, t);
        foe.combat.bothResDownPct = Math.max(foe.combat.bothResDownPct || 0, deb.value || 0);
        break;
      case "evaDown":
        set("evaDownTurns", deb.value, t);
        foe.combat.evasionDownPct = Math.max(foe.combat.evasionDownPct || 0, deb.value || 0);
        break;
      case "blind":
        set("blindTurns", deb.accDown, t);
        foe.combat.blindAccDownPct = Math.max(foe.combat.blindAccDownPct || 0, deb.accDown || 0);
        if (typeof tryProcBannerlessMagResOnAccuracyDebuff === "function" && typeof player !== "undefined") {
          tryProcBannerlessMagResOnAccuracyDebuff(st, player.equipment, foe);
        }
        if (typeof tryProcStillnessMagDmgOnAccuracyDebuff === "function" && typeof player !== "undefined") {
          tryProcStillnessMagDmgOnAccuracyDebuff(st, player.equipment, foe);
        }
        break;
      case "cripple":
        foe.combat.staggerSkillTaxTurns = Math.max(foe.combat.staggerSkillTaxTurns || 0, t);
        break;
      case "stun":
        foe.combat.staggerLockedTurns = Math.max(foe.combat.staggerLockedTurns || 0, t);
        break;
      case "bleed":
      case "burn":
      case "poisonDot": {
        const dotKey = deb.type === "burn" ? "burn" : deb.type === "poisonDot" ? "poison" : "bleed";
        const turnsKey = dotKey === "burn" ? "burnTurns" : dotKey === "poison" ? "poisonTurns" : "bleedTurns";
        const dmgKey = dotKey === "burn" ? "burnDamage" : dotKey === "poison" ? "poisonDamage" : "bleedDamage";
        foe.combat[turnsKey] = Math.max(foe.combat[turnsKey] || 0, t);
        const ref =
          typeof combatState !== "undefined" && combatState && typeof combatState.__lastSkillDamage === "number"
            ? combatState.__lastSkillDamage
            : Math.max(1, combatActorStr(combatActor()));
        const tick = Math.max(1, Math.floor((ref * (deb.dotPct || 10)) / 100));
        foe.combat[dmgKey] = Math.max(foe.combat[dmgKey] || 0, tick);
        if (dotKey === "poison" && typeof tryProcHeartbloomMagResOnPoison === "function" && typeof player !== "undefined") {
          tryProcHeartbloomMagResOnPoison(st, player.equipment, foe);
        }
        break;
      }
      case "allyPressure":
        foe.combat.allyPressureTurns = Math.max(foe.combat.allyPressureTurns || 0, t);
        foe.combat.allyPressurePct = Math.max(foe.combat.allyPressurePct || 0, deb.value || 0);
        break;
      case "playerTaunt": {
        foe.combat.tauntedByVanguardTurns = Math.max(foe.combat.tauntedByVanguardTurns || 0, t);
        foe.combat.tauntedByVanguardDamageDownPct = Math.max(
          foe.combat.tauntedByVanguardDamageDownPct || 0,
          deb.enemyDmgDownPct || 0
        );
        const taunter = combatActor();
        if (taunter && typeof taunter.uid === "number") {
          foe.combat.tauntedByVanguardTargetUid = taunter.uid;
        }
        break;
      }
      case "statusResDown":
        foe.combat.statusResDownTurns = Math.max(foe.combat.statusResDownTurns || 0, t);
        foe.combat.statusResDownPct = Math.max(foe.combat.statusResDownPct || 0, deb.value || 0);
        break;
      default:
        break;
    }
    if (typeof appendFightLog === "function") appendFightLog(`${deb.type} applied to ${foe.name}.`);
  }

  function computeStatDamage(row, dmgKind, foe, skillName) {
    const actor = combatActor();
    const str = combatActorStr(actor);
    const intv = combatActorInt(actor);
    const gear = combatActorGear(actor);
    let base = 0;
    if (typeof row.strPct === "number") base += str * row.strPct;
    if (typeof row.intPct === "number") base += intv * row.intPct;
    if (dmgKind === "physical") {
      const b = typeof formulaStrPhysicalDamageBonusPct === "function" ? formulaStrPhysicalDamageBonusPct(str) : 0;
      base *= 1 + (b + (gear.physDamage || 0)) / 100;
    } else if (dmgKind === "magic") {
      const b = typeof formulaIntSkillPowerBonusPct === "function" ? formulaIntSkillPowerBonusPct(intv) : 0;
      base *= 1 + (b + (gear.skillPower || 0)) / 100;
    }
    let mul = 1;
    if (foe && foe.combat && dmgKind === "physical" && typeof row.vsPhysResDownBonusPct === "number") {
      if ((foe.combat.physResDownTurns || 0) > 0 || (foe.combat.physResDownPct || 0) > 0) mul *= 1 + row.vsPhysResDownBonusPct / 100;
    }
    if (foe && foe.maxHp > 0 && typeof row.strPctLow === "number" && typeof row.strPct === "number" && row.strPct > 0) {
      const frac = foe.hp / foe.maxHp;
      const thr = skillName === "Execute" ? 0.3 : 0.35;
      if (frac < thr) mul *= row.strPctLow / row.strPct;
    }
    if (foe && foe.combat && dmgKind === "magic" && typeof row.vsBurnBonusPct === "number") {
      if ((foe.combat.burnTurns || 0) > 0) mul *= 1 + row.vsBurnBonusPct / 100;
    }
    let out = Math.max(1, Math.floor(base * mul));
    const stCombat = typeof combatState !== "undefined" ? combatState : null;
    if (stCombat && stCombat.status && typeof getPlayerOutgoingDamageMultFromStatus === "function") {
      out = Math.max(1, Math.floor(out * getPlayerOutgoingDamageMultFromStatus(stCombat.status, dmgKind)));
    }
    return out;
  }

  function resolveOneHit(st, foe, rawBase, dmgKind, baseHit, baseCrit, extraHit, ignorePhysRes, skillNameForMult) {
    const sys = typeof getStatSystem === "function" ? getStatSystem() : {};
    const hitPct = hitChanceFromSkill(baseHit, extraHit, foe);
    if (Math.random() * 100 >= hitPct) return { damage: 0, missed: true, crit: false };
    let d1 = Math.max(1, rawBase);
    const actor = combatActor();
    const str = combatActorStr(actor);
    const intv = combatActorInt(actor);
    const gear = combatActorGear(actor);
    if (dmgKind === "physical") {
      d1 *= 1 + (typeof formulaStrPhysicalDamageBonusPct === "function" ? formulaStrPhysicalDamageBonusPct(str) : 0) / 100 + (gear.physDamage || 0) / 100;
    } else {
      d1 *= 1 + (typeof formulaIntSkillPowerBonusPct === "function" ? formulaIntSkillPowerBonusPct(intv) : 0) / 100 + (gear.skillPower || 0) / 100;
    }
    const crit = Math.random() < critChanceFromSkill(baseCrit, foe);
    const baseCritMul = typeof sys.baseCritMultiplierPct === "number" ? sys.baseCritMultiplierPct : 150;
    let d2 = d1;
    if (crit) {
      const dex = combatActorDex(actor);
      const cm =
        baseCritMul +
        (typeof formulaDexCritDamageBonusPct === "function" ? formulaDexCritDamageBonusPct(dex) : 0) +
        (gear.critDamage || 0);
      d2 = d1 * (cm / 100);
    }
    let d3 = d2;
    if (dmgKind === "physical") {
      const pen = typeof formulaStrArmorPenetrationPct === "function" ? formulaStrArmorPenetrationPct(str) : 0;
      let resF = typeof getFoePhysicalResistPct === "function" ? getFoePhysicalResistPct(foe) : 0;
      resF = Math.max(0, resF - pen - (ignorePhysRes || 0));
      if (foe.combat && (foe.combat.physResDownTurns || 0) > 0) resF = Math.max(0, resF - (foe.combat.physResDownPct || 0));
      d3 = d2 * (1 - resF / 100);
    } else {
      let mr = typeof getFoeMagicResistPct === "function" ? getFoeMagicResistPct(foe) : 0;
      if (foe.combat && (foe.combat.magResDownTurns || 0) > 0) mr = Math.max(0, mr - (foe.combat.magResDownPct || 0));
      d3 = d2 * (1 - mr / 100);
    }
    const foeFlat = typeof getFoeFlatDamageReduction === "function" ? getFoeFlatDamageReduction(foe) : 0;
    let flatSub = foeFlat;
    if (dmgKind === "magic") flatSub = Math.max(0, Math.floor(foeFlat / 2));
    let fin = Math.max(1, Math.floor(d3 - flatSub));
    if (typeof getActorClassOutgoingMult === "function") {
      fin = Math.max(
        1,
        Math.floor(
          fin * getActorClassOutgoingMult(st, skillNameForMult || null, foe, combatActor(), combatActorMember())
        )
      );
    } else if (typeof getPlayerClassOutgoingMult === "function") {
      fin = Math.max(1, Math.floor(fin * getPlayerClassOutgoingMult(st, skillNameForMult || null, foe)));
    }
    if (foe.combat && (foe.combat.allyPressureTurns || 0) > 0 && typeof foe.combat.allyPressurePct === "number" && foe.combat.allyPressurePct > 0) {
      fin = Math.max(1, Math.floor(fin * (1 + foe.combat.allyPressurePct / 100)));
    }
    return { damage: fin, missed: false, crit };
  }

  function collectAoeFoes(st, centerUid, adj) {
    const living = st.foes.filter((f) => f.hp > 0);
    const idx = living.findIndex((f) => f.uid === centerUid);
    if (idx < 0) return [];
    if (adj >= 99) return living.slice();
    const out = [living[idx]];
    let left = adj;
    for (let j = 1; j <= left && idx - j >= 0; j++) out.push(living[idx - j]);
    let right = adj;
    for (let j = 1; j <= right && idx + j < living.length; j++) out.push(living[idx + j]);
    return out;
  }

  function applyUnifiedSkillHitToFoe(st, foe, hitRes, label, dmgKind, row, opts) {
    const o = opts && typeof opts === "object" ? opts : {};
    if (hitRes.missed) {
      if (typeof appendFightLog === "function") appendFightLog(`${label} misses ${foe.name}.`);
      allyStrikeVfx(st, foe, hitRes, dmgKind);
      return false;
    }
    st.__lastSkillDamage = hitRes.damage;
    foe.hp = Math.max(0, foe.hp - hitRes.damage);
    allyStrikeVfx(st, foe, hitRes, dmgKind);
    const critTxt = hitRes.crit ? " (crit!)" : "";
    if (typeof appendFightLog === "function") {
      appendFightLog(`${label} hits ${foe.name} for ${hitRes.damage}${critTxt}.`);
    }
    if (row && row.debuff) rollDebuff(st, foe, row.debuff);
    if (row && row.debuff2) rollDebuff(st, foe, row.debuff2);
    if (row && row.debuff3) rollDebuff(st, foe, row.debuff3);
    if (o.reflect !== false && typeof applyReflectDamageToPartyHero === "function") {
      applyReflectDamageToPartyHero(st, hitRes.damage, foe);
    }
    return true;
  }

  function spendAndCooldown(st, skillName, def, cost) {
    spendActingStamina(st, cost);
    const cdt = typeof def.cooldown === "number" ? def.cooldown : 0;
    if (cdt > 0 && typeof setClassSkillCooldown === "function") setClassSkillCooldown(st, skillName, cdt);
  }

  function resolveAllySkillTarget(st) {
    if (!st || !Array.isArray(st.party)) return null;
    const uid =
      typeof st.selectedAllyUid === "number" && Number.isFinite(st.selectedAllyUid)
        ? st.selectedAllyUid
        : st.activePartyUid;
    const m = st.party.find((x) => x && x.uid === uid && x.hp > 0);
    return m || st.party.find((x) => x && x.hp > 0) || null;
  }

  function healPartyMember(st, uid, amt) {
    const m = st.party.find((x) => x && x.uid === uid);
    if (!m || m.hp <= 0) return;
    const healed = Math.max(1, Math.floor(amt));
    m.hp = Math.min(m.maxHp, m.hp + healed);
    if (m.kind === "hero") {
      st.playerHp = m.hp;
      if (typeof syncHeroHpFromPlayerMirror === "function") syncHeroHpFromPlayerMirror(st);
    }
    if (typeof appendFightLog === "function") appendFightLog(`${m.name} heals for ${healed}.`);
    if (typeof playCombatCardStatusEffect === "function") {
      playCombatCardStatusEffect({ targetSide: "ally", targetUid: m.uid, effectType: "heal", damage: healed, heal: true });
    }
  }

  window.unifiedSkillCombatAction = function unifiedSkillCombatAction(st, kind, skillName) {
    if (kind !== "skill" || !skillName) return false;
    const def = catalogDef(skillName);
    if (!def || def.passiveOnly) return false;
    const row = levelRow(def, skillName);
    const dmgKind = def.damageKind === "magic" ? "magic" : "physical";
    const baseHit = def.baseHit;
    const baseCrit = def.baseCrit || 0;

    const baseStamina = typeof def.stamina === "number" ? def.stamina : 2;
    let cost =
      typeof resolveSkillStaminaCost === "function" ? resolveSkillStaminaCost(baseStamina, skillName) : baseStamina;
    if (st.status && st.status.playerStaminaCostUpTurns > 0) {
      const up = st.status.playerStaminaCostUpPct || 0;
      cost = Math.ceil(cost * (1 + up / 100));
    }
    if (st.status && (st.status.playerCrippleTurns || 0) > 0) cost += 1;
    cost = Math.max(1, cost);

    if (typeof getClassSkillCooldownRemaining === "function" && getClassSkillCooldownRemaining(st, skillName) > 0) {
      const cd = getClassSkillCooldownRemaining(st, skillName);
      if (typeof appendFightLog === "function") appendFightLog(`${skillName} is on cooldown (${cd}).`);
      return true;
    }
    if (getActingStamina(st) < cost) {
      if (typeof appendFightLog === "function") appendFightLog(`Not enough stamina (need ${cost}).`);
      return true;
    }

    const pattern = def.pattern;
    const label = skillName;

    function afterCommit() {
      if (!st.foes.some((f) => f.hp > 0)) {
        if (st.serverAuthoritative) return;
        if (typeof finishCombatVictory === "function") finishCombatVictory();
        return;
      }
      const uiDelay =
        typeof window.COMBAT_HIT_UI_DELAY_MS === "number" ? window.COMBAT_HIT_UI_DELAY_MS : 1150;
      if (typeof queueCombatVisualRefresh === "function") queueCombatVisualRefresh(uiDelay);
      else if (typeof renderTurnBattle === "function") renderTurnBattle();
      setTimeout(() => {
        if (typeof startPlayerTurnTimer === "function") startPlayerTurnTimer();
      }, uiDelay);
    }

    /** Self buffs (Brace, etc.) */
    if (
      pattern === "brace" ||
      pattern === "flow_step" ||
      pattern === "smoke_step" ||
      pattern === "overload" ||
      pattern === "spell_preparation" ||
      pattern === "blood_price"
    ) {
      const bp = buffLandPct(100);
      if (Math.random() * 100 >= bp) {
        if (typeof appendFightLog === "function") appendFightLog(`${skillName} fails to take hold.`);
        return true;
      }
      spendAndCooldown(st, skillName, def, cost);
      const cs = typeof ensurePlayerClassCombatState === "function" ? ensurePlayerClassCombatState(st) : st.classState || {};
      if (pattern === "brace" && row.self) {
        cs.braceTurns = Math.max(cs.braceTurns || 0, row.self.turns);
        cs.braceReductionPct = Math.max(cs.braceReductionPct || 0, row.self.dr);
        cs.braceStatusResistBonusPct = Math.max(cs.braceStatusResistBonusPct || 0, row.self.sr || 0);
        appendFightLog(`Brace: −${row.self.dr}% damage, +${row.self.sr || 0}% status resist (${row.self.turns}t).`);
      }
      if (pattern === "flow_step" && row.self) {
        cs.flowStepEva = Math.max(cs.flowStepEva || 0, row.self.eva);
        cs.flowStepAcc = Math.max(cs.flowStepAcc || 0, row.self.acc || 0);
        cs.flowStepTurns = Math.max(cs.flowStepTurns || 0, row.self.turns);
        appendFightLog(`Flow Step: +${row.self.eva}% evasion (${row.self.turns}t).`);
      }
      if (pattern === "smoke_step" && row.self) {
        cs.smokeEva = Math.max(cs.smokeEva || 0, row.self.eva);
        cs.smokeTurns = Math.max(cs.smokeTurns || 0, row.self.turns);
        appendFightLog(`Smoke Step: +${row.self.eva}% evasion (${row.self.turns}t).`);
      }
      if (pattern === "overload" && row.self) {
        cs.overloadMagPct = Math.max(cs.overloadMagPct || 0, row.self.magDmg);
        cs.overloadAcc = Math.max(cs.overloadAcc || 0, row.self.acc || 0);
        cs.overloadTurns = Math.max(cs.overloadTurns || 0, row.self.turns);
        if (st.status) {
          st.status.playerStaminaCostUpPct = Math.max(st.status.playerStaminaCostUpPct || 0, 100);
          st.status.playerStaminaCostUpTurns = Math.max(st.status.playerStaminaCostUpTurns || 0, row.self.turns);
        }
        appendFightLog(`Overload: +${row.self.magDmg}% magic damage; your skills cost +1 stamina (${row.self.turns}t).`);
      }
      if (pattern === "spell_preparation" && row.self) {
        cs.spellPrepCharges = Math.max(cs.spellPrepCharges || 0, row.self.nextMagical);
        cs.spellPrepMagPct = Math.max(cs.spellPrepMagPct || 0, row.self.magDmg || 0);
        cs.spellPrepMaxTurns = Math.max(cs.spellPrepMaxTurns || 0, row.self.maxTurns);
        appendFightLog(`Spell Preparation: next ${row.self.nextMagical} magical skill(s) cost −1 (min 2); up to ${row.self.maxTurns} turns.`);
      }
      if (pattern === "blood_price" && row.self) {
        const hero = st.party.find((m) => m.kind === "hero");
        if (hero) {
          const loss = Math.max(1, Math.floor((hero.hp * row.self.hpCostPct) / 100));
          hero.hp = Math.max(1, hero.hp - loss);
          st.playerHp = hero.hp;
        }
        cs.bloodPricePhysPct = Math.max(cs.bloodPricePhysPct || 0, row.self.physDmg);
        cs.bloodPriceTurns = Math.max(cs.bloodPriceTurns || 0, row.self.turns);
        appendFightLog(`Blood Price: pay HP for +${row.self.physDmg}% phys damage (${row.self.turns}t).`);
      }
      if (typeof syncHeroHpFromPlayerMirror === "function") syncHeroHpFromPlayerMirror(st);
      afterCommit();
      return true;
    }

    if (pattern === "heal_ally" || pattern === "ward_shield" || pattern === "encourage" || pattern === "regrowth" || pattern === "cleanse") {
      const bp = buffLandPct(100);
      if (Math.random() * 100 >= bp) {
        appendFightLog(`${skillName} fails to apply.`);
        return true;
      }
      spendAndCooldown(st, skillName, def, cost);
      const target = resolveAllySkillTarget(st);
      if (!target) {
        if (typeof appendFightLog === "function") appendFightLog("Select a living ally.");
        return true;
      }
      const vit = typeof totalVitFromActor === "function" ? totalVitFromActor(combatActor()) : 50;
      if (pattern === "heal_ally" && row.vitHealPct) {
        const base = vit * row.vitHealPct;
        const bonus = typeof getPlayerCombatHealingReceivedMultiplier === "function" ? getPlayerCombatHealingReceivedMultiplier(st) : 1;
        healPartyMember(st, target.uid, base * bonus);
      }
      if (pattern === "ward_shield" && row.shieldVitPct) {
        const cs = ensurePlayerClassCombatState(st);
        const shield = Math.floor(vit * row.shieldVitPct);
        cs.divineAegisShield = Math.max(cs.divineAegisShield || 0, shield);
        appendFightLog(`Protective Ward: ${shield} absorb (${row.dur || 2}t).`);
      }
      if (pattern === "encourage" && row.ally) {
        appendFightLog(`Encourage: +${row.ally.acc}% accuracy to ally (${row.ally.turns}t).`);
      }
      if (pattern === "regrowth" && row.regenVitPct) {
        appendFightLog(`Regrowth HoT (${row.regenVitPct * 100}% VIT/t) — simplified tick next turns.`);
      }
      if (pattern === "cleanse") {
        if (typeof ensureCombatStatus === "function") ensureCombatStatus(st);
        const n = row.cleanse || 1;
        if (st.status) {
          if (n >= 1) {
            st.status.playerPoison = null;
            st.status.playerBurn = null;
          }
        }
        if (row.vitHealPct) healPartyMember(st, target.uid, vit * row.vitHealPct);
        appendFightLog(`Cleanse removes debuffs.`);
      }
      afterCommit();
      return true;
    }

    if (pattern === "heal_all" || pattern === "sanctuary_party" || pattern === "rev_pulse") {
      const bp = buffLandPct(100);
      if (Math.random() * 100 >= bp) {
        appendFightLog(`${skillName} fails.`);
        return true;
      }
      spendAndCooldown(st, skillName, def, cost);
      const vit = typeof totalVitFromActor === "function" ? totalVitFromActor(combatActor()) : 50;
      if (pattern === "heal_all" && row.vitHealPct) {
        const amt = vit * row.vitHealPct * (typeof getPlayerCombatHealingReceivedMultiplier === "function" ? getPlayerCombatHealingReceivedMultiplier(st) : 1);
        st.party.forEach((m) => {
          if (m && m.hp > 0) healPartyMember(st, m.uid, amt / Math.max(1, st.party.filter((x) => x && x.hp > 0).length));
        });
      } else {
        appendFightLog(`${label} supports the party.`);
      }
      afterCommit();
      return true;
    }

    if (pattern === "guard_ally") {
      const bp = buffLandPct(100);
      if (Math.random() * 100 >= bp) {
        appendFightLog(`${skillName} fails.`);
        return true;
      }
      spendAndCooldown(st, skillName, def, cost);
      const cs = ensurePlayerClassCombatState(st);
      if (row.ally) {
        cs.guardAllyRedirectPct = Math.max(cs.guardAllyRedirectPct || 0, row.ally.redirect);
        cs.guardAllyTurns = Math.max(cs.guardAllyTurns || 0, row.ally.turns);
        appendFightLog(`Guard Ally: redirect ${row.ally.redirect}% (${row.ally.turns}t).`);
      }
      afterCommit();
      return true;
    }

    if (pattern === "all_foes_debuff" || pattern === "taunt_all") {
      const living = st.foes.filter((f) => f.hp > 0);
      if (!living.length) {
        appendFightLog("No targets.");
        return true;
      }
      const bpAll = buffLandPct(100);
      if (Math.random() * 100 >= bpAll) {
        appendFightLog(`${skillName} fails.`);
        return true;
      }
      spendAndCooldown(st, skillName, def, cost);
      living.forEach((foe) => {
        if (pattern === "all_foes_debuff" && row.debuff) rollDebuff(st, foe, row.debuff);
        if (pattern === "taunt_all" && row.debuff) rollDebuff(st, foe, row.debuff);
      });
      appendFightLog(`${label} hits all enemies.`);
      afterCommit();
      return true;
    }

    if (
      pattern === "basic" ||
      pattern === "strike" ||
      pattern === "strike_debuff" ||
      pattern === "spark" ||
      pattern === "toxin_dart" ||
      pattern === "steady_shot" ||
      pattern === "piercing_shot" ||
      pattern === "deep_lunge" ||
      pattern === "final_measure" ||
      pattern === "execute_skill" ||
      pattern === "vanishing_shot"
    ) {
      if (typeof ensureCombatTarget === "function") ensureCombatTarget();
      const uid = st.selectedUid;
      const foe = st.foes.find((f) => f.uid === uid && f.hp > 0);
      if (!foe) {
        if (typeof appendFightLog === "function") appendFightLog("Select a living enemy.");
        return true;
      }
      const raw = computeStatDamage(row, dmgKind, foe, skillName);
      const extraHit = row.hitBonus || 0;
      const ign = row.ignorePhysResPct || 0;
      const hitRes = resolveOneHit(st, foe, raw, dmgKind, baseHit, baseCrit, extraHit, ign, skillName);
      if (hitRes.missed) {
        appendFightLog(`${label} misses ${foe.name}.`);
        allyStrikeVfx(st, foe, hitRes, dmgKind);
        spendAndCooldown(st, skillName, def, cost);
        afterCommit();
        return true;
      }
      st.__lastSkillDamage = hitRes.damage;
      foe.hp = Math.max(0, foe.hp - hitRes.damage);
      allyStrikeVfx(st, foe, hitRes, dmgKind);
      appendFightLog(`${label} hits ${foe.name} for ${hitRes.damage}${hitRes.crit ? " (crit!)" : ""}.`);
      if (row.debuff) rollDebuff(st, foe, row.debuff);
      if (typeof applyReflectDamageToPartyHero === "function") applyReflectDamageToPartyHero(st, hitRes.damage, foe);
      spendAndCooldown(st, skillName, def, cost);
      afterCommit();
      return true;
    }

    if (pattern === "twin_jab") {
      const uid = st.selectedUid;
      const foe = st.foes.find((f) => f.uid === uid && f.hp > 0);
      if (!foe) return true;
      let total = 0;
      for (let h = 0; h < 2; h++) {
        const raw = computeStatDamage(row, dmgKind, foe, skillName);
        const hitRes = resolveOneHit(st, foe, raw, dmgKind, baseHit, baseCrit, 0, 0, skillName);
        if (hitRes.missed) {
          if (typeof appendFightLog === "function") appendFightLog(`${label} misses ${foe.name}.`);
          allyStrikeVfx(st, foe, hitRes, dmgKind);
        } else {
          foe.hp = Math.max(0, foe.hp - hitRes.damage);
          allyStrikeVfx(st, foe, hitRes, dmgKind);
          total += hitRes.damage;
        }
      }
      appendFightLog(`Twin Jab hits ${foe.name} for ${total} total.`);
      spendAndCooldown(st, skillName, def, cost);
      afterCommit();
      return true;
    }

    if (pattern === "aoe_phys_adj" || pattern === "aoe_mag_adj" || pattern === "burning_field" || pattern === "bleeding_flourish") {
      const uid = st.selectedUid;
      const adj = typeof row.aoeAdj === "number" ? row.aoeAdj : 1;
      const targets = collectAoeFoes(st, uid, adj);
      if (!targets.length) return true;
      spendAndCooldown(st, skillName, def, cost);
      targets.forEach((foe) => {
        const raw = computeStatDamage(row, dmgKind, foe, skillName);
        const hitRes = resolveOneHit(st, foe, raw, dmgKind, baseHit, baseCrit, 0, 0, skillName);
        applyUnifiedSkillHitToFoe(st, foe, hitRes, label, dmgKind, row);
      });
      afterCommit();
      return true;
    }

    if (pattern === "earthbreaker" || pattern === "arcane_collapse") {
      const uid = st.selectedUid;
      const adj = typeof row.aoeAdj === "number" ? row.aoeAdj : 1;
      const targets = collectAoeFoes(st, uid, adj);
      if (!targets.length) return true;
      spendAndCooldown(st, skillName, def, cost);
      targets.forEach((foe) => {
        const raw = computeStatDamage(row, dmgKind, foe, skillName);
        const hitRes = resolveOneHit(st, foe, raw, dmgKind, baseHit, baseCrit, 0, 0, skillName);
        applyUnifiedSkillHitToFoe(st, foe, hitRes, label, dmgKind, row, { reflect: false });
      });
      afterCommit();
      return true;
    }

    if (pattern === "event_horizon") {
      const living = st.foes.filter((f) => f.hp > 0);
      spendAndCooldown(st, skillName, def, cost);
      living.forEach((foe) => {
        const raw = computeStatDamage(row, dmgKind, foe, skillName);
        const hitRes = resolveOneHit(st, foe, raw, dmgKind, baseHit, baseCrit, 0, 0, skillName);
        applyUnifiedSkillHitToFoe(st, foe, hitRes, label, dmgKind, row, { reflect: false });
      });
      afterCommit();
      return true;
    }

    if (pattern === "reflex_volley") {
      const living = st.foes.filter((f) => f.hp > 0);
      if (!living.length) return true;
      const hits = typeof row.hits === "number" ? row.hits : 3;
      spendAndCooldown(st, skillName, def, cost);
      for (let i = 0; i < hits; i++) {
        const foe = living[Math.floor(Math.random() * living.length)];
        const raw = computeStatDamage(row, dmgKind, foe, skillName);
        const hitRes = resolveOneHit(st, foe, raw, dmgKind, baseHit, baseCrit, 0, 0, skillName);
        applyUnifiedSkillHitToFoe(st, foe, hitRes, label, dmgKind, row, { reflect: false });
      }
      afterCommit();
      return true;
    }

    appendFightLog(`${label} is not implemented in unified combat yet.`);
    return true;
  };
})();
