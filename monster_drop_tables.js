/**
 * Per-monster loot: gear pool weights + material drop chances (% per material pass).
 * Merged into GAME_CONFIG after config.js loads. Victory loot uses game.js helpers.
 */
(function () {
  if (typeof GAME_CONFIG === "undefined" || !GAME_CONFIG) return;

  const coastalTide = {
    gear: [
    ],
    materials: [
      { name: "Abyss Flesh", dropRate: 32.5 },
      { name: "Dark Residue", dropRate: 20 },
      { name: "Abyss Core", dropRate: 6 },
      { name: "Deepwater Essence", dropRate: 2.5 }
    ]
  };

  GAME_CONFIG.lootDropSettings = {
    materialPassesMin: 1,
    materialPassesMax: 2,
    rarityWeights: [
      { id: "common", weight: 70 },
      { id: "uncommon", weight: 20 },
      { id: "rare", weight: 8 },
      { id: "epic", weight: 1.8 },
      { id: "legendary", weight: 0.2 }
    ],
    gearBaseChanceByMaxLevel: [
      { maxLevel: 10, chance: 0.1 },
      { maxLevel: 20, chance: 0.06 },
      { maxLevel: 30, chance: 0.03 },
      { maxLevel: 40, chance: 0.012 },
      { maxLevel: 999, chance: 0.004 }
    ]
  };

  GAME_CONFIG.monsterDropTables = {
    "Tide Hopper": {
      materials: [
        { name: "Wet Membrane", dropRate: 37.5 },
        { name: "Elastic Tendon", dropRate: 22.5 },
        { name: "Ripple Core", dropRate: 9 },
        { name: "Water Essence", dropRate: 3 }
      ]
    },
    "Hermit Crab": {
      gear: [{ w: 5, item: "Scaleguard Shirt" }],
      materials: [
        { name: "Hardened Shell", dropRate: 37.5 },
        { name: "Crust Fragment", dropRate: 22.5 },
        { name: "Defensive Core", dropRate: 7.5 },
        { name: "Ocean Essence", dropRate: 2.5 }
      ]
    },
    "Saltwind Skimmer": {
      gear: [{ w: 7, item: "Skimmer Blade" }],
      materials: [
        { name: "Sharp Fin", dropRate: 35 },
        { name: "Wind Scale", dropRate: 20 },
        { name: "Razor Edge Fragment", dropRate: 7.5 },
        { name: "Wind Essence", dropRate: 2.5 }
      ]
    },
    "Brinegullet Spitter": {
      materials: [
        { name: "Acid Gland", dropRate: 35 },
        { name: "Fluid Sac", dropRate: 22.5 },
        { name: "Corrosive Core", dropRate: 7.5 },
        { name: "Toxic Essence", dropRate: 3 }
      ]
    },
    "Wavebreaker Idol": {
      materials: [
        { name: "Stone Core", dropRate: 37.5 },
        { name: "Ancient Fragment", dropRate: 20 },
        { name: "Resonance Core", dropRate: 6 },
        { name: "Tidal Essence", dropRate: 2.5 }
      ]
    },
    "Tidemeld Revenant": {
      materials: [
        { name: "Bound Remains", dropRate: 32.5 },
        { name: "Soul Residue", dropRate: 20 },
        { name: "Revenant Core Material", dropRate: 7.5 },
        { name: "Spirit Essence", dropRate: 3 }
      ]
    },
    "Coastal Horror": coastalTide,
    "Tideharrow": {
      gear: coastalTide.gear,
      materials: [
        { name: "Tide Fragment", dropRate: 32.5 },
        { name: "Pressure Core", dropRate: 20 },
        { name: "Crushing Essence", dropRate: 6 },
        { name: "Abyssal Essence", dropRate: 2.5 }
      ]
    },
    "Burrow Hare": {
      gear: [{ w: 4, item: "Burrowstep Boots" }, { w: 3.5, item: "Stonepulse Amulet" }],
      materials: [
        { name: "Soft Fur", dropRate: 35 },
        { name: "Digging Claw", dropRate: 22.5 },
        { name: "Reflex Core", dropRate: 7.5 },
        { name: "Earth Essence", dropRate: 2.5 }
      ]
    },
    "Dust Carver": {
      gear: [{ w: 4, item: "Sandfang Blade" }],
      materials: [
        { name: "Razor Claw", dropRate: 32.5 },
        { name: "Sand Blade Fragment", dropRate: 20 },
        { name: "Precision Core", dropRate: 7.5 },
        { name: "Dust Essence", dropRate: 2.5 }
      ]
    },
    "Grass Snake": {
      materials: [
        { name: "Venom Sac", dropRate: 37.5 },
        { name: "Scaled Skin", dropRate: 22.5 },
        { name: "Toxic Core", dropRate: 9 },
        { name: "Poison Essence", dropRate: 3 }
      ]
    },
    "Plains Raptor": {
      materials: [
        { name: "Talon Fragment", dropRate: 37.5 },
        { name: "Bone Shard", dropRate: 20 },
        { name: "Predator Core", dropRate: 7.5 },
        { name: "Wild Essence", dropRate: 2.5 }
      ]
    },
    "Tusk Boar": {
      gear: [{ w: 2.5, item: "Boarhide Leggings" }],
      materials: [
        { name: "Thick Hide", dropRate: 40 },
        { name: "Boar Tusk", dropRate: 22.5 },
        { name: "Endurance Core", dropRate: 9 },
        { name: "Nature Essence", dropRate: 3 }
      ]
    },
    "Field Wolf": {
      gear: [{ w: 3, item: "Fang Dagger" }],
      materials: [
        { name: "Wolf Fang", dropRate: 37.5 },
        { name: "Fur Pelt", dropRate: 20 },
        { name: "Predator Instinct Core", dropRate: 9 },
        { name: "Blood Essence", dropRate: 3 }
      ]
    },
    "Desert Thornback Crawler": {
      materials: [
        { name: "Spiked Shell", dropRate: 37.5 },
        { name: "Carapace Fragment", dropRate: 22.5 },
        { name: "Defense Core", dropRate: 7.5 },
        { name: "Earth Essence", dropRate: 2.5 }
      ]
    },
    "Dune Devourer": {
      gear: [{ w: 2.8, item: "Devourer Axe" }],
      materials: [
        { name: "Devourer Tooth", dropRate: 35 },
        { name: "Sand Core", dropRate: 20 },
        { name: "Hunger Core", dropRate: 7.5 },
        { name: "Earth Essence", dropRate: 2.5 }
      ]
    },
    "Mirage Lurker": {
      gear: [{ w: 2.8, item: "Mirage Ring" }],
      materials: [
        { name: "Mirage Dust", dropRate: 32.5 },
        { name: "Illusion Thread", dropRate: 20 },
        { name: "Trickster Core", dropRate: 6 },
        { name: "Illusion Essence", dropRate: 2.5 }
      ]
    },
    "Witherling": {
      materials: [
        { name: "Withered Tissue", dropRate: 32.5 },
        { name: "Decay Fragment", dropRate: 20 },
        { name: "Decay Core", dropRate: 7.5 },
        { name: "Shadow Essence", dropRate: 3 }
      ]
    },
    "Stone Marmot": {
      gear: [{ w: 2.5, item: "Marmot Helm" }],
      materials: [
        { name: "Hardened Stone", dropRate: 40 },
        { name: "Dense Fur", dropRate: 20 },
        { name: "Bulwark Core", dropRate: 9 },
        { name: "Earth Essence", dropRate: 2.5 }
      ]
    },
    "Rock Lynx": {
      gear: [{ w: 2.3, item: "Lynx Fang" }],
      materials: [
        { name: "Sharp Fang", dropRate: 35 },
        { name: "Stone Claw", dropRate: 20 },
        { name: "Hunter Core", dropRate: 7.5 },
        { name: "Earth Essence", dropRate: 2.5 }
      ]
    },
    "Rock Ibex": {
      gear: [{ w: 2.2, item: "Hornbreaker Axe" }],
      materials: [
        { name: "Ibex Horn", dropRate: 37.5 },
        { name: "Muscle Fiber", dropRate: 20 },
        { name: "Strength Core", dropRate: 7.5 },
        { name: "Earth Essence", dropRate: 2.5 }
      ]
    },
    "Rock Serpent": {
      gear: [{ w: 2, item: "Petrify Ring" }, { w: 1.8, item: "Earthbind Amulet" }],
      materials: [
        { name: "Stone Scale", dropRate: 35 },
        { name: "Petrify Gland", dropRate: 22.5 },
        { name: "Control Core", dropRate: 7.5 },
        { name: "Earth Essence", dropRate: 2.5 }
      ]
    },
    "Rock Lizard": {
      gear: [{ w: 1.8, item: "Stonescale Armor" }],
      materials: [
        { name: "Stone Scale", dropRate: 37.5 },
        { name: "Stone Skin", dropRate: 20 },
        { name: "Defense Core", dropRate: 7.5 },
        { name: "Earth Essence", dropRate: 2.5 }
      ]
    },
    "Leafdart Squirrel": {
      materials: [
        { name: "Dart Spine", dropRate: 35 },
        { name: "Bark Fragment", dropRate: 20 },
        { name: "Agility Core", dropRate: 7.5 },
        { name: "Nature Essence", dropRate: 2.5 }
      ]
    },
    "Greenleaf Fox": {
      gear: [{ w: 1.3, item: "Foxfang Blade" }, { w: 1.2, item: "Swiftbrush Boots" }, { w: 1.2, item: "Greenleaf Vest" }],
      materials: [
        { name: "Fox Fang", dropRate: 37.5 },
        { name: "Forest Fur", dropRate: 20 },
        { name: "Assassin Core", dropRate: 9 },
        { name: "Nature Essence", dropRate: 3 }
      ]
    },
    "Gorilla": {
      materials: [
        { name: "Thick Bone", dropRate: 40 },
        { name: "Muscle Fiber", dropRate: 22.5 },
        { name: "Rage Core", dropRate: 9 },
        { name: "Primal Essence", dropRate: 3 }
      ]
    },
    "Jungle Stag": {
      gear: [],
      materials: [
        { name: "Antler Piece", dropRate: 37.5 },
        { name: "Bark Fragment", dropRate: 20 },
        { name: "Support Core", dropRate: 7.5 },
        { name: "Nature Essence", dropRate: 3 }
      ]
    },
    "Faded War Wraith": {
      gear: [{ w: 0.9, item: "Wraithcall Scepter" }, { w: 0.8, item: "Soul Echo Amulet" }],
      materials: [
        { name: "Soul Fragment", dropRate: 32.5 },
        { name: "Shadow Residue", dropRate: 20 },
        { name: "Wraith Core", dropRate: 7.5 },
        { name: "Shadow Essence", dropRate: 3 }
      ]
    },
    "Remnant of Rust": {
      materials: [
        { name: "Rusted Metal", dropRate: 40 },
        { name: "Corroded Gear", dropRate: 20 },
        { name: "Control Core", dropRate: 7.5 },
        { name: "Metal Essence", dropRate: 2.5 }
      ]
    },
    "Ash Lizard": {
      gear: [{ w: 0.6, item: "Ashmaw Cleaver" }],
      materials: [
        { name: "Ash Scale", dropRate: 37.5 },
        { name: "Burnt Hide", dropRate: 20 },
        { name: "Fire Core", dropRate: 9 },
        { name: "Flame Essence", dropRate: 3 }
      ]
    },
    "Cinder Stalker": {
      gear: [{ w: 0.5, item: "Emberfang" }],
      materials: [
        { name: "Burning Fang", dropRate: 35 },
        { name: "Ember Fragment", dropRate: 20 },
        { name: "Assassin Core", dropRate: 7.5 },
        { name: "Fire Essence", dropRate: 2.5 }
      ]
    },
    "Ember Scuttler": {
      gear: [{ w: 0.45, item: "Ember Core Ring" }],
      materials: [
        { name: "Ember Core", dropRate: 37.5 },
        { name: "Heat Shell", dropRate: 20 },
        { name: "Control Core", dropRate: 7.5 },
        { name: "Fire Essence", dropRate: 2.5 }
      ]
    },
    "Magma Boar": {
      gear: [{ w: 0.4, item: "Magmahide Plate" }, { w: 0.35, item: "Lava Greaves" }],
      materials: [
        { name: "Magma Hide", dropRate: 40 },
        { name: "Lava Core", dropRate: 22.5 },
        { name: "Endurance Core", dropRate: 9 },
        { name: "Fire Essence", dropRate: 3 }
      ]
    },
    "Lava Basilisk": {
      gear: [{ w: 0.25, item: "Basilisk Eye Amulet" }, { w: 0.25, item: "Molten Gaze Ring" }],
      materials: [
        { name: "Basilisk Eye", dropRate: 35 },
        { name: "Molten Scale", dropRate: 20 },
        { name: "Control Core", dropRate: 7.5 },
        { name: "Fire Essence", dropRate: 3 }
      ]
    },
    "Glacier Turtoise": {
      gear: [{ w: 0.4, item: "Glacier Shell" }, { w: 0.35, item: "Icebound Boots" }],
      materials: [
        { name: "Frozen Shell", dropRate: 40 },
        { name: "Ice Plate", dropRate: 22.5 },
        { name: "Defense Core", dropRate: 9 },
        { name: "Ice Essence", dropRate: 3 }
      ]
    },
    "Frozen Stalker": {
      gear: [{ w: 0.3, item: "Frozen Edge" }],
      materials: [
        { name: "Ice Fang", dropRate: 35 },
        { name: "Frost Claw", dropRate: 20 },
        { name: "Assassin Core", dropRate: 7.5 },
        { name: "Ice Essence", dropRate: 2.5 }
      ]
    },
    "Frost Skitter": {
      gear: [{ w: 0.3, item: "Frozen Edge" }],
      materials: [
        { name: "Frost Thread", dropRate: 35 },
        { name: "Ice Fragment", dropRate: 20 },
        { name: "Control Core", dropRate: 7.5 },
        { name: "Ice Essence", dropRate: 2.5 }
      ]
    }
  };

  const resourceDropTable = {
    "Brinegullet Spitter": [{ name: "Fluid Sac", dropRate: 32.5 }],
    "Tide Hopper": [
      { name: "Ripple Core", dropRate: 30 },
      { name: "Residue", dropRate: 37.5, condition: "harvester" }
    ],
    Driftling: [{ name: "Residue", dropRate: 31, condition: "harvester" }],
    "Hermit Crab": [{ name: "Salt Flesh", dropRate: 34, condition: "skinner" }],
    "Coastal Horror": [{ name: "Abyss Residue", dropRate: 17, condition: "harvester" }],

    "Greenleaf Fox": [{ name: "Forest Fur", dropRate: 19, condition: "skinner" }],
    Gorilla: [
      { name: "Jungle Fiber", dropRate: 11, condition: "harvester" },
      { name: "Muscle Fiber", dropRate: 12, condition: "skinner" },
      { name: "Heavy Bone", dropRate: 11, condition: "extractor" },
      { name: "Reinforced Bone", dropRate: 5, condition: "extractor" }
    ],
    "Leafdart Squirrel": [
      { name: "Plant Fiber", dropRate: 20, condition: "harvester" },
      { name: "Seeds", dropRate: 22, condition: "harvester" }
    ],
    "Jungle Stag": [
      { name: "Growth Seed", dropRate: 13, condition: "harvester" },
      { name: "Spirit Seed", dropRate: 9, condition: "harvester" },
      { name: "Antler Piece", dropRate: 12, condition: "extractor" }
    ],
    "Barkhide Spriggan": [
      { name: "Living Fiber", dropRate: 15, condition: "harvester" },
      { name: "Ancient Seed", dropRate: 6, condition: "harvester" }
    ],
    "Burrow Hare": [{ name: "Root Fiber", dropRate: 26, condition: "harvester" }, { name: "Raw Hide", dropRate: 29, condition: "skinner" }],

    "Rock Lynx": [{ name: "Stone Claw", dropRate: 17, condition: "extractor" }],
    "Rock Serpent": [
      { name: "Stone Scale", dropRate: 15, condition: "skinner" },
      { name: "Earth Residue", dropRate: 12, condition: "harvester" },
      { name: "Petrify Gland", dropRate: 11 }
    ],
    "Rock Lizard": [{ name: "Stable Core", dropRate: 13, condition: "extractor" }],
    "Rock Ibex": [
      { name: "Cliff Moss", dropRate: 14, condition: "harvester" },
      { name: "Strength Core", dropRate: 13, condition: "extractor" }
    ],
    "Mirage Lurker": [{ name: "Distorted Core", dropRate: 17, condition: "extractor" }],
    "Stone Marmot": [
      { name: "Dense Bone", dropRate: 19, condition: "extractor" },
      { name: "Dense Fur", dropRate: 17, condition: "skinner" }
    ],

    "Tusk Boar": [{ name: "Boar Tusk", dropRate: 27.5 }, { name: "Tough Hide", dropRate: 20, condition: "skinner" }],
    "Dune Devourer": [{ name: "Devourer Tooth", dropRate: 24 }],
    "Dust Carver": [{ name: "Sand Residue", dropRate: 21, condition: "harvester" }],

    "Ash Lizard": [
      { name: "Ash Scale", dropRate: 12, condition: "skinner" },
      { name: "Burnt Hide", dropRate: 11, condition: "skinner" }
    ],
    "Ash Horror": [{ name: "Ash Residue", dropRate: 10, condition: "harvester" }],
    "Ember Scuttler": [{ name: "Ember Fragment", dropRate: 9, condition: "extractor" }],
    "Cinder Stalker": [{ name: "Ember Dust", dropRate: 8, condition: "harvester" }],
    "Magma Boar": [
      { name: "Fire Seed", dropRate: 7, condition: "harvester" },
      { name: "Magma Hide", dropRate: 8, condition: "skinner" },
      { name: "Lava Core", dropRate: 6, condition: "extractor" }
    ],
    "Lava Basilisk": [
      { name: "Molten Scale", dropRate: 5, condition: "skinner" },
      { name: "Petrify Gland", dropRate: 4 },
      { name: "Basilisk Eye", dropRate: 2 }
    ],

    "Glacier Turtoise": [{ name: "Frozen Shell", dropRate: 9 }],
    "Glacier Tortoise": [{ name: "Frozen Shell", dropRate: 9 }],
    "Frost Skitter": [{ name: "Chill Residue", dropRate: 5, condition: "harvester" }],

    "Faded War Wraith": [
      { name: "Shadow Residue", dropRate: 9, condition: "harvester" },
      { name: "Spirit Core", dropRate: 8, condition: "extractor" }
    ],
    "Remnant of Rust": [{ name: "Shadow Dust", dropRate: 10, condition: "harvester" }],

    "Winter Guardian": [{ name: "Titan Core", dropRate: 4.5, condition: "extractor" }],
    "Wavebreaker Idol": [{ name: "Titan Core", dropRate: 7, condition: "extractor" }]
  };

  Object.keys(resourceDropTable).forEach((monsterName) => {
    const additions = resourceDropTable[monsterName];
    if (!GAME_CONFIG.monsterDropTables[monsterName]) {
      GAME_CONFIG.monsterDropTables[monsterName] = { gear: [], materials: [] };
    }
    const table = GAME_CONFIG.monsterDropTables[monsterName];
    if (!Array.isArray(table.materials)) table.materials = [];
    additions.forEach((entry) => {
      if (!entry || typeof entry.name !== "string") return;
      const idx = table.materials.findIndex((m) => m && m.name === entry.name);
      const normalized = {
        name: entry.name,
        dropRate: entry.dropRate,
        condition: entry.condition || "none",
        perKill: true
      };
      if (idx >= 0) table.materials[idx] = { ...table.materials[idx], ...normalized };
      else table.materials.push(normalized);
    });
  });
})();
