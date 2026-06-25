/**
 * Shared enemy skill application on the tactical grid (server + client).
 */
(function (root) {
  const TG = () =>
    typeof TacticalGrid !== "undefined"
      ? TacticalGrid
      : typeof require !== "undefined"
        ? require("./tactical_grid.js")
        : null;
  const TER = () =>
    typeof TacticalEnemyResolve !== "undefined"
      ? TacticalEnemyResolve
      : typeof require !== "undefined"
        ? require("./tactical_enemy_resolve.js")
        : null;
  const ET = () =>
    typeof EnemyTacticalTargeting !== "undefined"
      ? EnemyTacticalTargeting
      : typeof require !== "undefined"
        ? require("./enemy_tactical_targeting.js")
        : null;

  function livingParty(st) {
    return TER().livingParty(st);
  }

  function filterDebuffedPlayers(st, players) {
    const status = st?.status;
    if (!status) return players;
    const hasDebuff =
      (status.playerAccuracyDownTurns || 0) > 0 ||
      (status.playerStaminaCostUpTurns || 0) > 0 ||
      (status.playerFragileTurns || 0) > 0 ||
      (status.playerStunTurns || 0) > 0 ||
      (status.playerMagicDamageDownTurns || 0) > 0 ||
      (status.playerBurnTurns || 0) > 0 ||
      (status.playerBleedTurns || 0) > 0;
    if (!hasDebuff) return [];
    return players.filter((m) => {
      if (m.kind === "hero" && hasDebuff) return true;
      return (m.incomingDamageUpTurns || 0) > 0 || (m.guardedTurns || 0) > 0;
    });
  }

  function resolvePlayersInRange(st, foe, cfg) {
    const ter = TER();
    const rangeCfg = {
      ...cfg,
      rangeMin: typeof cfg.rangeMin === "number" ? cfg.rangeMin : 1,
      rangeMax: typeof cfg.rangeMax === "number" ? cfg.rangeMax : 4
    };
    return livingParty(st).filter((m) => ter.inSkillRange(st, foe, m.gridX, m.gridY, rangeCfg));
  }

  function resolveSkillTargets(st, foe, cfg, primary) {
    const ter = TER();
    if (cfg.target === "players_in_range") {
      let players = resolvePlayersInRange(st, foe, cfg);
      if (cfg.filterDebuffed) players = filterDebuffedPlayers(st, players);
      return { players, foes: [], tiles: [] };
    }
    if (cfg.target === "global_players" || cfg.aoe === "global_players") {
      let players = livingParty(st);
      if (cfg.filterDebuffed) players = filterDebuffedPlayers(st, players);
      return { players, foes: [], tiles: [] };
    }
    const ax = primary?.gridX;
    const ay = primary?.gridY;
    if (cfg.anchorSelf && cfg.aoe === "cross1") {
      const tiles = TG().coordKey
        ? (typeof TacticalTargeting !== "undefined" ? TacticalTargeting : require("./tactical_targeting.js")).cross1Tiles(
            foe.gridX,
            foe.gridY,
            1
          )
        : [];
      return { players: ter.unitsOnTiles(st, tiles, "player"), foes: [], tiles };
    }
    return ter.resolveTargets(st, foe, cfg, ax, ay);
  }

  /**
   * @param {object} st combat state
   * @param {object} foe attacking enemy
   * @param {string} scriptId
   * @param {string} role
   * @param {string} skillKey
   * @param {object} opts { raw, verb, member, rule, buffOnly, pull }
   * @param {object} hooks { hitMember(member, raw, verb), log(line), healSelf(pct), healFoe(foe, amt) }
   */
  function applyEnemySkill(st, foe, scriptId, role, skillKey, opts, hooks) {
    const et = ET();
    const ter = TER();
    const cfg = et.getEnemySkillTargeting(scriptId, skillKey, role);
    const raw = opts?.raw ?? 0;
    const verb = opts?.verb || "hits";
    const primary =
      opts?.member ||
      (st?.tactical && typeof foe.gridX === "number"
        ? ter.pickBestPlayer(st, foe, cfg, opts?.rule || "bruiser", opts?.rng || null)
        : null);

    if (!st?.tactical || typeof foe.gridX !== "number") {
      if (cfg.buffOnly || opts?.buffOnly) {
        if (hooks.log) hooks.log(`${foe.name} empowers nearby allies.`);
        return { buffOnly: true };
      }
      if (cfg.target === "global_players" || cfg.aoe === "global_players") {
        let targets = livingParty(st);
        if (cfg.filterDebuffed) targets = filterDebuffedPlayers(st, targets);
        for (const m of targets) hooks.hitMember(m, raw, verb);
        return { targets };
      }
      if (cfg.target === "players_in_range") {
        const targets = resolvePlayersInRange(st, foe, cfg);
        for (const m of targets) hooks.hitMember(m, raw, verb);
        return { targets };
      }
      if (primary) {
        hooks.hitMember(primary, raw, verb);
        if (cfg.pull || opts?.pull) ter.pullUnitToward(st, primary, foe.gridX, foe.gridY);
      }
      return { primary };
    }

    if (cfg.target === "self" || (cfg.rangeMax === 0 && cfg.aoe === "none" && !cfg.summonAdjacent)) {
      if (cfg.buffOnly || opts?.buffOnly) return { self: true };
      return { self: true };
    }

    if (cfg.summonAdjacent) {
      return { summon: true };
    }

    const resolved = resolveSkillTargets(st, foe, cfg, primary);

    if (cfg.buffOnly || opts?.buffOnly) {
      const buffTargets = [...resolved.foes];
      if (cfg.includeSelf) buffTargets.unshift(foe);
      for (const f of buffTargets) {
        if (!f.combat) f.combat = { skillCd: {} };
        f.combat.outgoingDamageBonusPct = Math.max(f.combat.outgoingDamageBonusPct || 0, 8);
        f.combat.outgoingDamageBonusTurns = Math.max(f.combat.outgoingDamageBonusTurns || 0, 2);
      }
      if (buffTargets.length && hooks.log) hooks.log(`${foe.name} empowers nearby allies.`);
      return { foes: buffTargets };
    }

    if (cfg.target === "foe_ally" && cfg.targetSelfOrAlly && !resolved.foes.length && hooks.healSelf) {
      hooks.healSelf(typeof opts?.healPct === "number" ? opts.healPct : 0.12);
      return { selfHeal: true };
    }

    for (const m of resolved.players) {
      hooks.hitMember(m, raw, verb);
      if (cfg.pull || opts?.pull) ter.pullUnitToward(st, m, foe.gridX, foe.gridY);
    }

    if (cfg.selfHealAfter && resolved.players.length && hooks.healSelf) {
      hooks.healSelf(typeof opts?.healPct === "number" ? opts.healPct : 0.1);
    }

    return resolved;
  }

  function pickSkillTarget(st, foe, scriptId, role, skillKey, rule, rng) {
    const et = ET();
    const ter = TER();
    const cfg = et.getEnemySkillTargeting(scriptId, skillKey, role);
    if (!st?.tactical || typeof foe.gridX !== "number") return null;
    return ter.pickBestPlayer(st, foe, cfg, rule || "nearest", rng || null);
  }

  const api = Object.freeze({
    applyEnemySkill,
    pickSkillTarget,
    resolveSkillTargets,
    filterDebuffedPlayers,
    resolvePlayersInRange
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.EnemyTacticalCombat = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
