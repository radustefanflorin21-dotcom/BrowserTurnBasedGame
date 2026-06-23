/**
 * Gathering loot rolls + profession XP events (client + server).
 */
(function (root) {
  const GATHERING_PROFESSION_IDS = new Set(["harvester", "skinner", "extractor"]);

  function isGatheringProfessionCondition(cond) {
    const c = String(cond || "")
      .trim()
      .toLowerCase();
    return GATHERING_PROFESSION_IDS.has(c);
  }

  function getMaterialCondition(mat) {
    if (!mat || typeof mat !== "object") return "";
    const raw =
      typeof mat.condition === "string"
        ? mat.condition
        : typeof mat.requiredProfession === "string"
          ? mat.requiredProfession
          : "";
    return raw.trim().toLowerCase();
  }

  function isGatheringMaterial(mat) {
    return isGatheringProfessionCondition(getMaterialCondition(mat));
  }

  function resolveFoeLevel(foe, def) {
    if (foe && typeof foe.level === "number" && foe.level > 0) {
      return Math.max(1, Math.floor(foe.level));
    }
    if (!def || typeof def !== "object") return 1;
    const min =
      typeof def.minLevel === "number" && def.minLevel > 0
        ? Math.floor(def.minLevel)
        : typeof def.level === "number" && def.level > 0
          ? Math.floor(def.level)
          : 1;
    const max = typeof def.maxLevel === "number" && def.maxLevel > 0 ? Math.floor(def.maxLevel) : min;
    return Math.max(1, Math.floor((min + max) / 2));
  }

  function getGatheringTierIdByLevel(level) {
    const lv = Math.max(1, Math.floor(level));
    if (lv <= 10) return "t1";
    if (lv <= 20) return "t2";
    if (lv <= 30) return "t3";
    if (lv <= 40) return "t4";
    return "t5";
  }

  function getGatheringDropChancePctForLevel(level) {
    const tier = getGatheringTierIdByLevel(level);
    if (tier === "t1") return 70;
    if (tier === "t2") return 50;
    if (tier === "t3") return 30;
    if (tier === "t4") return 15;
    return 5;
  }

  function getActorSelectedProfessions(actor) {
    if (!actor || !Array.isArray(actor.professions)) return [];
    return actor.professions
      .map((id) => String(id || "").trim())
      .filter(Boolean);
  }

  function getGatheringProfessionIds(actor, professionDefs) {
    const defs = Array.isArray(professionDefs) ? professionDefs : [];
    const gathering = new Set(defs.filter((d) => d && d.kind === "gathering").map((d) => d.id));
    return getActorSelectedProfessions(actor).filter((id) => gathering.has(id));
  }

  function canActorGatherProfession(actor, professionId, resourceLevel, PP) {
    const profId = String(professionId || "").trim();
    if (!profId || !GATHERING_PROFESSION_IDS.has(profId)) return false;
    const selected = getActorSelectedProfessions(actor).map((id) => id.toLowerCase());
    if (!selected.includes(profId.toLowerCase())) return false;
    const profLevel = PP && typeof PP.getProfessionLevel === "function" ? PP.getProfessionLevel(actor, profId) : 1;
    const resLv = Math.max(1, Math.floor(resourceLevel));
    const requiredLevel =
      PP && typeof PP.getRequiredProfessionLevelForItemLevel === "function"
        ? PP.getRequiredProfessionLevelForItemLevel(resLv)
        : resLv;
    return profLevel >= requiredLevel;
  }

  function getMonsterGatheringCategories(def, config) {
    const map =
      config?.monsterGatheringCategories && typeof config.monsterGatheringCategories === "object"
        ? config.monsterGatheringCategories
        : {};
    const name = def && typeof def.name === "string" ? def.name.trim() : "";
    if (!name) return [];
    const raw = map[name];
    if (!Array.isArray(raw)) return [];
    const out = [];
    raw.forEach((c) => {
      const k = String(c || "")
        .trim()
        .toLowerCase();
      if (!k || out.includes(k)) return;
      out.push(k);
    });
    return out;
  }

  function canProfessionGatherFromCategory(profId, categoryId, config) {
    const cats =
      config?.professions?.gatheringCategories && typeof config.professions.gatheringCategories === "object"
        ? config.professions.gatheringCategories
        : {};
    const cat = cats[String(categoryId || "").trim().toLowerCase()];
    if (!cat || !Array.isArray(cat.allowed)) return false;
    return cat.allowed.includes(String(profId || "").trim());
  }

  function rollItemDropEntry(rng, entry, dropRateMult) {
    if (!entry) return null;
    const name = typeof entry === "string" ? entry.trim() : typeof entry.name === "string" ? entry.name.trim() : "";
    if (!name) return null;
    let pct = typeof entry === "object" && entry != null ? entry.dropRate : 100;
    if (pct == null || pct === "") pct = 100;
    pct = Number(pct);
    if (!Number.isFinite(pct)) return null;
    const mult = Number.isFinite(dropRateMult) && dropRateMult > 0 ? dropRateMult : 1;
    pct = Math.max(0, Math.min(100, pct * mult));
    if (pct <= 0) return null;
    if (pct >= 100) return name;
    const roll = typeof rng.chance === "function" ? rng.chance(pct) : Math.random() * 100 < pct;
    return roll ? name : null;
  }

  function pushGatherSuccess(out, itemName, professionId, resourceLevel, profLevel, GatherXp, rng) {
    const xp =
      GatherXp && typeof GatherXp.computeGatherXp === "function"
        ? GatherXp.computeGatherXp(resourceLevel, profLevel)
        : 0;
    out.items.push(itemName);
    if (xp > 0) {
      out.gatherEvents.push({
        professionId,
        xp,
        resourceLevel,
        itemName
      });
    }
    const bonusChance =
      GatherXp && typeof GatherXp.getBonusYieldChance === "function"
        ? GatherXp.getBonusYieldChance(profLevel, resourceLevel)
        : 0;
    if (bonusChance > 0) {
      const bonusRoll =
        typeof rng.chance === "function" ? rng.chance(bonusChance * 100) : Math.random() < bonusChance;
      if (bonusRoll) out.items.push(itemName);
    }
  }

  function buildTierMaterialAttribution(selectedProfs, cats, tier, tables, resourceLevel, actor, PP, config) {
    const materialToProf = new Map();
    selectedProfs.forEach((profId) => {
      if (!canActorGatherProfession(actor, profId, resourceLevel, PP)) return;
      const profTbl = tables?.[profId];
      if (!profTbl) return;
      cats.forEach((c) => {
        if (!canProfessionGatherFromCategory(profId, c, config)) return;
        const byTier = profTbl[c];
        if (!byTier || !Array.isArray(byTier[tier])) return;
        byTier[tier].forEach((n) => {
          const k = String(n || "").trim();
          if (k && !materialToProf.has(k)) materialToProf.set(k, profId);
        });
      });
      if (profId === "skinner" && cats.includes("beast") && cats.includes("nature")) {
        if (tier === "t2" || tier === "t3" || tier === "t4" || tier === "t5") {
          if (!materialToProf.has("Bark Fiber")) materialToProf.set("Bark Fiber", profId);
        }
        if (tier === "t4" || tier === "t5") {
          if (!materialToProf.has("Living Bark")) materialToProf.set("Living Bark", profId);
        }
        if (tier === "t5") {
          if (!materialToProf.has("Ancient Bark")) materialToProf.set("Ancient Bark", profId);
        }
      }
    });
    return materialToProf;
  }

  /**
   * Tier-pool gathering (system B).
   */
  function collectTierPoolGathering(rng, foe, def, actor, deps, chanceMult) {
    const out = { items: [], gatherEvents: [] };
    const { config, PP, GatherXp, tables } = deps;
    const professionDefs =
      config?.professions?.available && Array.isArray(config.professions.available)
        ? config.professions.available
        : [];
    const selected = getGatheringProfessionIds(actor, professionDefs);
    if (!selected.length) return out;
    const cats = getMonsterGatheringCategories(def, config);
    if (!cats.length) return out;

    const resourceLevel = resolveFoeLevel(foe, def);
    const tier = getGatheringTierIdByLevel(resourceLevel);
    const basePct = getGatheringDropChancePctForLevel(resourceLevel);
    const materialToProf = buildTierMaterialAttribution(
      selected,
      cats,
      tier,
      tables,
      resourceLevel,
      actor,
      PP,
      config
    );
    if (!materialToProf.size) return out;

    const mult = Number.isFinite(chanceMult) && chanceMult > 0 ? chanceMult : 1;
    materialToProf.forEach((profId, matName) => {
      const rolled = rollItemDropEntry(rng, { name: matName, dropRate: basePct }, mult);
      if (!rolled) return;
      const profLevel = PP.getProfessionLevel(actor, profId);
      pushGatherSuccess(out, rolled, profId, resourceLevel, profLevel, GatherXp, rng);
    });
    return out;
  }

  /**
   * Tagged gathering entries from monster drop tables.
   */
  function collectTaggedTableGathering(rng, foe, def, actor, gatheringMaterials, deps, chanceMult) {
    const out = { items: [], gatherEvents: [] };
    const { PP, GatherXp } = deps;
    const resourceLevel = resolveFoeLevel(foe, def);
    const mult = Number.isFinite(chanceMult) && chanceMult > 0 ? chanceMult : 1;

    (gatheringMaterials || []).forEach((mat) => {
      if (!mat || typeof mat.name !== "string") return;
      const cond = getMaterialCondition(mat);
      if (!isGatheringProfessionCondition(cond)) return;
      if (!canActorGatherProfession(actor, cond, resourceLevel, PP)) return;
      const rolled = rollItemDropEntry(rng, { name: mat.name.trim(), dropRate: mat.dropRate }, mult);
      if (!rolled) return;
      const profLevel = PP.getProfessionLevel(actor, cond);
      pushGatherSuccess(out, rolled, cond, resourceLevel, profLevel, GatherXp, rng);
    });
    return out;
  }

  function mergeGatherResults(target, source) {
    if (!source) return target;
    if (Array.isArray(source.items)) target.items.push(...source.items);
    if (Array.isArray(source.gatherEvents)) target.gatherEvents.push(...source.gatherEvents);
    return target;
  }

  /**
   * Full gathering phase for one actor (tier pool + tagged table entries).
   */
  function collectGatheringLootForActor(rng, foe, def, actor, gatheringMaterials, deps, chanceMult) {
    const out = { items: [], gatherEvents: [] };
    mergeGatherResults(out, collectTierPoolGathering(rng, foe, def, actor, deps, chanceMult));
    mergeGatherResults(
      out,
      collectTaggedTableGathering(rng, foe, def, actor, gatheringMaterials, deps, chanceMult)
    );
    return out;
  }

  function splitMonsterMaterials(table) {
    const normal = [];
    const gathering = [];
    (table?.materials || []).forEach((mat) => {
      if (!mat?.name) return;
      if (isGatheringMaterial(mat)) gathering.push(mat);
      else normal.push(mat);
    });
    return { normal, gathering };
  }

  function applyGatherEventsToActor(actor, gatherEvents, PP) {
    if (!actor || !Array.isArray(gatherEvents) || !PP) return;
    gatherEvents.forEach((evt) => {
      if (!evt || !(evt.xp > 0) || !evt.professionId) return;
      PP.addProfessionXp(actor, evt.professionId, evt.xp);
    });
  }

  const api = Object.freeze({
    GATHERING_PROFESSION_IDS,
    isGatheringProfessionCondition,
    getMaterialCondition,
    isGatheringMaterial,
    resolveFoeLevel,
    getGatheringTierIdByLevel,
    getGatheringDropChancePctForLevel,
    getActorSelectedProfessions,
    getGatheringProfessionIds,
    canActorGatherProfession,
    getMonsterGatheringCategories,
    canProfessionGatherFromCategory,
    rollItemDropEntry,
    collectTierPoolGathering,
    collectTaggedTableGathering,
    collectGatheringLootForActor,
    splitMonsterMaterials,
    applyGatherEventsToActor
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.GatheringLoot = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
