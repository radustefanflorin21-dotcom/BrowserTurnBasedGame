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
      { name: "Abyss Flesh", dropRate: 65 },
      { name: "Dark Residue", dropRate: 40 },
      { name: "Abyss Core", dropRate: 12 },
      { name: "Deepwater Essence", dropRate: 5 }
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
        { name: "Wet Membrane", dropRate: 75 },
        { name: "Elastic Tendon", dropRate: 45 },
        { name: "Ripple Core", dropRate: 18 },
        { name: "Water Essence", dropRate: 6 }
      ]
    },
    "Hermit Crab": {
      gear: [{ w: 5, item: "Scaleguard Shirt" }],
      materials: [
        { name: "Hardened Shell", dropRate: 75 },
        { name: "Crust Fragment", dropRate: 45 },
        { name: "Defensive Core", dropRate: 15 },
        { name: "Ocean Essence", dropRate: 5 }
      ]
    },
    "Saltwind Skimmer": {
      gear: [{ w: 7, item: "Skimmer Blade" }],
      materials: [
        { name: "Sharp Fin", dropRate: 70 },
        { name: "Wind Scale", dropRate: 40 },
        { name: "Razor Edge Fragment", dropRate: 15 },
        { name: "Wind Essence", dropRate: 5 }
      ]
    },
    "Brinegullet Spitter": {
      materials: [
        { name: "Acid Gland", dropRate: 70 },
        { name: "Fluid Sac", dropRate: 45 },
        { name: "Corrosive Core", dropRate: 15 },
        { name: "Toxic Essence", dropRate: 6 }
      ]
    },
    "Wavebreaker Idol": {
      materials: [
        { name: "Stone Core", dropRate: 75 },
        { name: "Ancient Fragment", dropRate: 40 },
        { name: "Resonance Core", dropRate: 12 },
        { name: "Tidal Essence", dropRate: 5 }
      ]
    },
    "Tidemeld Revenant": {
      materials: [
        { name: "Bound Remains", dropRate: 65 },
        { name: "Soul Residue", dropRate: 40 },
        { name: "Revenant Core Material", dropRate: 15 },
        { name: "Spirit Essence", dropRate: 6 }
      ]
    },
    "Coastal Horror": coastalTide,
    "Tideharrow": {
      gear: coastalTide.gear,
      materials: [
        { name: "Tide Fragment", dropRate: 65 },
        { name: "Pressure Core", dropRate: 40 },
        { name: "Crushing Essence", dropRate: 12 },
        { name: "Abyssal Essence", dropRate: 5 }
      ]
    },
    "Burrow Hare": {
      gear: [{ w: 4, item: "Burrowstep Boots" }, { w: 3.5, item: "Earthpulse Amulet" }],
      materials: [
        { name: "Soft Fur", dropRate: 70 },
        { name: "Digging Claw", dropRate: 45 },
        { name: "Reflex Core", dropRate: 15 },
        { name: "Earth Essence", dropRate: 5 }
      ]
    },
    "Dust Carver": {
      gear: [{ w: 4, item: "Sandfang Blade" }],
      materials: [
        { name: "Razor Claw", dropRate: 65 },
        { name: "Sand Blade Fragment", dropRate: 40 },
        { name: "Precision Core", dropRate: 15 },
        { name: "Dust Essence", dropRate: 5 }
      ]
    },
    "Grass Snake": {
      materials: [
        { name: "Venom Sac", dropRate: 75 },
        { name: "Scaled Skin", dropRate: 45 },
        { name: "Toxic Core", dropRate: 18 },
        { name: "Poison Essence", dropRate: 6 }
      ]
    },
    "Plains Raptor": {
      materials: [
        { name: "Talon Fragment", dropRate: 75 },
        { name: "Bone Shard", dropRate: 40 },
        { name: "Predator Core", dropRate: 15 },
        { name: "Wild Essence", dropRate: 5 }
      ]
    },
    "Tusk Boar": {
      gear: [{ w: 2.5, item: "Boarhide Leggings" }],
      materials: [
        { name: "Thick Hide", dropRate: 80 },
        { name: "Boar Tusk", dropRate: 45 },
        { name: "Endurance Core", dropRate: 18 },
        { name: "Nature Essence", dropRate: 6 }
      ]
    },
    "Field Wolf": {
      gear: [{ w: 3, item: "Fang Dagger" }],
      materials: [
        { name: "Wolf Fang", dropRate: 75 },
        { name: "Fur Pelt", dropRate: 40 },
        { name: "Predator Instinct Core", dropRate: 18 },
        { name: "Blood Essence", dropRate: 6 }
      ]
    },
    "Desert Thornback Crawler": {
      materials: [
        { name: "Spiked Shell", dropRate: 75 },
        { name: "Carapace Fragment", dropRate: 45 },
        { name: "Defense Core", dropRate: 15 },
        { name: "Earth Essence", dropRate: 5 }
      ]
    },
    "Dune Devourer": {
      gear: [{ w: 2.8, item: "Devourer Axe" }],
      materials: [
        { name: "Devourer Tooth", dropRate: 70 },
        { name: "Sand Core", dropRate: 40 },
        { name: "Hunger Core", dropRate: 15 },
        { name: "Earth Essence", dropRate: 5 }
      ]
    },
    "Mirage Lurker": {
      gear: [{ w: 2.8, item: "Mirage Ring" }],
      materials: [
        { name: "Mirage Dust", dropRate: 65 },
        { name: "Illusion Thread", dropRate: 40 },
        { name: "Trickster Core", dropRate: 12 },
        { name: "Illusion Essence", dropRate: 5 }
      ]
    },
    "Witherling": {
      materials: [
        { name: "Withered Tissue", dropRate: 65 },
        { name: "Decay Fragment", dropRate: 40 },
        { name: "Decay Core", dropRate: 15 },
        { name: "Shadow Essence", dropRate: 6 }
      ]
    },
    "Stone Marmot": {
      gear: [{ w: 2.5, item: "Marmot Helm" }],
      materials: [
        { name: "Hardened Stone", dropRate: 80 },
        { name: "Dense Fur", dropRate: 40 },
        { name: "Bulwark Core", dropRate: 18 },
        { name: "Earth Essence", dropRate: 5 }
      ]
    },
    "Rock Lynx": {
      gear: [{ w: 2.3, item: "Lynx Fang" }],
      materials: [
        { name: "Sharp Fang", dropRate: 70 },
        { name: "Stone Claw", dropRate: 40 },
        { name: "Hunter Core", dropRate: 15 },
        { name: "Earth Essence", dropRate: 5 }
      ]
    },
    "Rock Ibex": {
      gear: [{ w: 2.2, item: "Hornbreaker Axe" }],
      materials: [
        { name: "Ibex Horn", dropRate: 75 },
        { name: "Muscle Fiber", dropRate: 40 },
        { name: "Strength Core", dropRate: 15 },
        { name: "Earth Essence", dropRate: 5 }
      ]
    },
    "Rock Serpent": {
      gear: [{ w: 2, item: "Petrify Ring" }, { w: 1.8, item: "Earthbind Amulet" }],
      materials: [
        { name: "Stone Scale", dropRate: 70 },
        { name: "Petrify Gland", dropRate: 45 },
        { name: "Control Core", dropRate: 15 },
        { name: "Earth Essence", dropRate: 5 }
      ]
    },
    "Rock Lizard": {
      gear: [{ w: 1.8, item: "Stonehide Armor" }],
      materials: [
        { name: "Thick Scale", dropRate: 75 },
        { name: "Stone Skin", dropRate: 40 },
        { name: "Defense Core", dropRate: 15 },
        { name: "Earth Essence", dropRate: 5 }
      ]
    },
    "Leafdart Squirrel": {
      materials: [
        { name: "Dart Spine", dropRate: 70 },
        { name: "Bark Fragment", dropRate: 40 },
        { name: "Agility Core", dropRate: 15 },
        { name: "Nature Essence", dropRate: 5 }
      ]
    },
    "Greenleaf Fox": {
      gear: [{ w: 1.3, item: "Foxfang Blade" }, { w: 1.2, item: "Swiftbrush Boots" }, { w: 1.2, item: "Greenleaf Vest" }],
      materials: [
        { name: "Fox Fang", dropRate: 75 },
        { name: "Forest Fur", dropRate: 40 },
        { name: "Assassin Core", dropRate: 18 },
        { name: "Nature Essence", dropRate: 6 }
      ]
    },
    "Gorilla": {
      materials: [
        { name: "Thick Bone", dropRate: 80 },
        { name: "Muscle Fiber", dropRate: 45 },
        { name: "Rage Core", dropRate: 18 },
        { name: "Primal Essence", dropRate: 6 }
      ]
    },
    "Jungle Stag": {
      gear: [],
      materials: [
        { name: "Antler Fragment", dropRate: 75 },
        { name: "Spirit Bark", dropRate: 40 },
        { name: "Support Core", dropRate: 15 },
        { name: "Nature Essence", dropRate: 6 }
      ]
    },
    "Faded War Wraith": {
      gear: [{ w: 0.9, item: "Wraithcall Scepter" }, { w: 0.8, item: "Soul Echo Amulet" }],
      materials: [
        { name: "Soul Fragment", dropRate: 65 },
        { name: "Shadow Residue", dropRate: 40 },
        { name: "Wraith Core", dropRate: 15 },
        { name: "Shadow Essence", dropRate: 6 }
      ]
    },
    "Remnant of Rust": {
      materials: [
        { name: "Rusted Metal", dropRate: 80 },
        { name: "Corroded Gear", dropRate: 40 },
        { name: "Control Core", dropRate: 15 },
        { name: "Metal Essence", dropRate: 5 }
      ]
    },
    "Ash Lizard": {
      gear: [{ w: 0.6, item: "Ashmaw Cleaver" }],
      materials: [
        { name: "Ash Scale", dropRate: 75 },
        { name: "Burnt Hide", dropRate: 40 },
        { name: "Fire Core", dropRate: 18 },
        { name: "Flame Essence", dropRate: 6 }
      ]
    },
    "Cinder Stalker": {
      gear: [{ w: 0.5, item: "Emberfang" }],
      materials: [
        { name: "Burning Fang", dropRate: 70 },
        { name: "Ember Fragment", dropRate: 40 },
        { name: "Assassin Core", dropRate: 15 },
        { name: "Fire Essence", dropRate: 5 }
      ]
    },
    "Ember Scuttler": {
      gear: [{ w: 0.45, item: "Ember Core Ring" }],
      materials: [
        { name: "Ember Core", dropRate: 75 },
        { name: "Heat Shell", dropRate: 40 },
        { name: "Control Core", dropRate: 15 },
        { name: "Fire Essence", dropRate: 5 }
      ]
    },
    "Magma Boar": {
      gear: [{ w: 0.4, item: "Magmahide Plate" }, { w: 0.35, item: "Lava Greaves" }],
      materials: [
        { name: "Magma Hide", dropRate: 80 },
        { name: "Lava Core", dropRate: 45 },
        { name: "Endurance Core", dropRate: 18 },
        { name: "Fire Essence", dropRate: 6 }
      ]
    },
    "Lava Basilisk": {
      gear: [{ w: 0.25, item: "Basilisk Eye Amulet" }, { w: 0.25, item: "Molten Gaze Ring" }],
      materials: [
        { name: "Basilisk Eye", dropRate: 70 },
        { name: "Molten Scale", dropRate: 40 },
        { name: "Control Core", dropRate: 15 },
        { name: "Fire Essence", dropRate: 6 }
      ]
    },
    "Glacier Turtoise": {
      gear: [{ w: 0.4, item: "Glacier Shell" }, { w: 0.35, item: "Icebound Boots" }],
      materials: [
        { name: "Frozen Shell", dropRate: 80 },
        { name: "Ice Plate", dropRate: 45 },
        { name: "Defense Core", dropRate: 18 },
        { name: "Ice Essence", dropRate: 6 }
      ]
    },
    "Frozen Stalker": {
      gear: [{ w: 0.3, item: "Frozen Edge" }, { w: 0.25, item: "Skitter Ring" }],
      materials: [
        { name: "Ice Fang", dropRate: 70 },
        { name: "Frost Claw", dropRate: 40 },
        { name: "Assassin Core", dropRate: 15 },
        { name: "Ice Essence", dropRate: 5 }
      ]
    },
    "Frost Skitter": {
      gear: [{ w: 0.3, item: "Frozen Edge" }, { w: 0.25, item: "Skitter Ring" }],
      materials: [
        { name: "Frost Thread", dropRate: 70 },
        { name: "Ice Fragment", dropRate: 40 },
        { name: "Control Core", dropRate: 15 },
        { name: "Ice Essence", dropRate: 5 }
      ]
    }
  };

  const resourceDropTable = {
    "Brinegullet Spitter": [{ name: "Fluid Sac", dropRate: 65 }],
    "Tide Hopper": [
      { name: "Ripple Core", dropRate: 60 },
      { name: "Residue", dropRate: 75, condition: "harvester" }
    ],
    Driftling: [{ name: "Residue", dropRate: 62, condition: "harvester" }],
    "Hermit Crab": [{ name: "Salt Flesh", dropRate: 68, condition: "skinner" }],
    "Coastal Horror": [{ name: "Abyss Residue", dropRate: 34, condition: "harvester" }],

    "Greenleaf Fox": [{ name: "Forest Fur", dropRate: 38, condition: "skinner" }],
    Gorilla: [
      { name: "Jungle Fiber", dropRate: 22, condition: "harvester" },
      { name: "Muscle Fiber", dropRate: 24, condition: "skinner" },
      { name: "Heavy Bone", dropRate: 22, condition: "extractor" },
      { name: "Reinforced Bone", dropRate: 10, condition: "extractor" }
    ],
    "Leafdart Squirrel": [
      { name: "Plant Fiber", dropRate: 40, condition: "harvester" },
      { name: "Seeds", dropRate: 44, condition: "harvester" }
    ],
    "Jungle Stag": [
      { name: "Growth Seed", dropRate: 26, condition: "harvester" },
      { name: "Spirit Seed", dropRate: 18, condition: "harvester" },
      { name: "Antler Piece", dropRate: 24, condition: "extractor" }
    ],
    "Barkhide Spriggan": [
      { name: "Living Fiber", dropRate: 30, condition: "harvester" },
      { name: "Ancient Seed", dropRate: 12, condition: "harvester" }
    ],
    "Burrow Hare": [{ name: "Root Fiber", dropRate: 52, condition: "harvester" }, { name: "Raw Hide", dropRate: 58, condition: "skinner" }],

    "Rock Lynx": [{ name: "Stone Claw", dropRate: 34, condition: "extractor" }],
    "Rock Serpent": [
      { name: "Stone Scale", dropRate: 30, condition: "skinner" },
      { name: "Earth Residue", dropRate: 24, condition: "harvester" },
      { name: "Petrify Gland", dropRate: 22 }
    ],
    "Rock Lizard": [{ name: "Stable Core", dropRate: 26, condition: "extractor" }],
    "Rock Ibex": [
      { name: "Cliff Moss", dropRate: 28, condition: "harvester" },
      { name: "Strength Core", dropRate: 26, condition: "extractor" }
    ],
    "Mirage Lurker": [{ name: "Distorted Core", dropRate: 34, condition: "extractor" }],
    "Stone Marmot": [
      { name: "Dense Bone", dropRate: 38, condition: "extractor" },
      { name: "Dense Fur", dropRate: 34, condition: "skinner" }
    ],

    "Tusk Boar": [{ name: "Boar Tusk", dropRate: 55 }, { name: "Tough Hide", dropRate: 40, condition: "skinner" }],
    "Dune Devourer": [{ name: "Devourer Tooth", dropRate: 48 }],
    "Dust Carver": [{ name: "Sand Residue", dropRate: 42, condition: "harvester" }],

    "Ash Lizard": [
      { name: "Ash Scale", dropRate: 24, condition: "skinner" },
      { name: "Burnt Hide", dropRate: 22, condition: "skinner" }
    ],
    "Ash Horror": [{ name: "Ash Residue", dropRate: 20, condition: "harvester" }],
    "Ember Scuttler": [{ name: "Ember Fragment", dropRate: 18, condition: "extractor" }],
    "Cinder Stalker": [{ name: "Ember Dust", dropRate: 16, condition: "harvester" }],
    "Magma Boar": [
      { name: "Fire Seed", dropRate: 14, condition: "harvester" },
      { name: "Magma Hide", dropRate: 16, condition: "skinner" },
      { name: "Lava Core", dropRate: 12, condition: "extractor" }
    ],
    "Lava Basilisk": [
      { name: "Molten Scale", dropRate: 10, condition: "skinner" },
      { name: "Petrify Gland", dropRate: 8 },
      { name: "Basilisk Eye", dropRate: 4 }
    ],

    "Glacier Turtoise": [{ name: "Frozen Shell", dropRate: 18 }],
    "Glacier Tortoise": [{ name: "Frozen Shell", dropRate: 18 }],
    "Frost Skitter": [{ name: "Chill Residue", dropRate: 10, condition: "harvester" }],

    "Faded War Wraith": [
      { name: "Shadow Residue", dropRate: 18, condition: "harvester" },
      { name: "Spirit Core", dropRate: 16, condition: "extractor" }
    ],
    "Remnant of Rust": [{ name: "Shadow Dust", dropRate: 20, condition: "harvester" }],

    "Winter Guardian": [{ name: "Titan Core", dropRate: 9, condition: "extractor" }],
    "Wavebreaker Idol": [{ name: "Titan Core", dropRate: 14, condition: "extractor" }]
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
