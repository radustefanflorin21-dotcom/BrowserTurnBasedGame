/**
 * Elemental egg drop rates, region mapping, and hatch pools.
 */
(function (root) {
  const ELEMENTS = ["fire", "earth", "nature", "water"];

  const EGG_BY_ELEMENT = {
    fire: "Fire Egg",
    earth: "Earth Egg",
    nature: "Nature Egg",
    water: "Water Egg"
  };

  const EGG_ITEM_TO_ELEMENT = {
    "Fire Egg": "fire",
    "Earth Egg": "earth",
    "Nature Egg": "nature",
    "Water Egg": "water"
  };

  /** Drop chance (% per kill) by tier. */
  const EGG_DROP_RATE_PCT = {
    common: 0.1,
    rare: 0.15,
    epic: 0.2,
    dungeon_elite: 0.5,
    dungeon_boss: 1
  };

  /** Overworld biome name → egg element. */
  const BIOME_ELEMENT = {
    "Hatred of the World": "fire",
    "Aftermath of War": "fire",
    "The held breath": "earth",
    "Skin of Gaia": "earth",
    "The misery of life": "earth",
    "Heart of Gaia": "nature",
    "Innocence of North": "nature",
    "Paradise South": "water",
    "Paradise North": "water",
    "The apathy of the World": "water"
  };

  /** Dungeon id → egg element. */
  const DUNGEON_ELEMENT = {
    sunken_grotto: "water",
    stormbreak_hollow: "water",
    silent_glacier: "water",
    rootwarren: "nature",
    frostroot_nursery: "nature",
    verdant_deep: "nature",
    withered_maw: "earth",
    stonevein_sanctum: "earth",
    rustfallen_bastion: "fire",
    infernal_riftforge: "fire"
  };

  /** Two unique elite monsters per dungeon (beside the boss). */
  const DUNGEON_ELITE_NAMES = new Set([
    "Tidebound Crusher",
    "Drowned Channeler",
    "Stormfang Ravager",
    "Abyssal Tempest Caller",
    "Bramblehorn Matriarch",
    "Fangroot Alpha",
    "Thornback Graveguard",
    "Mirage Maw",
    "Petrified Coilwarden",
    "Granitehorn Breaker",
    "Whitebark Matron",
    "Frosthorn Bulwark",
    "Rustbound Marshal",
    "Bannerless Wraithlord",
    "Verdant Bloomseer",
    "Primordial Silverback",
    "Inferno Oracle",
    "Ashmaw Titan",
    "Hollowglass Siren",
    "Rimebound Undertaker"
  ]);

  function getEggElementForContext(lootContext) {
    const ctx = lootContext && typeof lootContext === "object" ? lootContext : {};
    const dungeonId = typeof ctx.dungeonId === "string" ? ctx.dungeonId.trim() : "";
    if (dungeonId && DUNGEON_ELEMENT[dungeonId]) return DUNGEON_ELEMENT[dungeonId];
    const biomeName = typeof ctx.biomeName === "string" ? ctx.biomeName.trim() : "";
    if (biomeName && BIOME_ELEMENT[biomeName]) return BIOME_ELEMENT[biomeName];
    return null;
  }

  function getEggDropTier(foe, def) {
    if (foe && foe.isBoss === true) return "dungeon_boss";
    if (def && def.isBoss === true) return "dungeon_boss";
    const name = (foe && foe.name) || (def && def.name) || "";
    if (name && DUNGEON_ELITE_NAMES.has(name)) return "dungeon_elite";
    const rarity = String((def && def.spawnRarity) || "common")
      .trim()
      .toLowerCase();
    if (rarity === "rare") return "rare";
    if (rarity === "epic" || rarity === "myth" || rarity === "ancient") return "epic";
    return "common";
  }

  function getEggDropChancePct(foe, def) {
    const tier = getEggDropTier(foe, def);
    return EGG_DROP_RATE_PCT[tier] != null ? EGG_DROP_RATE_PCT[tier] : EGG_DROP_RATE_PCT.common;
  }

  /**
   * @param {object} lootContext { dungeonId?, biomeName? }
   * @param {object} foe combat foe
   * @param {object} def enemy def
   * @param {() => number} [rng01] optional 0..1 roll
   * @returns {string|null} egg item name
   */
  function tryRollEggDrop(lootContext, foe, def, rng01) {
    if (foe && foe.combat && typeof foe.combat.summonerUid === "number") return null;
    const element = getEggElementForContext(lootContext);
    if (!element || !EGG_BY_ELEMENT[element]) return null;
    const pct = getEggDropChancePct(foe, def);
    const roll = typeof rng01 === "function" ? rng01() : Math.random();
    if (roll * 100 >= pct) return null;
    return EGG_BY_ELEMENT[element];
  }

  function pickRandomPetForElement(element, rng01) {
    const cat = root.PETS_CATALOG;
    if (!cat || typeof cat.listPetsByElement !== "function") return null;
    const pool = cat.listPetsByElement(element);
    if (!pool.length) return null;
    const roll = typeof rng01 === "function" ? rng01() : Math.random();
    return pool[Math.floor(roll * pool.length)] || pool[0];
  }

  const api = {
    ELEMENTS,
    EGG_BY_ELEMENT,
    EGG_ITEM_TO_ELEMENT,
    EGG_DROP_RATE_PCT,
    BIOME_ELEMENT,
    DUNGEON_ELEMENT,
    DUNGEON_ELITE_NAMES,
    getEggElementForContext,
    getEggDropTier,
    getEggDropChancePct,
    tryRollEggDrop,
    pickRandomPetForElement
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.PET_EGG_DROPS = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
