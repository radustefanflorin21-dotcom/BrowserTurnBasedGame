/**
 * Pet definitions: element, visuals, food, and L30 stat targets (linear scale by level).
 */
(function (root) {
  const ELEMENT_BASIC_FOOD = {
    fire: ["Ash Scale", "Burnt Hide", "Fire Essence", "Ember Core", "Burning Fang"],
    earth: ["Earth Essence", "Soft Fur", "Digging Claw", "Thick Hide", "Stone Scale"],
    nature: ["Nature Essence", "Seeds", "Plant Fiber", "Bark Fragment", "Dart Spine"],
    water: ["Water Essence", "Wet Membrane", "Ripple Core", "Ice Essence", "Sharp Fin"]
  };

  function petEntry(opts) {
    return {
      displayName: opts.displayName,
      element: opts.element,
      images: {
        young: opts.imageBase + "_young.png",
        grown: opts.imageBase + "_grown.png",
        mature: opts.imageBase + "_mature.png"
      },
      favoriteFood: opts.favoriteFood.slice(),
      statsAt30: { ...opts.statsAt30 }
    };
  }

  const PET_CATALOG = {
    "Ember Salamander": petEntry({
      displayName: "Ember Salamander",
      element: "fire",
      imageBase: "Assets/Pets/ember_salamander",
      favoriteFood: ["Oracle Ember Eye", "Oracle Flameheart", "Burning Prophecy Core", "Cinderveil Thread"],
      statsAt30: { INT: 36, "Magic Resist": 4, Accuracy: 3 }
    }),
    "Cinder Moth": petEntry({
      displayName: "Cinder Moth",
      element: "fire",
      imageBase: "Assets/Pets/cinder_moth",
      favoriteFood: ["Burning Prophecy Core", "Oracle Ember Eye", "Hatred Emberstone", "Tyrant Forge Core"],
      statsAt30: { INT: 30, "Magic Damage": 6, Accuracy: 5, "Magic Resist": 4 }
    }),
    "Flameglass Viper": petEntry({
      displayName: "Flameglass Viper",
      element: "fire",
      imageBase: "Assets/Pets/flameglass_viper",
      favoriteFood: ["Oracle Flameheart", "Broken Riftblade", "Worldhate Soulcore", "Burning Prophecy Core"],
      statsAt30: { INT: 28, Accuracy: 6, "Status Resist": 5, "Magic Damage": 3 }
    }),
    "Rift Emberling": petEntry({
      displayName: "Rift Emberling",
      element: "fire",
      imageBase: "Assets/Pets/rift_emberling",
      favoriteFood: ["Oracle Flameheart", "Hatred Emberstone", "Worldhate Soulcore", "Cinderveil Thread"],
      statsAt30: { INT: 26, Healing: 5, "Magic Damage": 4, "Status Resist": 4 }
    }),
    "Ironroot Raptor": petEntry({
      displayName: "Ironroot Raptor",
      element: "earth",
      imageBase: "Assets/Pets/ironroot_raptor",
      favoriteFood: ["Rootknuckle Bone", "Silverback Titan Heart", "Granite Horn Fragment", "Hornbreaker Core"],
      statsAt30: { STR: 36, Accuracy: 3, "Physical Resist": 3 }
    }),
    "Granite Boar": petEntry({
      displayName: "Granite Boar",
      element: "earth",
      imageBase: "Assets/Pets/granite_boar",
      favoriteFood: ["Granite Horn Fragment", "Breaker Hide Plate", "Faultline Hoof", "Hornbreaker Core"],
      statsAt30: { STR: 28, VIT: 16, HP: 160, "Physical Damage": 6 }
    }),
    "Rustjaw Hound": petEntry({
      displayName: "Rustjaw Hound",
      element: "earth",
      imageBase: "Assets/Pets/rustjaw_hound",
      favoriteFood: ["Marshal Rustplate", "Rustbound Heart", "Broken Command Blade", "Wargrave Ember"],
      statsAt30: { STR: 30, "Physical Damage": 5, Accuracy: 4, Crit: 3 }
    }),
    "Stoneback Auroch": petEntry({
      displayName: "Stoneback Auroch",
      element: "earth",
      imageBase: "Assets/Pets/stoneback_auroch",
      favoriteFood: ["Gaiahide Plate", "Behemoth Rootbone", "Colossus Plate Shard", "Pressurecore Heart"],
      statsAt30: { STR: 24, VIT: 18, HP: 140, "Physical Resist": 4 }
    }),
    "Mossheart Stag": petEntry({
      displayName: "Mossheart Stag",
      element: "nature",
      imageBase: "Assets/Pets/mossheart_stag",
      favoriteFood: ["Bloomseer Heartseed", "Gaia Rootheart Fragment", "Heartbloom Sapstone", "Ancient Heartbloom Petal"],
      statsAt30: { VIT: 36, HP: 260, "Status Resist": 3 }
    }),
    "Barkscale Tortoise": petEntry({
      displayName: "Barkscale Tortoise",
      element: "nature",
      imageBase: "Assets/Pets/barkscale_tortoise",
      favoriteFood: ["Frosthorn Soulplate", "Bulwark Icehide", "Thornback Carapace", "Buried Bone Core"],
      statsAt30: { VIT: 28, HP: 220, "Physical Resist": 5, "Status Resist": 4 }
    }),
    "Verdant Lynx": petEntry({
      displayName: "Verdant Lynx",
      element: "nature",
      imageBase: "Assets/Pets/verdant_lynx",
      favoriteFood: ["Whitebark Heartseed", "Frozen Mend Core", "Matron Rootcloth", "Rootmend Core"],
      statsAt30: { VIT: 26, HP: 200, "Magic Resist": 4, "Status Resist": 5 }
    }),
    "Heartbloom Wisp": petEntry({
      displayName: "Heartbloom Wisp",
      element: "nature",
      imageBase: "Assets/Pets/heartbloom_wisp",
      favoriteFood: ["Gaia Soulseed", "Living Canopy Core", "Verdant Mend Core", "Ancient Gaia Sap"],
      statsAt30: { VIT: 22, INT: 22, Healing: 6, "Status Resist": 5 }
    }),
    "Tideglass Otter": petEntry({
      displayName: "Tideglass Otter",
      element: "water",
      imageBase: "Assets/Pets/tideglass_otter",
      favoriteFood: ["Tidemother Core", "Echo Heart", "Leviathan Stormcore", "Eye of the Maelstrom"],
      statsAt30: { DEX: 36, Evasion: 4, Accuracy: 3 }
    }),
    "Frost Mink": petEntry({
      displayName: "Frost Mink",
      element: "water",
      imageBase: "Assets/Pets/frost_mink",
      favoriteFood: ["Hollowglass Shard", "Siren Silence Core", "Undertaker Frosthide", "Absolute Rime Crystal"],
      statsAt30: { DEX: 30, Crit: 5, Evasion: 5, Accuracy: 4 }
    }),
    "Ripplewing Heron": petEntry({
      displayName: "Ripplewing Heron",
      element: "water",
      imageBase: "Assets/Pets/ripplewing_heron",
      favoriteFood: ["Stormfang Claw", "Static Fang Core", "Stormwake Tendril", "Abyssal Lightning Scale"],
      statsAt30: { DEX: 28, Accuracy: 6, Evasion: 4, Crit: 3 }
    }),
    "Glassfin Serpent": petEntry({
      displayName: "Glassfin Serpent",
      element: "water",
      imageBase: "Assets/Pets/glassfin_serpent",
      favoriteFood: ["Drowned Sigil Fragment", "Charged Brine Core", "Frozen Echo Heart", "Apathy Soulcore"],
      statsAt30: { DEX: 24, Accuracy: 7, Evasion: 4, "Status Resist": 3 }
    })
  };

  Object.keys(PET_CATALOG).forEach((name) => {
    const entry = PET_CATALOG[name];
    entry.basicFood = (ELEMENT_BASIC_FOOD[entry.element] || []).slice();
  });

  function getPetCatalogEntry(baseName) {
    const key = typeof baseName === "string" ? baseName.trim() : "";
    return key && PET_CATALOG[key] ? PET_CATALOG[key] : null;
  }

  function listPetBaseNames() {
    return Object.keys(PET_CATALOG);
  }

  function listPetsByElement(element) {
    const el = String(element || "").trim().toLowerCase();
    return listPetBaseNames().filter((n) => {
      const e = PET_CATALOG[n];
      return e && e.element === el;
    });
  }

  function getBasicFoodForElement(element) {
    const el = String(element || "").trim().toLowerCase();
    return (ELEMENT_BASIC_FOOD[el] || []).slice();
  }

  function getElementForPet(baseName) {
    const entry = getPetCatalogEntry(baseName);
    return entry && entry.element ? entry.element : null;
  }

  const api = {
    PET_CATALOG,
    ELEMENT_BASIC_FOOD,
    getPetCatalogEntry,
    listPetBaseNames,
    listPetsByElement,
    getBasicFoodForElement,
    getElementForPet
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.PETS_CATALOG = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
