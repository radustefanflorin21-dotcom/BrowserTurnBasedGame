const GAME_CONFIG = {
  /**
   * Release baseline. v2.4: full asset baseline (biomes, world map textures, transitions, fonts); world map
   * without drawn biome boundary lines on the shared texture; grid export and M-key modal unchanged from v2.3.
   */
  version: "2.4",

  themes: {
    medieval: { label: "Medieval", sidebarTitle: "⚔ Medieval RPG" },
    scifi: { label: "Sci‑Fi", sidebarTitle: "◆ Nexus RPG" }
  },

  /**
   * Applied only when a brand-new character is created (new save / reset).
   * Each entry grants `count` copies of an item into starting inventory.
   */
  startingLoadout: [{ name: "Small Potion", count: 10 }],

  /**
   * Enemy art supports legacy `image`, state images (`images: { idle, walk, attack }`),
   * or sprite strips (`sprites: { idle|walk|attack: { sheet, frames, fps, loop?, cols?, rows? } }`).
   * For atlas layouts (e.g. 10 frames in 2 rows), set `cols` and `rows` (example: cols: 5, rows: 2).
   * Optional `spawnRarity`: "common" | "rare" | "epic" | "myth" | "ancient" — used with `enemySpawnRarityWeights`
   * when rolling mobs from a biome or region pool (see game.js). Omitted defaults to common.
   * Optional `combatScript`: id for scripted enemy turns (skills, cooldowns, AI); see game.js `enemyCombatRunScript`.
   * Optional `combatRole`: "tank" | "assassin" | "bruiser" | "mage" | "support" | "controller" | "summoner" — splits
   * level×statsPerLevel budget (see monsterScaling). If omitted, role is inferred from combatScript.
   * Loot/gold for monsters is configured in `monster_drop_tables.js` (`GAME_CONFIG.monsterDropTables`).
   */
  enemies: [
    {
      name: "Burrow Hare",
      combatScript: "burrow_hare",
      combatRole: "controller",
      spawnRarity: "common",
      image: "Assets/Monsters/burrow_hare.png",
      possibleLevels: [11, 12, 13, 14, 15],
      possibleMoods: ["cautious"]},
    {
      name: "Plains Raptor",
      combatScript: "plains_raptor",
      combatRole: "bruiser",
      spawnRarity: "common",
      image: "Assets/Monsters/plains_raptor.png",
      possibleLevels: [13, 14, 15, 16, 17],
      possibleMoods: ["focused"]},
    {
      name: "Grass Snake",
      combatScript: "grass_snake",
      combatRole: "mage",
      spawnRarity: "rare",
      image: "Assets/Monsters/grass_snake.png",
      possibleLevels: [15, 16, 17, 18, 19],
      possibleMoods: ["focused"]},
    {
      name: "Tusk Boar",
      combatScript: "tusk_boar",
      combatRole: "tank",
      spawnRarity: "epic",
      image: "Assets/Monsters/tusk_boar.png",
      possibleLevels: [17, 18, 19, 20],
      possibleMoods: ["steady"]},
    {
      name: "Field Wolf",
      combatScript: "field_wolf",
      combatRole: "assassin",
      spawnRarity: "epic",
      image: "Assets/Monsters/field_wolf.png",
      possibleLevels: [19, 20, 21],
      possibleMoods: ["berserk"]},
    {
      name: "Bramblehorn Matriarch",
      combatScript: "bramblehorn_matriarch",
      combatRole: "support",
      spawnRarity: "epic",
      image: "Assets/Biomes/Skin of Gaia/Rootwarren/bramblehorn_matriarch.png",
      possibleLevels: [20],
      possibleMoods: ["steady"]},
    {
      name: "Fangroot Alpha",
      combatScript: "fangroot_alpha",
      combatRole: "assassin",
      spawnRarity: "epic",
      image: "Assets/Biomes/Skin of Gaia/Rootwarren/fangroot_alpha.png",
      possibleLevels: [21],
      possibleMoods: ["berserk"]},
    {
      name: "Gaiahide Behemoth",
      combatScript: "gaiahide_behemoth",
      combatRole: "bruiser",
      spawnRarity: "myth",
      isBoss: true,
      image: "Assets/Biomes/Skin of Gaia/Rootwarren/gaiahide_behemoth.png",
      possibleLevels: [22],
      possibleMoods: ["berserk"]},
    {
      name: "Thornback Graveguard",
      combatScript: "thornback_graveguard",
      combatRole: "tank",
      spawnRarity: "epic",
      image: "Assets/Biomes/The misery of life/The Withered Maw/thornback_graveguard.png",
      possibleLevels: [20],
      possibleMoods: ["steady"],
      staminaPerTurn: 7,
      baseStats: { str: 24, dex: 11, vit: 59, int: 14 },
      baseHp: 705
    },
    {
      name: "Mirage Maw",
      combatScript: "mirage_maw",
      combatRole: "controller",
      spawnRarity: "epic",
      image: "Assets/Biomes/The misery of life/The Withered Maw/mirage_maw.png",
      possibleLevels: [21],
      possibleMoods: ["berserk"],
      staminaPerTurn: 7,
      baseStats: { str: 18, dex: 22, vit: 27, int: 45 },
      baseHp: 456
    },
    {
      name: "Mirage Remnant",
      combatScript: "mirage_remnant",
      combatRole: "controller",
      spawnRarity: "rare",
      image: "Assets/Biomes/The misery of life/The Withered Maw/mirage_remnant.png",
      possibleLevels: [18],
      possibleMoods: ["berserk"],
      staminaPerTurn: 6,
      baseStats: { str: 8, dex: 14, vit: 12, int: 28 },
      baseHp: 120
    },
    {
      name: "The Dune Mourner",
      combatScript: "dune_mourner",
      combatRole: "summoner",
      spawnRarity: "myth",
      isBoss: true,
      image: "Assets/Biomes/The misery of life/The Withered Maw/the_dune_mourner.png",
      possibleLevels: [22],
      possibleMoods: ["berserk"],
      staminaPerTurn: 8,
      baseStats: { str: 14, dex: 22, vit: 41, int: 59 },
      baseHp: 1888
    },
    {
      name: "Leafdart Squirrel",
      combatScript: "greenleaf_squirrel",
      combatRole: "harasser",
      spawnRarity: "common",
      image: "Assets/Monsters/leafdart_squirrel.png",
      possibleLevels: [31, 32, 33, 34, 35],
      possibleMoods: ["berserk"]},
    {
      name: "Canopy Screecher",
      combatScript: "greenleaf_parrot",
      combatRole: "buffer",
      spawnRarity: "common",
      image: "Assets/Monsters/canopy_screecher.png",
      possibleLevels: [33, 34, 35, 36, 37],
      possibleMoods: ["berserk"]},
    {
      name: "Greenleaf Fox",
      combatScript: "greenleaf_fox",
      combatRole: "assassin",
      spawnRarity: "rare",
      image: "Assets/Monsters/greenleaf_fox.png",
      possibleLevels: [35, 36, 37, 38, 39],
      possibleMoods: ["berserk"]},
    {
      name: "Jungle Stag",
      combatScript: "greenleaf_stag",
      combatRole: "support",
      spawnRarity: "rare",
      image: "Assets/Monsters/jungle_stag.png",
      possibleLevels: [37, 38, 39, 40],
      possibleMoods: ["berserk"]},
    {
      name: "Gorilla",
      combatScript: "gorilla",
      combatRole: "bruiser",
      spawnRarity: "epic",
      image: "Assets/Monsters/greenleaf_gorilla.png",
      possibleLevels: [39, 40, 41, 42],
      possibleMoods: ["berserk"]},
    {
      name: "Stone Marmot",
      combatScript: "stone_marmot",
      combatRole: "tank",
      spawnRarity: "common",
      image: "Assets/Monsters/stone_marmot.png",
      possibleLevels: [21, 22, 23, 24, 25],
      possibleMoods: ["berserk"]},
    {
      name: "Rock Lynx",
      combatScript: "rock_lynx",
      combatRole: "assassin",
      spawnRarity: "common",
      image: "Assets/Monsters/rock_lynx.png",
      possibleLevels: [23, 24, 25, 26, 27],
      possibleMoods: ["berserk"]},
    {
      name: "Rock Ibex",
      combatScript: "rock_ibex",
      combatRole: "bruiser",
      spawnRarity: "rare",
      image: "Assets/Monsters/rock_ibex.png",
      possibleLevels: [25, 26, 27, 28, 29],
      possibleMoods: ["berserk"]},
    {
      name: "Rock Serpent",
      combatScript: "rock_serpent",
      combatRole: "controller",
      spawnRarity: "epic",
      image: "Assets/Monsters/rock_serpent.png",
      possibleLevels: [27, 28, 29, 30],
      possibleMoods: ["berserk"]},
    {
      name: "Rock Lizard",
      combatScript: "rock_lizard",
      combatRole: "tank",
      spawnRarity: "epic",
      image: "Assets/Monsters/rock_lizard.png",
      possibleLevels: [29, 30, 31],
      possibleMoods: ["berserk"]},
    {
      name: "Petrified Coilwarden",
      combatScript: "petrified_coilwarden",
      combatRole: "controller",
      spawnRarity: "epic",
      image: "Assets/Biomes/The held breath/The Stonevein Sanctum/petrified_coilwarden.png",
      possibleLevels: [30],
      possibleMoods: ["steady"],
      staminaPerTurn: 7,
      baseStats: { str: 41, dex: 51, vit: 61, int: 102 },
      baseHp: 729
    },
    {
      name: "Granitehorn Breaker",
      combatScript: "granitehorn_breaker",
      combatRole: "bruiser",
      spawnRarity: "epic",
      image: "Assets/Biomes/The held breath/The Stonevein Sanctum/granitehorn_breaker.png",
      possibleLevels: [31],
      possibleMoods: ["berserk"],
      staminaPerTurn: 7,
      baseStats: { str: 65, dex: 28, vit: 46, int: 15 },
      baseHp: 739
    },
    {
      name: "The Held Colossus",
      combatScript: "held_colossus",
      combatRole: "bruiser",
      spawnRarity: "myth",
      isBoss: true,
      image: "Assets/Biomes/The held breath/The Stonevein Sanctum/the_held_colossus.png",
      possibleLevels: [32],
      possibleMoods: ["berserk"],
      staminaPerTurn: 8,
      baseStats: { str: 67, dex: 29, vit: 88, int: 21 },
      baseHp: 2544
    },
    {
      name: "Ash Lizard",
      combatScript: "ash_lizard",
      combatRole: "bruiser",
      spawnRarity: "common",
      image: "Assets/Monsters/ash_lizard.png",
      possibleLevels: [41, 42, 43, 44, 45],
      possibleMoods: ["berserk"]},
    {
      name: "Cinder Stalker",
      combatScript: "cinder_stalker",
      combatRole: "assassin",
      spawnRarity: "common",
      image: "Assets/Monsters/cinder_stalker.png",
      possibleLevels: [43, 44, 45, 46, 47],
      possibleMoods: ["berserk"]},
    {
      name: "Ember Scuttler",
      combatScript: "ember_scuttler",
      combatRole: "controller",
      spawnRarity: "rare",
      image: "Assets/Monsters/ember_scuttler.png",
      possibleLevels: [45, 46, 47, 48, 49],
      possibleMoods: ["berserk"]},
    {
      name: "Magma Boar",
      combatScript: "magma_boar",
      combatRole: "bruiser",
      spawnRarity: "epic",
      image: "Assets/Monsters/magma_boar.png",
      possibleLevels: [47, 48, 49, 50],
      possibleMoods: ["berserk"]},
    {
      name: "Lava Basilisk",
      combatScript: "lava_basilisk",
      combatRole: "controller",
      spawnRarity: "epic",
      image: "Assets/Monsters/lava_basilisk.png",
      possibleLevels: [49, 50, 51, 52, 53],
      possibleMoods: ["berserk"]},
    {
      name: "Icy Mink",
      combatScript: "icy_mink",
      combatRole: "assassin",
      spawnRarity: "common",
      image: "Assets/Monsters/icy_mink.png",
      possibleLevels: [41, 42, 43, 44, 45],
      possibleMoods: ["berserk"]},
    {
      name: "Icy Serpent",
      combatScript: "icy_serpent",
      combatRole: "mage",
      spawnRarity: "common",
      image: "Assets/Monsters/icy_serpent.png",
      possibleLevels: [43, 44, 45, 46, 47],
      possibleMoods: ["berserk"]},
    {
      name: "Glacier Turtoise",
      combatScript: "glacier_turtoise",
      combatRole: "tank",
      spawnRarity: "rare",
      image: "Assets/Monsters/glacier_turtoise.png",
      possibleLevels: [45, 46, 47, 48, 49],
      possibleMoods: ["berserk"]},
    {
      name: "Frozen Stalker",
      combatScript: "frozen_stalker",
      combatRole: "assassin",
      spawnRarity: "epic",
      image: "Assets/Monsters/frozen_stalker.png",
      possibleLevels: [47, 48, 49, 50],
      possibleMoods: ["berserk"]},
    {
      name: "Frost Skitter",
      combatScript: "frost_skitter",
      combatRole: "controller",
      spawnRarity: "myth",
      image: "Assets/Monsters/frost_skitter.png",
      possibleLevels: [49, 50, 51, 52, 53],
      possibleMoods: ["berserk"]},  
    {
      name: "Pinebound Fawn",
      combatScript: "pinebound_fawn",
      combatRole: "support",
      spawnRarity: "common",
      image: "Assets/Monsters/pinebound_fawn.png",
      possibleLevels: [21, 22, 23, 24, 25],
      possibleMoods: ["berserk"]},
    {
      name: "Frozen Pinecone",
      combatScript: "frozen_pinecone",
      combatRole: "controller",
      spawnRarity: "common",
      image: "Assets/Monsters/frozen_pinecone.png",
      possibleLevels: [23, 24, 25, 26, 27],
      possibleMoods: ["berserk"]},
    {
      name: "Ice-Tusked Boar",
      combatScript: "ice_tusked_boar",
      combatRole: "tank",
      spawnRarity: "rare",
      image: "Assets/Monsters/ice_tusked_boar.png",
      possibleLevels: [25, 26, 27, 28, 29],
      possibleMoods: ["berserk"]},
    {
      name: "Barkhide Spriggan",
      combatScript: "barkhide_spriggan",
      combatRole: "support",
      spawnRarity: "epic",
      image: "Assets/Monsters/barkhide_spriggan.png",
      possibleLevels: [27, 28, 29, 30],
      possibleMoods: ["berserk"]},
    {
      name: "Winter Guardian",
      combatScript: "winter_guardian",
      combatRole: "tank",
      spawnRarity: "epic",
      image: "Assets/Monsters/winter_guardian.png",
      possibleLevels: [29, 30, 31],
      possibleMoods: ["berserk"]},
    {
      name: "Whitebark Matron",
      combatScript: "whitebark_matron",
      combatRole: "support",
      spawnRarity: "epic",
      image: "Assets/Biomes/Innocence of North/The Frostroot Nursery/whitebark_matron.png",
      possibleLevels: [30],
      possibleMoods: ["steady"],
      staminaPerTurn: 7,
      baseStats: { str: 26, dex: 47, vit: 84, int: 105 },
      baseHp: 729
    },
    {
      name: "Frosthorn Bulwark",
      combatScript: "frosthorn_bulwark",
      combatRole: "tank",
      spawnRarity: "epic",
      image: "Assets/Biomes/Innocence of North/The Frostroot Nursery/frosthorn_bulwark.png",
      possibleLevels: [31],
      possibleMoods: ["berserk"],
      staminaPerTurn: 7,
      baseStats: { str: 34, dex: 16, vit: 86, int: 20 },
      baseHp: 1024
    },
    {
      name: "The Sleeping Child of Winter",
      combatScript: "sleeping_child_of_winter",
      combatRole: "support",
      spawnRarity: "myth",
      isBoss: true,
      image: "Assets/Biomes/Innocence of North/The Frostroot Nursery/the_sleeping_child_of_winter.png",
      possibleLevels: [32],
      possibleMoods: ["steady"],
      staminaPerTurn: 8,
      baseStats: { str: 34, dex: 61, vit: 109, int: 136 },
      baseHp: 2544
    },
    {
      name: "Frostroot Seedling",
      combatScript: "frostroot_seedling",
      combatRole: "support",
      spawnRarity: "rare",
      image: "Assets/Biomes/Innocence of North/The Frostroot Nursery/frostroot_seedling.png",
      possibleLevels: [26],
      possibleMoods: ["steady"],
      staminaPerTurn: 6,
      baseStats: { str: 8, dex: 18, vit: 24, int: 30 },
      baseHp: 180
    },
    {
      name: "Dust Carver",
      combatScript: "dust_carver",
      combatRole: "assassin",
      spawnRarity: "common",
      image: "Assets/Monsters/dust_carver.png",
      possibleLevels: [11, 12, 13, 14, 15],
      possibleMoods: ["berserk"]}, 
    {
      name: "Desert Thornback Crawler",
      combatScript: "desert_thornback_crawler",
      combatRole: "tank",
      spawnRarity: "rare",
      image: "Assets/Monsters/desert_thornback_crawler.png",
      possibleLevels: [15, 16, 17, 18, 19],
      possibleMoods: ["berserk"]},
    {
      name: "Mirage Lurker",
      combatScript: "mirage_lurker",
      combatRole: "controller",
      spawnRarity: "epic",
      image: "Assets/Monsters/mirage_lurker.png",
      possibleLevels: [17, 18, 19, 20],
      possibleMoods: ["berserk"]},
    {
      name: "Dune Devourer",
      combatScript: "dune_devourer",
      combatRole: "bruiser",
      spawnRarity: "epic",
      image: "Assets/Monsters/dune_devourer.png",
      possibleLevels: [19, 20, 21],
      possibleMoods: ["berserk"]},
    {
      name: "Witherling",
      combatScript: "witherling",
      combatRole: "mage",
      spawnRarity: "common",
      image: "Assets/Monsters/witherling.png",
      possibleLevels: [13, 14, 15, 16, 17],
      possibleMoods: ["berserk"]},
    {
      name: "Remnant of Rust",
      combatScript: "remnant_of_rust",
      combatRole: "controller",
      spawnRarity: "epic",
      image: "Assets/Monsters/remnant_of_rust.png",
      possibleLevels: [37, 38, 39, 40],
      possibleMoods: ["berserk"]},
    {
      name: "Faded War Wraith",
      combatScript: "faded_war_wraith",
      combatRole: "summoner",
      spawnRarity: "epic",
      image: "Assets/Monsters/faded_war_wraith.png",
      possibleLevels: [39, 40, 41, 42],
      possibleMoods: ["berserk"]},
    {
      name: "Ash Horror",
      combatScript: "ash_horror",
      combatRole: "mage",
      spawnRarity: "common",
      image: "Assets/Monsters/ash_horror.png",
      possibleLevels: [31, 32, 33, 34, 35],
      possibleMoods: ["berserk"]},
    {
      name: "Cinder Husk",
      combatScript: "cinder_husk",
      combatRole: "tank",
      spawnRarity: "common",
      image: "Assets/Monsters/cinder_husk.png",
      possibleLevels: [33, 34, 35, 36, 37],
      possibleMoods: ["berserk"]},
    {
      name: "Ash Skulker",
      combatScript: "ash_skulker",
      combatRole: "assassin",
      spawnRarity: "rare",
      image: "Assets/Monsters/ash_skulker.png",
      possibleLevels: [35, 36, 37, 38, 39],
      possibleMoods: ["berserk"]},
    {
      name: "Tide Hopper",
      combatScript: "tide_hopper",
      combatRole: "controller",
      spawnRarity: "common",
      image: "Assets/Monsters/tide_hopper.png",
      possibleLevels: [1, 2, 3, 4, 5],
      possibleMoods: ["berserk"]},
    {
      name: "Hermit Crab",
      combatScript: "hermit_crab",
      combatRole: "tank",
      spawnRarity: "common",
      image: "Assets/Monsters/hermit_crab.png",
      possibleLevels: [3, 4, 5, 6, 7],
      possibleMoods: ["berserk"]},
    {
      name: "Driftling",
      combatScript: "driftling",
      combatRole: "support",
      spawnRarity: "rare",
      image: "Assets/Monsters/driftling.png",
      possibleLevels: [5, 6, 7, 8, 9],
      possibleMoods: ["berserk"]},
    {
      name: "Tidemeld Revenant",
      combatScript: "tidemeld_revenant",
      combatRole: "summoner",
      spawnRarity: "epic",
      image: "Assets/Monsters/tidemeld_revenant.png",
      possibleLevels: [7, 8, 9, 10],
      possibleMoods: ["berserk"]},
    {
      name: "Coastal Horror",
      combatScript: "coastal_horror",
      combatRole: "controller",
      spawnRarity: "epic",
      image: "Assets/Monsters/coastal_horror.png",
      possibleLevels: [9, 10, 11],
      possibleMoods: ["berserk"]},
    {
      name: "Tidebound Crusher",
      combatScript: "tidebound_crusher",
      combatRole: "bruiser",
      spawnRarity: "epic",
      image: "Assets/Biomes/Paradise South/Sunken Grotto/tidebound_crusher.png",
      possibleLevels: [14],
      possibleMoods: ["berserk"],
      statBudgetMultiplier: 1.1
    },
    {
      name: "Drowned Channeler",
      combatScript: "drowned_channeler",
      combatRole: "controller",
      spawnRarity: "epic",
      image: "Assets/Biomes/Paradise South/Sunken Grotto/drowned_channeler.png",
      possibleLevels: [13],
      possibleMoods: ["berserk"],
      statBudgetMultiplier: 1.1
    },
    {
      name: "Tidemother Aberration",
      combatScript: "tidemother_aberration",
      combatRole: "summoner",
      spawnRarity: "epic",
      image: "Assets/Biomes/Paradise South/Sunken Grotto/tidemother_aberraiton.png",
      possibleLevels: [15],
      possibleMoods: ["berserk"],
      statBudgetMultiplier: 1.1
    },
    {
      name: "Tide Echo",
      combatScript: "tide_hopper",
      combatRole: "controller",
      spawnRarity: "rare",
      image: "Assets/Monsters/tide_echo.png",
      possibleLevels: [6],
      possibleMoods: ["berserk"]},
    {
      name: "Storm Echo",
      combatRole: "controller",
      spawnRarity: "rare",
      image: "Assets/Monsters/tide_echo.png",
      possibleLevels: [13, 14, 15],
      possibleMoods: ["berserk"]},
    {
      name: "Stormfang Ravager",
      combatScript: "stormfang_ravager",
      combatRole: "bruiser",
      spawnRarity: "epic",
      image: "Assets/Biomes/Paradise North/Stormbreak Hollow/stormfang_ravager.png",
      possibleLevels: [14],
      possibleMoods: ["berserk"],
      baseStats: { str: 42, dex: 48, vit: 30, int: 18 },
      baseHp: 420
    },
    {
      name: "Abyssal Tempest Caller",
      combatScript: "abyssal_tempest_caller",
      combatRole: "controller",
      spawnRarity: "epic",
      image: "Assets/Biomes/Paradise North/Stormbreak Hollow/abyssal_tempest_caller.png",
      possibleLevels: [13],
      possibleMoods: ["berserk"],
      baseStats: { str: 12, dex: 26, vit: 34, int: 52 },
      baseHp: 390
    },
    {
      name: "The Stormwake Leviathan",
      combatScript: "stormwake_leviathan",
      combatRole: "bruiser",
      spawnRarity: "myth",
      image: "Assets/Biomes/Paradise North/Stormbreak Hollow/the_stormwake_leviathan.png",
      possibleLevels: [15],
      possibleMoods: ["berserk"],
      baseStats: { str: 58, dex: 40, vit: 65, int: 48 },
      baseHp: 1400
    },
    {
      name: "Saltwind Skimmer",
      combatScript: "saltwind_skimmer",
      combatRole: "assassin",
      spawnRarity: "common",
      image: "Assets/Monsters/saltwind_skimmer.png",
      possibleLevels: [1, 2, 3, 4, 5],
      possibleMoods: ["berserk"]},
    {
      name: "Brinegullet Spitter",
      combatScript: "brinegullet_spitter",
      combatRole: "mage",
      spawnRarity: "common",
      image: "Assets/Monsters/brinegullet_spitter.png",
      possibleLevels: [3, 4, 5, 6, 7],
      possibleMoods: ["berserk"]},
    {
      name: "Wavebreaker Idol",
      combatScript: "wavebreaker_idol",
      combatRole: "tank",
      spawnRarity: "rare",
      image: "Assets/Monsters/wavebreaker_idol.png",
      possibleLevels: [5, 6, 7, 8, 9],
      possibleMoods: ["berserk"]},
    {
      name: "Cliff Lurker",
      combatScript: "cliff_lurker",
      combatRole: "assassin",
      spawnRarity: "epic",
      image: "Assets/Monsters/cliff_lurker.png",
      possibleLevels: [7, 8, 9, 10],
      possibleMoods: ["berserk"]},
    {
      name: "Tideharrow",
      combatScript: "tideharrow",
      combatRole: "controller",
      spawnRarity: "epic",
      image: "Assets/Monsters/tideharrow.png",
      possibleLevels: [9, 10, 11],
      possibleMoods: ["berserk"]}
  ],

  /**
   * Relative weights for picking a spawn tier before choosing a monster in the biome/region pool.
   * Values need not sum to 100; they are normalized. Default matches intended ratios 70:20:10:5:1 (common→ancient).
   */
  enemySpawnRarityWeights: {
    common: 70,
    rare: 20,
    epic: 10,
    myth: 5,
    ancient: 1
  },

  /**
   * Character leveling: `xpToNextLevel(L) = max(1, round(xpConst + L*xpLinear + L²*xpSquare + L³*xpCubic))`.
   * Default: 250 + 55L + 10L² + 0.35L³. At `maxLevel`, further XP is banked but does not increase level.
   */
  leveling: {
    maxLevel: 60,
    xpConst: 250,
    xpLinear: 55,
    xpSquare: 10,
    xpCubic: 0.35,
    /**
     * Rank upgrade step from each skill's catalog `unlock` level (unlock levels unchanged in catalog).
     * Unlock 1–10 → +5/ rank, 11–20 → +4, 21–30 → +3, 31–40 → +2, 41–55 → +1, 56–60 → +0.
     */
    skillRankStepByUnlockLevel: [
      { maxUnlockLevel: 10, step: 5 },
      { maxUnlockLevel: 20, step: 4 },
      { maxUnlockLevel: 30, step: 3 },
      { maxUnlockLevel: 40, step: 2 },
      { maxUnlockLevel: 55, step: 1 },
      { maxUnlockLevel: 60, step: 0 }
    ]
  },

  /**
   * Kill XP (Dofus-style): per-foe `round((8 + L*2.2 + L²*0.045) * rarityOrBossMult * moodMult)` summed;
   * each participant gets `round(totalMonsterXP * playerLevelPenalty)` (full kill total, not split).
   * `playerLevelPenalty` uses avgEnemyLevel / participantLevel (symmetric: over- or under-leveled fighters earn less).
   * Boss foes use `isBoss: true` on dungeon room entries or enemy defs — boss mult only (no spawnRarity mult).
   */
  /** Combat card overlay sprites (transparent PNGs under Assets/UI/effects/). */
  combatFx: {
    basePath: "Assets/UI/effects",
    physical: "physical.png",
    magic: "magic.png",
    heal: "heal.png",
    bleed: "bleed.png",
    poison: "poison.png",
    burn: "burn.png",
    stun: "stun.png"
  },

  victoryXp: {
    bossMultiplier: 4,
    rarityMultipliers: {
      common: 1,
      rare: 1.5,
      epic: 2.4,
      myth: 3,
      ancient: 5
    },
    partyMultipliers: {
      1: 1,
      2: 1.12,
      3: 1.25,
      4: 1.38,
      5: 1.48,
      6: 1.56,
      7: 1.63,
      8: 1.7
    }
  },

  /**
   * Monster characteristics and combat scaling.
   * Stat budget: round((6 + level * 4) * rarityStatBudgetMultipliers[tier] * optional per-def statBudgetMultiplier).
   * HP: round((level * 10 + VIT * 4) * rarityHpMultipliers[tier]); then × region enemyScale × mood hpMult (see buildSpawnedFoe).
   * Role stat split uses `enemyRoles` weights with rounding correction to the role main stat (see game.js).
   */
  monsterScaling: {
    /** Applied inside the stat budget formula (see computeMonsterStatBudget in game.js). */
    rarityStatBudgetMultipliers: {
      common: 1.0,
      rare: 1.15,
      epic: 1.35,
      myth: 1.8,
      ancient: 2.05
    },
    /** @deprecated Use rarityStatBudgetMultipliers; kept as alias for older tooling reads. */
    rarityDifficultyModifiers: {
      common: 1.0,
      rare: 1.15,
      epic: 1.35,
      myth: 1.8,
      ancient: 2.05
    },
    rarityHpMultipliers: {
      common: 1.0,
      rare: 1.08,
      epic: 1.22,
      myth: 1.45,
      ancient: 1.65
    },
    foeStaminaByRarity: {
      common: 6,
      rare: 7,
      epic: 7,
      myth: 8,
      ancient: 9
    },
    attackLevelBasePerLevel: 3.4,
    basicAttackGlobalMultiplier: 1.18,
    physicalAtkStrCoeff: 0.62,
    physicalAtkIntCoeff: 0.22,
    physicalAtkDexCoeff: 0.14,
    magicalAtkIntCoeff: 0.62,
    magicalAtkStrCoeff: 0.22,
    magicalAtkDexCoeff: 0.08,
    hybridAtkStrCoeff: 0.44,
    hybridAtkIntCoeff: 0.44,
    hybridAtkDexCoeff: 0.11,
    skillDamageLevelCoeff: 0.032,
    raritySkillDamageMultipliers: {
      common: 1.0,
      rare: 1.14,
      epic: 1.28,
      myth: 1.45,
      ancient: 1.62
    },
    damageStrCoeff: 0.022,
    dotIntCoeff: 0.02,
    effectIntCoeff: 0.02,
    enemyCritBasePct: 5,
    enemyCritPerDexPct: 0.2,
    enemyCritDamageMult: 1.5,
    evadeDexCoeff: 0.15,
    vitDamageReductionPerPoint: 0.01,
    vitDamageReductionCapPct: 45,
    thickHideBase: 0.25,
    thickHidePerVit: 0.002,
    thickHideReductionCap: 0.65,
    packHowlBase: 0.2,
    packHowlPerInt: 0.003
  },

  /** Weights sum to 1. Keys: tank | bruiser | assassin | mage | controller | support | summoner | harasser | buffer. */
  enemyRoles: {
    tank: { STR: 0.18, DEX: 0.1, VIT: 0.55, INT: 0.17 },
    bruiser: { STR: 0.42, DEX: 0.18, VIT: 0.32, INT: 0.08 },
    assassin: { STR: 0.22, DEX: 0.5, VIT: 0.16, INT: 0.12 },
    mage: { STR: 0.08, DEX: 0.15, VIT: 0.18, INT: 0.59 },
    controller: { STR: 0.14, DEX: 0.24, VIT: 0.24, INT: 0.38 },
    support: { STR: 0.1, DEX: 0.18, VIT: 0.32, INT: 0.4 },
    summoner: { STR: 0.08, DEX: 0.18, VIT: 0.3, INT: 0.44 },
    harasser: { STR: 0.18, DEX: 0.42, VIT: 0.2, INT: 0.2 },
    buffer: { STR: 0.08, DEX: 0.2, VIT: 0.28, INT: 0.44 }
  },

  items: {
    "Wet Membrane": {
      type: "resource",
      image: "Assets/Resources/wet_membrane.png",
      description: "Slick tissue from a tide creature. Used in water-themed crafts.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Hardened Shell": {
      type: "resource",
      image: "Assets/Resources/hardened_shell.png",
      description: "Crab or turtle shell fragments. Tough crafting material.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Sharp Fin": {
      type: "resource",
      image: "Assets/Resources/sharp_fin.png",
      description: "A razor-edged fin suitable for blades.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Wind Essence": {
      type: "resource",
      image: "Assets/Resources/wind_essence.png",
      description: "Captured coastal gusts in solid form.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Acid Gland": {
      type: "resource",
      image: "Assets/Resources/acid_gland.png",
      description: "Volatile organ matter. Handle carefully.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Stone Core": {
      type: "resource",
      image: "Assets/Resources/stone_core.png",
      description: "Dense mineral heart from a stone guardian.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Soul Fragment": {
      type: "resource",
      image: "Assets/Resources/soul_fragment.png",
      description: "A shard of unstable soul-stuff.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Soft Fur": {
      type: "resource",
      image: "Assets/Resources/soft_fur.png",
      description: "Fine fur from a burrowing beast.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Earth Essence": {
      type: "resource",
      image: "Assets/Resources/earth_essence.png",
      description: "Loam-rich essence for earth crafts.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Razor Claw": {
      type: "resource",
      image: "Assets/Resources/razor_claw.png",
      description: "A sharpened claw fragment.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Venom Sac": {
      type: "resource",
      image: "Assets/Resources/venom_sac.png",
      description: "Still-toxic tissue from a serpent.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Bone Fragment": {
      type: "resource",
      image: "Assets/Resources/bone_fragment.png",
      description: "Splintered bone suitable for glue or charms.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Thick Hide": {
      type: "resource",
      image: "Assets/Resources/thick_hide.png",
      description: "Boar hide strips. Armor lining material.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Wolf Fang": {
      type: "resource",
      image: "Assets/Resources/wolf_fang.png",
      description: "A long canine from a field wolf.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Blood Essence": {
      type: "resource",
      image: "Assets/Resources/blood_essence.png",
      description: "Crimson essence distilled from a fresh kill.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Spiked Shell": {
      type: "resource",
      image: "Assets/Resources/spiked_shell.png",
      description: "Barbed shell plates from a thornback.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Sand Core": {
      type: "resource",
      image: "Assets/Resources/sand_core.png",
      description: "Glassy sand fused into a solid core.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Mirage Dust": {
      type: "resource",
      image: "Assets/Resources/mirage_dust.png",
      description: "Shimmering dust that never settles.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Decay Core": {
      type: "resource",
      image: "Assets/Resources/decay_core.png",
      description: "Rotting magical nucleus from a witherling.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Hardened Stone": {
      type: "resource",
      image: "Assets/Resources/hardened_stone.png",
      description: "Stone marmot hoard quality rock.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Sharp Fang": {
      type: "resource",
      image: "Assets/Resources/sharp_fang.png",
      description: "A predator fang in good condition.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Predator Core": {
      type: "resource",
      image: "Assets/Resources/predator_core.png",
      description: "Dense essence of the hunt.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Ibex Horn": {
      type: "resource",
      image: "Assets/Resources/ibex_horn.png",
      description: "A spiraled horn segment.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Dart Spine": {
      type: "resource",
      image: "Assets/Resources/dart_spine.png",
      description: "Needle spines from a dart squirrel.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Nature Essence": {
      type: "resource",
      image: "Assets/Resources/nature_essence.png",
      description: "Green-tinted essence of the canopy.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Fox Fang": {
      type: "resource",
      image: "Assets/Resources/fox_fang.png",
      description: "A polished fang from a greenleaf fox.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Thick Bone": {
      type: "resource",
      image: "Assets/Resources/thick_bone.png",
      description: "Dense gorilla bone matter.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Rage Core": {
      type: "resource",
      image: "Assets/Resources/rage_core.png",
      description: "Hot, unstable core of fury.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Burning Fang": {
      type: "resource",
      image: "Assets/Resources/burning_fang.png",
      description: "A charred fang imbued with ember heat.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Fire Essence": {
      type: "resource",
      image: "Assets/Resources/fire_essence.png",
      description: "Volatile essence of open flame.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Ember Core": {
      type: "resource",
      image: "Assets/Resources/ember_core.png",
      description: "Slow-burning magical ember.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Ice Plate": {
      type: "resource",
      image: "Assets/Resources/ice_plate.png",
      description: "Layered ice as hard as steel.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Ice Fang": {
      type: "resource",
      image: "Assets/Resources/ice_fang.png",
      description: "Serrated ice tooth from a stalker.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Small Potion": {
      type: "consumable",
      effect: "heal",
      value: 40,
      image: "Assets/Resources/small-potion.svg",
      description: "Red liquid in a glass vial. Drink to mend wounds.",
      bonusSkills: [],
      bonusStats: {},
      useHint: "Click to use in inventory."
    },
    "Large Potion": {
      type: "consumable",
      effect: "heal",
      value: 80,
      image: "Assets/Resources/large-potion.svg",
      description: "A larger dose of the same restorative brew.",
      bonusSkills: [],
      bonusStats: {},
      useHint: "Click to use in inventory."
    },
    "Sunken Grotto Key": {
      type: "resource",
      category: "key",
      image: "Assets/Resources/sunken_grotto_key.png",
      description: "A salt-crusted key for the dig Hollis opened by the shore.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Stormbreak Hollow Key": {
      type: "resource",
      category: "key",
      image: "Assets/Resources/sunken_grotto_key.png",
      description: "A storm-scored dungeon key for the sealed entrance beneath the northern cliffs.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Rootwarren Key": {
      type: "resource",
      category: "key",
      image: "Assets/Resources/rootwaren_key.png",
      description: "A root-choked key for the warren beneath the Skin of Gaia.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Withered Maw Key": {
      type: "resource",
      category: "key",
      image: "Assets/Resources/withered_maw_key.png",
      description: "A sand-scored key for the sinkhole known as The Withered Maw.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Stonevein Key": {
      type: "resource",
      category: "key",
      image: "Assets/Resources/stonevein_key.png",
      description: "A fault-scored key for the sealed descent into the Stonevein Sanctum.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Frostroot Key": {
      type: "resource",
      category: "key",
      image: "Assets/Resources/frostroot_key.png",
      description: "A winter-marked key that parts the frozen roots of the Frostroot Nursery.",
      bonusSkills: [],
      bonusStats: {}
    },

    "Rusty Sword": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "one_handed_sword",
      rarity: "common",
      itemLevel: 1,
      image: "Assets/Equips/rusty_sword.png",
      description: "An old corroded blade barely sharp enough to cut flesh. Better than bare hands... probably.",
      set: "",
      build: "STR_DEX",
      bonusSkills: [],
      bonusStats: { STR: 2, DEX: 1, "Phys Damage": 2 }
    },
    "Raggs Shirt": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 1,
      image: "Assets/Equips/raggs_shirt.png",
      description: "Torn cloth stitched together from scraps and faded fabric. Offers little protection, but keeps the cold away.",
      set: "",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 2, HP: 18, "Phys Resist": 1 }
    },
    "Raggs Pants": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "common",
      itemLevel: 1,
      image: "Assets/Equips/raggs_pants.png",
      description: "Rough patched trousers held together with twine and stubbornness.",
      set: "",
      build: "VIT_DEX",
      bonusSkills: [],
      bonusStats: { VIT: 1, DEX: 1, HP: 10 }
    },

    "Burrowstep Boots": {
      type: "armor",
      slot: "feet",
      equipCategory: "feet_armor",
      rarity: "common",
      itemLevel: 15,
      image: "Assets/Equips/burrowstep_boots.png",
      description: "Fast repositioning boots for early skirmishers.",
      set: "",
      build: "DEX_VIT",
      bonusSkills: [],
      bonusStats: { DEX: 9, VIT: 5, EVA: 6 }
    },
    "Boarhide Leggings": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "common",
      itemLevel: 19,
      image: "Assets/Equips/boarhide_leggins.png",
      description: "Boarbreaker set leg protection.",
      set: "Boarbreaker",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 11, STR: 6 }
    },
    "Devourer Axe": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "warhammer",
      rarity: "common",
      itemLevel: 18,
      image: "Assets/Equips/devourer_axe.png",
      description: "A brutal axe crafted from devourer remains.",
      set: "",
      build: "STR",
      bonusSkills: [],
      bonusStats: { STR: 11, VIT: 6, "Phys Damage": 6 }
    },
    "Fang Dagger": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "dagger",
      rarity: "common",
      itemLevel: 17,
      image: "Assets/Equips/fang_dagger.png",
      description: "Predator set dagger for fast critical openings.",
      set: "Predator",
      build: "DEX",
      bonusSkills: [],
      bonusStats: { DEX: 10, STR: 5, Crit: 6 }
    },
    "Mirage Ring": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 16,
      image: "Assets/Equips/mirage_ring.png",
      description: "A mirage-tuned ring for precision hybrids.",
      set: "",
      build: "DEX_INT",
      bonusSkills: [],
      bonusStats: { DEX: 8, INT: 6, ACC: 6 }
    },
    "Stonescale Armor": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 28,
      image: "Assets/Equips/stonescale_armor.png",
      description: "Stoneguard chest built for sustained tanking.",
      set: "Stoneguard",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 17, STR: 9 }
    },
    "Marmot Helm": {
      type: "armor",
      slot: "head",
      equipCategory: "helmet",
      rarity: "common",
      itemLevel: 25,
      image: "Assets/Equips/marmot_helm.png",
      description: "Dense helm for steady frontliners.",
      set: "",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 15, STR: 7 }
    },
    "Stonepulse Amulet": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 29,
      image: "Assets/Equips/stonepulse_amulet.png",
      description: "Arcane earth pulse focus for casters.",
      set: "",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 17, VIT: 9, "Magic Damage": 8 }
    },
    "Swiftbrush Boots": {
      type: "armor",
      slot: "feet",
      equipCategory: "feet_armor",
      rarity: "common",
      itemLevel: 37,
      image: "Assets/Equips/swiftbrush_boots.png",
      description: "Greenleaf set boots for evasive play.",
      set: "Greenleaf",
      build: "DEX",
      bonusSkills: [],
      bonusStats: { DEX: 22, VIT: 12, EVA: 10 }
    },
    "Greenleaf Vest": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 36,
      image: "Assets/Equips/greenleaf_vest.png",
      description: "Greenleaf set vest for durable skirmishers.",
      set: "Greenleaf",
      build: "DEX_VIT",
      bonusSkills: [],
      bonusStats: { DEX: 20, VIT: 13, "HEAL": 8 }
    },
    "Soul Echo Amulet": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 40,
      image: "Assets/Equips/soul_echo_amulet.png",
      description: "Wraith set amulet for long-form control battles.",
      set: "Wraith",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 24, DEX: 12 }
    },
    "Molten Gaze Ring": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 50,
      image: "Assets/Equips/molten_gaze_ring.png",
      description: "High-tier ring for status-heavy casters.",
      set: "",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 30, VIT: 15 }
    },
    "Ember Core Ring": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 47,
      image: "Assets/Equips/ember_core_ring.png",
      description: "Ember set ring focused on burst crit tempo.",
      set: "Ember",
      build: "DEX",
      bonusSkills: [],
      bonusStats: { DEX: 28, STR: 14, Crit: 12 }
    },
    "Icebound Boots": {
      type: "armor",
      slot: "feet",
      equipCategory: "feet_armor",
      rarity: "common",
      itemLevel: 48,
      image: "Assets/Equips/icebound_boots.png",
      description: "Frost set boots built for resistant duelers.",
      set: "Frost",
      build: "VIT_DEX",
      bonusSkills: [],
      bonusStats: { VIT: 28, DEX: 14, "Magic Resist": 10 }
    },
    "Lava Greaves": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "common",
      itemLevel: 49,
      image: "Assets/Equips/lava_greaves.png",
      description: "Molten set greaves for heavy damage builds.",
      set: "Molten",
      build: "STR_VIT",
      bonusSkills: [],
      bonusStats: { STR: 30, VIT: 16, "Phys Damage": 10 }
    },
/* BEGIN SYNCED MMO ITEMS */
    "Skimmer Blade": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "dagger",
      rarity: "common",
      itemLevel: 5,
      image: "Assets/Equips/skimmer_blade.png",
      description: "A light coastal dagger made for quick openings and precise cuts.",
      set: "Skimmer",
      build: "DEX",
      bonusSkills: [],
      bonusStats: { DEX: 5, STR: 3, Crit: 4, ACC: 3 }
    },
    "Tidecall Amulet": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 6,
      image: "Assets/Equips/tidecall_amulet.png",
      description: "A tidebound focus that bends wave pressure into utility spell control.",
      set: "Tidecaster",
      build: "INT_DEX",
      bonusSkills: [],
      bonusStats: { INT: 5, DEX: 3, "Magic Damage": 4 }
    },
    "Shellsplitter": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "one_handed_sword",
      rarity: "common",
      itemLevel: 7,
      image: "Assets/Equips/Shellsplitter.png",
      description: "A short sword edged with shell shards for brutal close strikes.",
      set: "Tideguard",
      build: "STR",
      bonusSkills: [],
      bonusStats: { STR: 6, VIT: 3, "Phys Damage": 4 }
    },
    "Ripple Staff": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "staff",
      rarity: "common",
      itemLevel: 9,
      image: "Assets/Equips/ripple_staff.png",
      description: "A tide-carved staff that amplifies flowing magic and control effects.",
      set: "Tidecaster",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 7, DEX: 4, "Magic Damage": 4 }
    },
    "Scaleguard Shirt": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 7,
      image: "Assets/Equips/scaleguard_shirt.png",
      description: "Layered crab shell armor built to absorb early-game punishment.",
      set: "Tideguard",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 6, STR: 3, HP: 70 }
    },
    "Tide Horror Vest": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 8,
      image: "Assets/Equips/tide_horror_vest.png",
      description: "A lighter tidal cuirass offering balanced defense and magical poise.",
      set: "Tideguard",
      build: "VIT_INT",
      bonusSkills: [],
      bonusStats: { VIT: 6, INT: 7, "Magic Resist": 4, HP: 64 }
    },
    "Wet Boots": {
      type: "armor",
      slot: "feet",
      equipCategory: "feet_armor",
      rarity: "common",
      itemLevel: 6,
      image: "Assets/Equips/wet_boots.png",
      description: "Flexible sea-soaked boots that improve footing and evasive movement.",
      set: "Skimmer",
      build: "DEX_VIT",
      bonusSkills: [],
      bonusStats: { VIT: 3, DEX: 3, HP: 48 }
    },
    "Coastal Hat": {
      type: "armor",
      slot: "head",
      equipCategory: "helmet",
      rarity: "common",
      itemLevel: 8,
      image: "Assets/Equips/coastal_hat.png",
      description: "A crested helm made from coastal shell and bone.",
      set: "Tideguard",
      build: "VIT_STR",
      bonusSkills: [],
      bonusStats: { VIT: 6, STR: 7, "Phys Resist": 4, HP: 64 }
    },
    "Driftcloak Vest": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 7,
      image: "Assets/Equips/driftcloak_vest.png",
      description: "A fluid-light vest that shifts with the tide to keep the wearer elusive and steady.",
      set: "Skimmer",
      build: "DEX_VIT",
      bonusSkills: [],
      bonusStats: { DEX: 4, VIT: 4, HP: 64, EVA: 4 }
    },
    "Wave Leggings": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "common",
      itemLevel: 9,
      image: "Assets/Equips/wave_leggins.png",
      description: "Layered leggings stitched from membrane and hide for balanced survival.",
      set: "Tideguard",
      build: "VIT_DEX",
      bonusSkills: [],
      bonusStats: { VIT: 4, DEX: 4, HP: 72 }
    },
    "Flow Ring": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 6,
      image: "Assets/Equips/flow_ring.png",
      description: "A simple ring that sharpens water-aligned timing and control.",
      set: "Tidecaster",
      build: "INT_DEX",
      bonusSkills: [],
      bonusStats: { VIT: 3, DEX: 3, "Crit Damage": 3 }
    },
    "Salt Amulet": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 8,
      image: "Assets/Equips/salt_amulet.png",
      description: "A salt-crystal amulet that steadies the wearer in drawn-out fights.",
      set: "Tideguard",
      build: "VIT_INT",
      bonusSkills: [],
      bonusStats: { VIT: 5, INT: 6, "Magic Resist": 4 }
    },
    "Drift Bracelet": {
      type: "armor",
      slot: "bracelet",
      equipCategory: "bracelet",
      rarity: "common",
      itemLevel: 7,
      image: "Assets/Equips/abyssbind_band.png",
      description: "A coral-bound bracelet for slippery skirmishers.",
      set: "Skimmer",
      build: "DEX_VIT",
      bonusSkills: [],
      bonusStats: { VIT: 3, DEX: 3, "Crit Damage": 3 }
    },
    "Ripple Charm": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 9,
      image: "Assets/Equips/ripple_charm.png",
      description: "A charm attuned to ripples in magic and momentum.",
      set: "Tidecaster",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 6, DEX: 3, "Magic Damage": 4, "Crit Damage": 3 }
    },
    "Sand Band": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 8,
      image: "Assets/Equips/sand_band.png",
      description: "A sturdy shell band favored by frontline bruisers.",
      set: "Tideguard",
      build: "STR",
      bonusSkills: [],
      bonusStats: { STR: 6, VIT: 3, "Phys Damage": 4 }
    },
    "Tide Loop": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 10,
      image: "Assets/Equips/tide_loop.png",
      description: "A polished loop carrying the weight and patience of the sea.",
      set: "Tidecaster",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { INT: 7, VIT: 3, "Magic Resist": 4 }
    },
    "Crusher's Anchor Cleaver": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "two_handed",
      rarity: "common",
      itemLevel: 14,
      image: "Assets/Equips/crusher_anchor_cleaver.png",
      description: "A crushing two-handed cleaver forged from anchor shards and pressure cores.",
      set: "Crusher Set",
      build: "STR",
      bonusSkills: [],
      bonusStats: { STR: 12, VIT: 6, "Phys Damage": 6 }
    },
    "Saltbound Bulwark Plate": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 14,
      image: "Assets/Equips/saltbound_bulwark_plate.png",
      description: "Salt-encrusted heavy plate built to absorb crushing pressure.",
      set: "Crusher Set",
      build: "VIT_STR",
      bonusSkills: [],
      bonusStats: { VIT: 14, STR: 6, "Phys Resist": 5, HP: 140 }
    },
    "Pressure Loop": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 14,
      image: "Assets/Equips/pressure_loop.png",
      description: "A dense loop that turns tidal pressure into stagger force.",
      set: "Crusher Set",
      build: "STR_VIT",
      bonusSkills: [],
      bonusStats: { STR: 10, VIT: 5 }
    },
    "Channeler's Focus Rod": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "staff",
      rarity: "common",
      itemLevel: 13,
      image: "Assets/Equips/channeler_focus_rod.png",
      description: "A drowned focus rod for control magic and stamina manipulation.",
      set: "Channeler Set",
      build: "INT_DEX",
      bonusSkills: [],
      bonusStats: { INT: 12, DEX: 5, "Magic Damage": 5 }
    },
    "Abyssbind Band": {
      type: "armor",
      slot: "bracelet",
      equipCategory: "bracelet",
      rarity: "common",
      itemLevel: 13,
      image: "Assets/Equips/drift_bracelet.png",
      description: "A binding abyssal band that steadies control chains and combo tempo.",
      set: "Channeler Set",
      build: "INT_DEX",
      bonusSkills: [],
      bonusStats: { INT: 10, DEX: 6 }
    },
    "Drowned Sigil Amulet": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 13,
      image: "Assets/Equips/drowned_sigil_amulet.png",
      description: "A drowned sigil focus for resilient control casters.",
      set: "Channeler Set",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { INT: 11, VIT: 5, "Magic Resist": 4 }
    },
    "Tidemother Fangblade": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "one_handed_sword",
      rarity: "common",
      itemLevel: 15,
      image: "Assets/Equips/tidemother_fangblade.png",
      description: "A one-handed fangblade shaped from the Tidemother's corrupt pressure.",
      set: "Tidemother Set",
      build: "DEX_INT",
      bonusSkills: [],
      bonusStats: { DEX: 12, INT: 10, Crit: 6 }
    },
    "Abyssal Carapace Vest": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 15,
      image: "Assets/Equips/abyssal_carapace_vest.png",
      description: "A corrupted brine carapace that protects while amplifying abyssal focus.",
      set: "Tidemother Set",
      build: "VIT_INT",
      bonusSkills: [],
      bonusStats: { VIT: 15, INT: 10, "Magic Resist": 6, HP: 180 }
    },
    "Echo Loop of the Deep": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 15,
      image: "Assets/Equips/echo_loop_of_the_deep.png",
      description: "A deep echo loop for high-value debuff and status builds.",
      set: "Tidemother Set",
      build: "INT_DEX",
      bonusSkills: [],
      bonusStats: { INT: 13, DEX: 7, "Crit Damage": 4 }
    },
    "Leviathan Arcblade": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "one_handed_sword",
      rarity: "common",
      itemLevel: 15,
      image: "Assets/Equips/leviathan_archblade.png",
      description: "A leviathan-forged arcblade that channels stormwake resonance through every critical line.",
      set: "Stormwake Set",
      build: "DEX_INT",
      bonusSkills: [],
      bonusStats: { DEX: 12, INT: 10, Crit: 6 }
    },
    "Leviathan Scale Mantle": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 15,
      image: "Assets/Equips/leviathan_scale_mantle.png",
      description: "Scaled mantle from the deep stormwake, balancing vitality and arcane ward.",
      set: "Stormwake Set",
      build: "VIT_INT",
      bonusSkills: [],
      bonusStats: { VIT: 14, INT: 10, "Magic Resist": 6, HP: 160 }
    },
    "Maelstrom Eye Ring": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 15,
      image: "Assets/Equips/maelstorm_eye_ring.png",
      description: "A ring set with a stilling maelstrom eye—draws out debuffs and sharpens critical follow-through.",
      set: "Stormwake Set",
      build: "INT_DEX",
      bonusSkills: [],
      bonusStats: { INT: 13, DEX: 7, "Crit Damage": 4 }
    },
    "Stormwake Legguards": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "common",
      itemLevel: 15,
      image: "Assets/Equips/stormwake_legguards.png",
      description: "Legguards laced with stormwake threading for mobility under magical pressure.",
      set: "Stormwake Set",
      build: "DEX_VIT",
      bonusSkills: [],
      bonusStats: { VIT: 10, DEX: 10, HP: 150, EVA: 4, "Magic Resist": 4 }
    },
    "Thunderclaw Dirk": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "dagger",
      rarity: "common",
      itemLevel: 14,
      image: "Assets/Equips/thunderclaw_dirk.png",
      description: "A storm-charged dirk carved from Stormfang talons for fast critical openings.",
      set: "Stormfang Set",
      build: "DEX_STR",
      bonusSkills: [],
      bonusStats: { DEX: 12, STR: 6, Crit: 6, ACC: 4, EVA: 3 }
    },
    "Stormhide Boots": {
      type: "armor",
      slot: "feet",
      equipCategory: "feet_armor",
      rarity: "common",
      itemLevel: 14,
      image: "Assets/Equips/stormhide_boots.png",
      description: "Storm-slick boots that keep their wearer light through pressure and spray.",
      set: "Stormfang Set",
      build: "DEX_VIT",
      bonusSkills: [],
      bonusStats: { DEX: 10, VIT: 6, EVA: 6 }
    },
    "Static Fang Bracelet": {
      type: "armor",
      slot: "bracelet",
      equipCategory: "bracelet",
      rarity: "common",
      itemLevel: 14,
      image: "Assets/Equips/static_fang_bracelet.png",
      description: "A crackling fang bracelet that stores static charge for lethal follow-throughs.",
      set: "Stormfang Set",
      build: "DEX_STR",
      bonusSkills: [],
      bonusStats: { DEX: 9, STR: 6, "Crit Damage": 5 }
    },
    "Gale-Slashed Leggings": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "common",
      itemLevel: 14,
      image: "Assets/Equips/gale_slashed_leggings.png",
      description: "Wind-cut leggings reinforced with charged hide and storm-thread stitching.",
      set: "Stormfang Set",
      build: "DEX_VIT",
      bonusSkills: [],
      bonusStats: { DEX: 10, VIT: 5, HP: 120, EVA: 5, ACC: 3 }
    },
    "Tempest Caller Rod": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "staff",
      rarity: "common",
      itemLevel: 13,
      image: "Assets/Equips/tempest_caller_rod.png",
      description: "A two-handed storm rod wrapped in brine currents and static control runes.",
      set: "Tempest Caller Set",
      build: "INT_DEX",
      bonusSkills: [],
      bonusStats: { INT: 12, DEX: 5, "Magic Damage": 5 }
    },
    "Stormbind Hood": {
      type: "armor",
      slot: "head",
      equipCategory: "helmet",
      rarity: "common",
      itemLevel: 13,
      image: "Assets/Equips/stormbind_hood.png",
      description: "A drowned ritual hood that grounds storm pressure through the wearer's focus.",
      set: "Tempest Caller Set",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { INT: 10, VIT: 6, "Magic Resist": 4, HP: 80 }
    },
    "Brinestorm Amulet": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 13,
      image: "Assets/Equips/brinestorm_amulet.png",
      description: "An amulet filled with spiraling brine and faint lightning arcs.",
      set: "Tempest Caller Set",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { INT: 11, VIT: 5 }
    },
    "Sandfang Blade": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "one_handed_sword",
      rarity: "common",
      itemLevel: 15,
      image: "Assets/Equips/sandfang_blade.png",
      description: "A desert-forged blade built for accurate cuts and fast pressure.",
      set: "Dunestrike",
      build: "DEX",
      bonusSkills: [],
      bonusStats: { DEX: 11, STR: 6, Crit: 6, ACC: 4 }
    },
    "Mirage Edge": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "one_handed_sword",
      rarity: "common",
      itemLevel: 16,
      image: "Assets/Equips/mirage_edge.png",
      description: "A shimmering sword that blurs around its target.",
      set: "Mirage",
      build: "DEX_INT",
      bonusSkills: [],
      bonusStats: { DEX: 11, INT: 11 }
    },
    "Boarbreaker Axe": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "warhammer",
      rarity: "common",
      itemLevel: 18,
      image: "Assets/Equips/boarbreaker_axe.png",
      description: "A crushing weapon made to break lines and armor.",
      set: "Boarbreaker",
      build: "STR",
      bonusSkills: [],
      bonusStats: { STR: 13, VIT: 7, "Phys Damage": 6 }
    },
    "Venom Channeler": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "staff",
      rarity: "common",
      itemLevel: 19,
      image: "Assets/Equips/venom_channeler.png",
      description: "A venom-soaked focus for spike pressure and status play.",
      set: "Venomcaster",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 13, DEX: 8, "Magic Damage": 6 }
    },
    "Thornback Armor": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 20,
      image: "Assets/Equips/thornback_armor.png",
      description: "Heavy desert armor reinforced with spined carapace plates.",
      set: "Thornback Bulwark",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 14, STR: 8, HP: 200 }
    },
    "Thornback Graveplate": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 20,
      image: "Assets/Equips/thornback_graveplate.png",
      description: "Graveguard chest armor layered with thornback shell to punish close attackers.",
      set: "Thornback Graveguard Set",
      build: "VIT_STR",
      bonusSkills: [],
      bonusStats: { VIT: 20, STR: 10, HP: 220, "Phys Resist": 7, "Status Resist": 4 }
    },
    "Bone-Spike Pants": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "common",
      itemLevel: 21,
      image: "Assets/Equips/bone_spike_pants.png",
      description: "Barbed graveguard legplates that trade mobility for brutal staying power.",
      set: "Thornback Graveguard Set",
      build: "VIT_STR",
      bonusSkills: [],
      bonusStats: { VIT: 18, STR: 9, HP: 180, "Phys Resist": 5, "Status Resist": 5 }
    },
    "Grave Impaler": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "polearm",
      rarity: "common",
      itemLevel: 21,
      image: "Assets/Equips/grave_impaler.png",
      description: "A grave-forged polearm that rewards disciplined counters and precise impales.",
      set: "Thornback Graveguard Set",
      build: "STR_VIT",
      bonusSkills: [],
      bonusStats: { STR: 18, VIT: 10, "Phys Damage": 7, ACC: 4, Crit: 3 }
    },
    "Boarhide Chest": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 20,
      image: "Assets/Equips/boarhide_chest.png",
      description: "A thick-hide chestpiece built for stubborn frontliners.",
      set: "Boarbreaker",
      build: "VIT_STR",
      bonusSkills: [],
      bonusStats: { VIT: 13, STR: 13, "Phys Resist": 8, HP: 160 }
    },
    "Sandstep Boots": {
      type: "armor",
      slot: "feet",
      equipCategory: "feet_armor",
      rarity: "common",
      itemLevel: 15,
      image: "Assets/Equips/sandstep_boots.png",
      description: "Low-profile boots favored by dune duelists.",
      set: "Dunestrike",
      build: "DEX",
      bonusSkills: [],
      bonusStats: { DEX: 11, STR: 6, Crit: 6 }
    },
    "Mirage Helm": {
      type: "armor",
      slot: "head",
      equipCategory: "helmet",
      rarity: "common",
      itemLevel: 17,
      image: "Assets/Equips/mirage_helm.png",
      description: "A helm tuned to distortions and openings in the fight.",
      set: "Mirage",
      build: "INT_DEX",
      bonusSkills: [],
      bonusStats: { VIT: 7, DEX: 7, HP: 136 }
    },
    "Mirage Maw Hood": {
      type: "armor",
      slot: "head",
      equipCategory: "helmet",
      rarity: "common",
      itemLevel: 21,
      image: "Assets/Equips/mirage_maw_hood.png",
      description: "A hood woven from mirage threads that sharpens deceptive casting.",
      set: "Mirage Maw Set",
      build: "INT_DEX",
      bonusSkills: [],
      bonusStats: { INT: 18, DEX: 12, ACC: 6, EVA: 5, "Magic Damage": 5 }
    },
    "Mourner’s Veil": {
      type: "armor",
      slot: "head",
      equipCategory: "veil",
      rarity: "common",
      itemLevel: 22,
      image: "Assets/Equips/mourners_veil.png",
      description: "A ritual veil worn by desert mourners to sharpen focus through heat haze.",
      set: "Dune Mourner Set",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { INT: 22, VIT: 14, "Magic Damage": 7, ACC: 5, "Magic Resist": 5 }
    },
    "Boneguard Gloves": {
      type: "armor",
      slot: "bracelet",
      equipCategory: "bracelet",
      rarity: "common",
      itemLevel: 18,
      image: "Assets/Equips/template_bracelet.png",
      description: "Dense wristguards lashed with beast bone for impact builds.",
      set: "Boarbreaker",
      build: "STR_VIT",
      bonusSkills: [],
      bonusStats: { STR: 12, VIT: 6, "Phys Resist": 4 }
    },
    "Dune Leggings": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "common",
      itemLevel: 19,
      image: "Assets/Equips/dune_leggings.png",
      description: "Leg armor suited for long pursuits and attrition.",
      set: "Thornback Bulwark",
      build: "VIT_DEX",
      bonusSkills: [],
      bonusStats: { VIT: 8, DEX: 8, HP: 152 }
    },
    "Haze-Torn Pants": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "common",
      itemLevel: 21,
      image: "Assets/Equips/haze_torn_pants.png",
      description: "Mirage-sheared pants that favor evasive footwork and arcane control.",
      set: "Mirage Maw Set",
      build: "DEX_INT",
      bonusSkills: [],
      bonusStats: { DEX: 17, INT: 11, EVA: 7, HP: 120, "Magic Resist": 4 }
    },
    "Hollow Sand Robe": {
      type: "armor",
      slot: "chest",
      equipCategory: "robe",
      rarity: "common",
      itemLevel: 22,
      image: "Assets/Equips/hollow_sand_robe.png",
      description: "A robe lined with hollowed dune-silk for steady casting under pressure.",
      set: "Dune Mourner Set",
      build: "VIT_INT",
      bonusSkills: [],
      bonusStats: { VIT: 22, INT: 18, HP: 240, "Magic Resist": 7, "Status Resist": 5 }
    },
    "Droughtworn Pants": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "common",
      itemLevel: 23,
      image: "Assets/Equips/droughtworn_pants.png",
      description: "Sun-baked pants that trade comfort for precision in prolonged engagements.",
      set: "Dune Mourner Set",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { INT: 20, VIT: 16, HP: 180, ACC: 5, EVA: 4 }
    },
    "Venom Ring": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 19,
      image: "Assets/Equips/venom_ring.png",
      description: "A serpent-themed ring that deepens status potency.",
      set: "Venomcaster",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 12, DEX: 7, "Magic Damage": 6, "Crit Damage": 4 }
    },
    "Sand Amulet": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 16,
      image: "Assets/Equips/template_amulet.png",
      description: "A desert talisman that rewards steady blade work.",
      set: "Dunestrike",
      build: "DEX",
      bonusSkills: [],
      bonusStats: { DEX: 11, STR: 6, Crit: 6, "Crit Damage": 4 }
    },
    "Mirage Bracelet": {
      type: "armor",
      slot: "bracelet",
      equipCategory: "bracelet",
      rarity: "common",
      itemLevel: 17,
      image: "Assets/Equips/mirage_bracelet.png",
      description: "A wavering bracelet made for deceptive fighters.",
      set: "Mirage",
      build: "DEX_INT",
      bonusSkills: [],
      bonusStats: { DEX: 10, INT: 10, "Crit Damage": 4 }
    },
    "False Wound Ring": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 22,
      image: "Assets/Equips/false_wound_ring.png",
      description: "A warped ring that turns false openings into precise magical finishers.",
      set: "Mirage Maw Set",
      build: "INT_DEX",
      bonusSkills: [],
      bonusStats: { INT: 17, DEX: 12, ACC: 6, "Magic Damage": 5, Crit: 3 }
    },
    "Mawcaller Staff": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "staff",
      rarity: "common",
      itemLevel: 23,
      image: "Assets/Equips/mawcaller_staff.png",
      description: "A staff carved to echo mirage calls and punish overextended foes.",
      set: "Dune Mourner Set",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { INT: 26, VIT: 10, "Magic Damage": 9, ACC: 7, Crit: 4 }
    },
    "Bone Charm": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 18,
      image: "Assets/Equips/bone_charm.png",
      description: "A charm carved from desert bone to reinforce brute force.",
      set: "Boarbreaker",
      build: "STR",
      bonusSkills: [],
      bonusStats: { STR: 12, VIT: 6, "Phys Damage": 6 }
    },
    "Fang Loop": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 20,
      image: "Assets/Equips/fang_loop.png",
      description: "A fang-set loop meant for finishers and bleeders.",
      set: "Dunestrike",
      build: "DEX_STR",
      bonusSkills: [],
      bonusStats: { DEX: 12, STR: 12, Crit: 8, "Phys Damage": 6, "Crit Damage": 6 }
    },
    "Dune Band": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 15,
      image: "Assets/Equips/dune_band.png",
      description: "A plain but durable band worn by survivalists of the sands.",
      set: "Thornback Bulwark",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 10, STR: 5, HP: 150 }
    },
    "Lynx Fang": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "dagger",
      rarity: "common",
      itemLevel: 27,
      image: "Assets/Equips/lynx_fang.png",
      description: "A rock-honed dagger for ambushes and repeat pressure.",
      set: "Lynxstrike",
      build: "DEX",
      bonusSkills: [],
      bonusStats: { DEX: 18, STR: 10, Crit: 8, ACC: 6 }
    },
    "Serpent Fang": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "dagger",
      rarity: "common",
      itemLevel: 28,
      image: "Assets/Equips/template_dagger.png",
      description: "A venom-lined fang blade built for agile control.",
      set: "",
      build: "DEX_INT",
      bonusSkills: [],
      bonusStats: { DEX: 18, INT: 18 }
    },
    "Hornbreaker Axe": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "two_handed",
      rarity: "common",
      itemLevel: 29,
      image: "Assets/Equips/hornbreaker_axe.png",
      description: "An ibex-horn two-handed axe that excels at driving through defenses.",
      set: "Ibex Dominator",
      build: "STR",
      bonusSkills: [],
      bonusStats: { STR: 19, VIT: 11, "Phys Damage": 8 }
    },
    "Stonecaller": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "greatsword",
      rarity: "common",
      itemLevel: 30,
      image: "Assets/Equips/stonecaller.png",
      description: "A heavy greatsword that channels binding and petrifying force.",
      set: "Earthbinder",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 20, DEX: 12, "Magic Damage": 8 }
    },
    "Marmot Bulwark": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 25,
      image: "Assets/Equips/marmot_bullwark.png",
      description: "A stone-backed chestpiece designed for long, grinding fights.",
      set: "Stoneguard",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 17, STR: 10, HP: 250 }
    },
    "Earthshell Armor": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 26,
      image: "Assets/Equips/earthshell_armor.png",
      description: "A compact earthward armor with defensive magical utility.",
      set: "Rock Serpent",
      build: "VIT_INT",
      bonusSkills: [],
      bonusStats: { VIT: 17, INT: 16, "Magic Resist": 8, HP: 208 }
    },
    "Rock Serpent Boots": {
      type: "armor",
      slot: "feet",
      equipCategory: "feet_armor",
      rarity: "common",
      itemLevel: 27,
      image: "Assets/Equips/rock_serpent_boots.png",
      description: "Grip-heavy boots that improve footing on broken terrain.",
      set: "Rock Serpent",
      build: "DEX_VIT",
      bonusSkills: [],
      bonusStats: { VIT: 10, DEX: 10, HP: 216 }
    },
    "Stone Lizzard Helmet": {
      type: "armor",
      slot: "head",
      equipCategory: "helmet",
      rarity: "common",
      itemLevel: 28,
      image: "Assets/Equips/stone_lizzard_helmet.png",
      description: "A dense helm that favors tanks and bruisers alike.",
      set: "Stoneguard",
      build: "VIT_STR",
      bonusSkills: [],
      bonusStats: { VIT: 18, STR: 18, "Phys Resist": 8, HP: 224 }
    },
    "Claw Ring": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 26,
      image: "Assets/Equips/claw_ring.png",
      description: "A claw-etched ring that sharpens aggressive melee patterns.",
      set: "Lynxstrike",
      build: "DEX_STR",
      bonusSkills: [],
      bonusStats: { DEX: 16, STR: 15, Crit: 8, "Phys Damage": 6, "Crit Damage": 6 }
    },
    "Stonescale Leggings": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "common",
      itemLevel: 29,
      image: "Assets/Equips/stonescale_leggings.png",
      description: "Reinforced leggings threaded with stable core fragments.",
      set: "",
      build: "VIT_INT",
      bonusSkills: [],
      bonusStats: { VIT: 18, INT: 18, "Magic Resist": 8, HP: 232 }
    },
    "Petrify Ring": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 30,
      image: "Assets/Equips/petrify_ring.png",
      description: "A ring meant for controllers who win with time and pressure.",
      set: "Earthbinder",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { INT: 19, VIT: 11, "Magic Resist": 6 }
    },
    "Core Amulet": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 29,
      image: "Assets/Equips/core_amulet.png",
      description: "A stable core pendant for controlled casting.",
      set: "Earthbinder",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 18, DEX: 10, "Magic Damage": 8, "Crit Damage": 6 }
    },
    "Stone Bracelet": {
      type: "armor",
      slot: "bracelet",
      equipCategory: "bracelet",
      rarity: "common",
      itemLevel: 25,
      image: "Assets/Equips/stone_bracelet.png",
      description: "A rough bracelet that reinforces survival over burst.",
      set: "Stoneguard",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 16, STR: 9, HP: 250 }
    },
    "Fang Charm": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 27,
      image: "Assets/Equips/fang_charm.png",
      description: "A predatory charm that rewards accurate strikes.",
      set: "Rock Serpent",
      build: "DEX",
      bonusSkills: [],
      bonusStats: { DEX: 17, STR: 9, Crit: 8, "Crit Damage": 6 }
    },
    "Serpent Grip": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 28,
      image: "Assets/Equips/serpent_grip.png",
      description: "A grounded loop that supports bruiser builds.",
      set: "Rock Serpent",
      build: "STR_VIT",
      bonusSkills: [],
      bonusStats: { STR: 18, VIT: 10, "Phys Resist": 6 }
    },
    "Stonekind Band": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 30,
      image: "Assets/Equips/stonekind_band.png",
      description: "A polished band used by hybrid earth spellblades.",
      set: "",
      build: "INT_DEX",
      bonusSkills: [],
      bonusStats: { VIT: 11, DEX: 11, "Crit Damage": 6 }
    },
    "Foxfang Blade": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "one_handed_sword",
      rarity: "common",
      itemLevel: 38,
      image: "Assets/Equips/foxfang_blade.png",
      description: "A refined forest blade built for assassins and duelists.",
      set: "Greenleaf Assassin",
      build: "DEX",
      bonusSkills: [],
      bonusStats: { DEX: 25, STR: 14, Crit: 10, ACC: 8 }
    },
    "Stagpiercer": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "one_handed_sword",
      rarity: "common",
      itemLevel: 39,
      image: "Assets/Equips/stag_piercer.png",
      description: "A ceremonial blade that rewards tempo, buffs, and follow-ups.",
      set: "Verdant Rite",
      build: "DEX_INT",
      bonusSkills: [],
      bonusStats: { DEX: 24, INT: 24 }
    },
    "Gorilla Crusher": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "warhammer",
      rarity: "common",
      itemLevel: 40,
      image: "Assets/Equips/gorilla_crusher.png",
      description: "A primal crushing weapon meant for overwhelming pressure.",
      set: "Primal Rage",
      build: "STR",
      bonusSkills: [],
      bonusStats: { STR: 26, VIT: 15, "Phys Damage": 10 }
    },
    "Wraithcall Scepter": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "staff",
      rarity: "common",
      itemLevel: 40,
      image: "Assets/Equips/wraithcall_scepter.png",
      description: "A soulbound scepter for persistent magical attrition.",
      set: "Soulbinder",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 26, DEX: 15, "Magic Damage": 12 }
    },
    "Gorilla Armor": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 40,
      image: "Assets/Equips/gorilla_armor.png",
      description: "Heavy jungle armor that turns durability into momentum.",
      set: "Jungle Titan",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 26, STR: 15, HP: 400 }
    },
    "Wraith Raggs": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 40,
      image: "Assets/Equips/wraith_raggs.png",
      description: "Spectral tatters that wrap the body—sturdy support for casters who walk the veil.",
      set: "Verdant Rite",
      build: "VIT_INT",
      bonusSkills: [],
      bonusStats: { VIT: 25, INT: 24, "Magic Resist": 10, HP: 320 }
    },
    "Primate Boots": {
      type: "armor",
      slot: "feet",
      equipCategory: "feet_armor",
      rarity: "common",
      itemLevel: 37,
      image: "Assets/Equips/primate_boots.png",
      description: "Durable primate-hide boots built for fast, sustained hunts.",
      set: "Greenleaf Assassin",
      build: "DEX_VIT",
      bonusSkills: [],
      bonusStats: { VIT: 14, DEX: 14, HP: 296 }
    },
    "Antler Helm": {
      type: "armor",
      slot: "head",
      equipCategory: "helmet",
      rarity: "common",
      itemLevel: 38,
      image: "Assets/Equips/antler_helm.png",
      description: "A helm crowned with stag antler to enhance supportive patterns.",
      set: "Verdant Rite",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { INT: 25, VIT: 14, "Magic Resist": 8, HP: 304 }
    },
    "Forest Leggings": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "common",
      itemLevel: 39,
      image: "Assets/Equips/Forest_Leggings.png",
      description: "Dense forest leathers offering survival without losing pace.",
      set: "Jungle Titan",
      build: "VIT_DEX",
      bonusSkills: [],
      bonusStats: { VIT: 15, DEX: 15, HP: 312 }
    },
    "Soul Ring": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 40,
      image: "Assets/Equips/soul_ring.png",
      description: "A shadowed ring that amplifies sustained magical pressure.",
      set: "Soulbinder",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 25, DEX: 14, "Magic Damage": 10, "Crit Damage": 8 }
    },
    "Heart of the Jungle": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 38,
      image: "Assets/Equips/heart_of_the_jungle.png",
      description: "A living core attuned to the deep jungle—extends your control windows in long fights.",
      set: "Verdant Rite",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { INT: 24, VIT: 13, "Magic Resist": 8 }
    },
    "Primate Bracelet": {
      type: "armor",
      slot: "bracelet",
      equipCategory: "bracelet",
      rarity: "common",
      itemLevel: 37,
      image: "Assets/Equips/primate_bracelet.png",
      description: "A dense primate bracelet used by dominant frontliners.",
      set: "Jungle Titan",
      build: "STR_VIT",
      bonusSkills: [],
      bonusStats: { STR: 23, VIT: 13, "Phys Resist": 8 }
    },
    "Fang Charm ALT": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 35,
      image: "Assets/Equips/template_amulet.png",
      description: "A refined fang charm for burst-oriented finishers.",
      set: "Greenleaf Assassin",
      build: "DEX_STR",
      bonusSkills: [],
      bonusStats: { DEX: 21, STR: 20, Crit: 10, "Phys Damage": 8, "Crit Damage": 8 }
    },
    "Growth Loop": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 36,
      image: "Assets/Equips/growth_loop.png",
      description: "A loop that rewards support and recovery play.",
      set: "Verdant Rite",
      build: "VIT_INT",
      bonusSkills: [],
      bonusStats: { VIT: 22, INT: 21, "Magic Resist": 10 }
    },
    "Ashmaw Cleaver": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "greatsword",
      rarity: "common",
      itemLevel: 45,
      image: "Assets/Equips/ashmaw_cleaver.png",
      description: "A fire-scarred greatsword for punishing heavy swings.",
      set: "Ash Titan",
      build: "STR",
      bonusSkills: [],
      bonusStats: { STR: 29, VIT: 17, "Phys Damage": 12 }
    },
    "Emberfang": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "dagger",
      rarity: "common",
      itemLevel: 47,
      image: "Assets/Equips/emberfang.png",
      description: "A blazing assassin dagger built for lethal turn bursts.",
      set: "Ember Assassin",
      build: "DEX",
      bonusSkills: [],
      bonusStats: { DEX: 30, STR: 17, Crit: 12, ACC: 10 }
    },
    "Frozen Edge": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "one_handed_sword",
      rarity: "common",
      itemLevel: 50,
      image: "Assets/Equips/frozen_edge.png",
      description: "A freezing duelist blade for precise, relentless cuts.",
      set: "Frostfang",
      build: "DEX_STR",
      bonusSkills: [],
      bonusStats: { DEX: 31, STR: 29, Crit: 12, "Phys Damage": 10 }
    },
    "Basilisk Staff": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "staff",
      rarity: "common",
      itemLevel: 52,
      image: "Assets/Equips/basilisk_staff.png",
      description: "A basilisk relic staff for high-end control and debuffing.",
      set: "Basilisk Oracle",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 33, DEX: 19, "Magic Damage": 12 }
    },
    "Magmahide Plate": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 50,
      image: "Assets/Equips/magmahide_plate.png",
      description: "A furnace-like chestpiece for top-tier tanks.",
      set: "Molten Colossus",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 32, STR: 18, HP: 500 }
    },
    "Glacier Shell": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 49,
      image: "Assets/Equips/glacier_shell.png",
      description: "A glacier-forged shell piece combining defense and calm magic.",
      set: "Frozen Bastion",
      build: "VIT_INT",
      bonusSkills: [],
      bonusStats: { VIT: 30, INT: 29, "Magic Resist": 12, HP: 392 }
    },
    "Flame Boots": {
      type: "armor",
      slot: "feet",
      equipCategory: "feet_armor",
      rarity: "common",
      itemLevel: 46,
      image: "Assets/Equips/flame_boots.png",
      description: "Heated boots for aggressive burst builds.",
      set: "Ember Assassin",
      build: "DEX_STR",
      bonusSkills: [],
      bonusStats: { DEX: 29, STR: 27, Crit: 12, "Phys Damage": 10 }
    },
    "Ice Helm": {
      type: "armor",
      slot: "head",
      equipCategory: "helmet",
      rarity: "common",
      itemLevel: 48,
      image: "Assets/Equips/ice_helm.png",
      description: "A cold-forged helm that stabilizes endgame survivability.",
      set: "Frozen Bastion",
      build: "VIT_INT",
      bonusSkills: [],
      bonusStats: { VIT: 30, INT: 29, "Magic Resist": 12, HP: 384 }
    },
    "Molten Bracelet": {
      type: "armor",
      slot: "bracelet",
      equipCategory: "bracelet",
      rarity: "common",
      itemLevel: 47,
      image: "Assets/Equips/molten_bracelet.png",
      description: "A molten-forged bracelet for maximum pressure and penetration.",
      set: "Ash Titan",
      build: "STR",
      bonusSkills: [],
      bonusStats: { STR: 29, VIT: 16, "Phys Damage": 12 }
    },
    "Frost Leggings": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "common",
      itemLevel: 50,
      image: "Assets/Equips/frost_leggings.png",
      description: "Leggings designed for long cold skirmishes and clean finishers.",
      set: "Frostfang",
      build: "DEX_VIT",
      bonusSkills: [],
      bonusStats: { VIT: 18, DEX: 18, HP: 400 }
    },
    "Basilisk Eye Amulet": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 52,
      image: "Assets/Equips/basilisk_eye_amulet.png",
      description: "A high-end amulet for status-heavy controllers.",
      set: "Basilisk Oracle",
      build: "INT",
      bonusSkills: [],
      bonusStats: {
        INT: 34,
        VIT: 18,
        DEX: 18,
        "Magic Damage": 12,
        "Crit Damage": 10
      }
    },
    "Ember Bracelet": {
      type: "armor",
      slot: "bracelet",
      equipCategory: "bracelet",
      rarity: "common",
      itemLevel: 47,
      image: "Assets/Equips/ember_bracelet.png",
      description: "A bracelet that sharpens burst timing and critical conversion.",
      set: "Ember Assassin",
      build: "DEX",
      bonusSkills: [],
      bonusStats: { DEX: 29, STR: 16, Crit: 12, "Crit Damage": 10 }
    },
    "Frost Bracelet": {
      type: "armor",
      slot: "bracelet",
      equipCategory: "bracelet",
      rarity: "common",
      itemLevel: 49,
      image: "Assets/Equips/frost_bracelet.png",
      description: "A bracelet that rewards precise frost setups.",
      set: "Frostfang",
      build: "DEX_INT",
      bonusSkills: [],
      bonusStats: { DEX: 29, INT: 28, "Crit Damage": 10 }
    },
    "Inferno Charm": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 46,
      image: "Assets/Equips/inferno_charm.png",
      description: "A charm for aggressive hybrid damage builds.",
      set: "Ash Titan",
      build: "STR_INT",
      bonusSkills: [],
      bonusStats: { STR: 28, INT: 26, "Phys Damage": 12, "Magic Damage": 10 }
    },
    "Ice Band": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 48,
      image: "Assets/Equips/ice_band.png",
      description: "A disciplined endgame band focused on resistance and endurance.",
      set: "Frozen Bastion",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 30, STR: 17, HP: 480 }
    },
    "Bramblehorn Antler Crown": {
      type: "armor",
      slot: "head",
      equipCategory: "helmet",
      rarity: "rare",
      itemLevel: 20,
      image: "Assets/Equips/bramblehorn_antler_crown.png",
      description: "An antler crown woven with living bramble; favors healing and protection.",
      set: "Bramblehorn",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { INT: 14, VIT: 12, HEAL: 6, "Magic Resist": 5, "Status Resist": 4, HP: 120 }
    },
    "Rootmender Sash": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "rare",
      itemLevel: 21,
      image: "Assets/Equips/rootmender_sash.png",
      description: "A rootmend sash that steadies the wearer under magical assault.",
      set: "Bramblehorn",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { VIT: 15, INT: 10, HEAL: 7, HP: 150, "Magic Resist": 4 }
    },
    "Thornweave Bracelet": {
      type: "armor",
      slot: "bracelet",
      equipCategory: "bracelet",
      rarity: "rare",
      itemLevel: 21,
      image: "Assets/Equips/thornweave_bracelet.png",
      description: "Thorn-thread bracelet that sharpens support casting tempo.",
      set: "Bramblehorn",
      build: "INT_DEX",
      bonusSkills: [],
      bonusStats: { INT: 13, DEX: 8, HEAL: 5, ACC: 4, "Status Resist": 4 }
    },
    "Fangroot Biteblade": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "dagger",
      rarity: "rare",
      itemLevel: 21,
      image: "Assets/Equips/fangroot_biteblade.png",
      description: "A predatory blade honed from fangroot claws for bleeding burst kills.",
      set: "Fangroot",
      build: "DEX_STR",
      bonusSkills: [],
      bonusStats: { STR: 18, DEX: 17, "Phys Damage": 8, Crit: 7, ACC: 5 }
    },
    "Bloodroot Mantle": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "rare",
      itemLevel: 21,
      image: "Assets/Equips/bloodroot_mantle.png",
      description: "A bloodroot-lined mantle for evasive assassins.",
      set: "Fangroot",
      build: "DEX_STR",
      bonusSkills: [],
      bonusStats: { DEX: 18, STR: 10, EVA: 7, Crit: 5, HP: 100 }
    },
    "Predator Fang Ring": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "rare",
      itemLevel: 22,
      image: "Assets/Equips/predator_fang_ring.png",
      description: "A fangroot ring that rewards precise critical strikes.",
      set: "Fangroot",
      build: "DEX_STR",
      bonusSkills: [],
      bonusStats: { DEX: 16, STR: 12, Crit: 6, ACC: 5, "Phys Damage": 5 }
    },
    "Gaiahide Warplate": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "rare",
      itemLevel: 22,
      image: "Assets/Equips/gaiahide_warplate.png",
      description: "Heavy gaiahide plate for frontline bruisers.",
      set: "Gaiahide",
      build: "VIT_STR",
      bonusSkills: [],
      bonusStats: { VIT: 24, STR: 16, HP: 260, "Phys Resist": 8, "Magic Resist": 5 }
    },
    "Rootquake Greaves": {
      type: "armor",
      slot: "feet",
      equipCategory: "feet_armor",
      rarity: "rare",
      itemLevel: 22,
      image: "Assets/Equips/rootquake_greaves.png",
      description: "Greaves rooted with behemoth bone for crushing advances.",
      set: "Gaiahide",
      build: "STR_VIT",
      bonusSkills: [],
      bonusStats: { STR: 18, VIT: 14, HP: 180, "Phys Damage": 6, "Status Resist": 5 }
    },
    "Heartburrow Horn Charm": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "rare",
      itemLevel: 23,
      image: "Assets/Equips/heartburrow_horn_charm.png",
      description: "A horn charm pulsing with ancient gaia sap.",
      set: "Gaiahide",
      build: "STR_VIT",
      bonusSkills: [],
      bonusStats: { STR: 20, VIT: 16, "Phys Damage": 7, "Status Resist": 6, HP: 160 }
    },
    "Behemoth Rootguard": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "warhammer",
      rarity: "rare",
      itemLevel: 23,
      image: "Assets/Equips/behemoth_rootguard.png",
      description: "A gaiahide warhammer grown from the behemoth's deepest plates.",
      set: "Gaiahide",
      build: "STR_VIT",
      bonusSkills: [],
      bonusStats: { VIT: 22, STR: 12, HP: 240, "Phys Damage": 9, "Status Resist": 6, "Magic Resist": 4 }
    },
    "Rootsap Focus": {
      type: "armor",
      slot: "offhand",
      equipCategory: "shield",
      rarity: "rare",
      itemLevel: 22,
      image: "Assets/Equips/rootsap_focus.png",
      description: "A focus orb of condensed rootsap for defensive casters.",
      set: "",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { INT: 18, VIT: 12, HEAL: 6, "Magic Damage": 5, ACC: 4 }
    },
    "Venomstone Ring": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "epic",
      itemLevel: 31,
      image: "Assets/Equips/venomstone_ring.png",
      description: "A petrified venomstone ring tuned for coilwarden magic.",
      set: "",
      build: "INT_DEX",
      bonusSkills: [],
      bonusStats: { INT: 23, DEX: 12, "Magic Damage": 7, ACC: 6, Crit: 4 }
    },
    "Granitehorn Ramplate": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "epic",
      itemLevel: 31,
      image: "Assets/Equips/granitehorn_ramplate.png",
      description: "Layered granitehorn plate for frontline bruisers.",
      set: "Granitehorn",
      build: "STR_VIT",
      bonusSkills: [],
      bonusStats: { STR: 24, VIT: 18, HP: 260, "Phys Resist": 8, "Phys Damage": 6 }
    },
    "Breaker's Horn Bracers": {
      type: "armor",
      slot: "bracelet",
      equipCategory: "bracelet",
      rarity: "epic",
      itemLevel: 31,
      image: "Assets/Equips/breakers_horn_bracers.png",
      description: "Horn-plated bracers that channel the breaker's crushing force.",
      set: "Granitehorn",
      build: "STR_DEX",
      bonusSkills: [],
      bonusStats: { STR: 25, DEX: 12, "Phys Damage": 8, ACC: 5, Crit: 4 }
    },
    "Colossus Stoneplate": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "epic",
      itemLevel: 32,
      image: "Assets/Equips/colossus_stoneplate.png",
      description: "Stillstone warplate from the heart of the sanctum.",
      set: "Held Colossus",
      build: "VIT_STR",
      bonusSkills: [],
      bonusStats: { VIT: 30, STR: 22, HP: 360, "Phys Resist": 10, "Status Resist": 6 }
    },
    "Stillstone Helm": {
      type: "armor",
      slot: "head",
      equipCategory: "helmet",
      rarity: "epic",
      itemLevel: 32,
      image: "Assets/Equips/stillstone_helm.png",
      description: "A helm carved from breath-held stillstone.",
      set: "Held Colossus",
      build: "VIT_STR",
      bonusSkills: [],
      bonusStats: { VIT: 26, STR: 18, HP: 280, "Magic Resist": 8, "Status Resist": 7 }
    },
    "Faultvein Pants": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "epic",
      itemLevel: 33,
      image: "Assets/Equips/faultvein_pants.png",
      description: "Fault-veined legplates that anchor the wearer against quakes.",
      set: "Held Colossus",
      build: "VIT_STR",
      bonusSkills: [],
      bonusStats: { VIT: 28, STR: 16, HP: 300, "Phys Resist": 8, "Magic Resist": 5 }
    },
    "Mountainheart Maul": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "polearm",
      rarity: "epic",
      itemLevel: 33,
      image: "Assets/Equips/mountainheart_maul.png",
      description: "A sanctum polearm forged around a mountainheart core.",
      set: "Held Colossus",
      build: "STR_VIT",
      bonusSkills: [],
      bonusStats: { STR: 30, VIT: 22, HP: 220, "Phys Damage": 9, "Phys Resist": 6 }
    },
    "Pressurecore Amulet": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "epic",
      itemLevel: 33,
      image: "Assets/Equips/pressurecore_amulet.png",
      description: "An amulet housing pressure from the Held Colossus's core.",
      set: "",
      build: "VIT_STR",
      bonusSkills: [],
      bonusStats: { VIT: 24, STR: 20, HP: 240, "Status Resist": 8, "Phys Resist": 6 }
    },
    "Whitebark Grace Amulet": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "epic",
      itemLevel: 31,
      image: "Assets/Equips/whitebark_grace_amulet.png",
      description: "A grace amulet woven from whitebark prayer and winter mend.",
      set: "",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { INT: 24, VIT: 18, HEAL: 8, "Magic Resist": 6, "Status Resist": 5, HP: 160 }
    },
    "Frosthorn Warplate": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "epic",
      itemLevel: 31,
      image: "Assets/Equips/frosthorn_warplate.png",
      description: "Icehide warplate from the Frosthorn Bulwark's frozen guard.",
      set: "Frosthorn",
      build: "VIT_STR",
      bonusSkills: [],
      bonusStats: { VIT: 25, STR: 16, HP: 280, "Phys Resist": 8, "Magic Resist": 6 }
    },
    "Bulwark Frost Bracers": {
      type: "armor",
      slot: "bracelet",
      equipCategory: "wristband",
      rarity: "epic",
      itemLevel: 31,
      image: "Assets/Equips/bulwark_frost_bracers.png",
      description: "Frost-braced vambraces that answer every heavy blow with cold.",
      set: "Frosthorn",
      build: "VIT_STR",
      bonusSkills: [],
      bonusStats: { VIT: 22, STR: 14, HP: 220, "Status Resist": 6, "Phys Resist": 6, ACC: 4 }
    },
    "Frosthoof Greaves": {
      type: "armor",
      slot: "feet",
      equipCategory: "boots",
      rarity: "epic",
      itemLevel: 32,
      image: "Assets/Equips/frosthoof_greaves.png",
      description: "Hoof-scored greaves that anchor the wearer against winter stagger.",
      set: "Frosthorn",
      build: "VIT_STR",
      bonusSkills: [],
      bonusStats: { VIT: 20, STR: 15, HP: 180, "Phys Resist": 5, "Magic Resist": 4, "Status Resist": 4 }
    },
    "Child's Frost Veil": {
      type: "armor",
      slot: "head",
      equipCategory: "veil",
      rarity: "epic",
      itemLevel: 32,
      image: "Assets/Equips/childs_frost_veil.png",
      description: "A lullaby veil woven from scraps of the sleeping child's frost.",
      set: "Sleeping Winter",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { INT: 30, VIT: 20, HEAL: 8, "Magic Damage": 7, ACC: 6 }
    },
    "Cradlewood Robe": {
      type: "armor",
      slot: "chest",
      equipCategory: "robe",
      rarity: "epic",
      itemLevel: 32,
      image: "Assets/Equips/cradlewood_robe.png",
      description: "A cradlewood robe that hums with innocent winter warmth.",
      set: "Sleeping Winter",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { VIT: 30, INT: 24, HP: 320, "Magic Resist": 9, "Status Resist": 7 }
    },
    "Innocent Winter Pants": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "epic",
      itemLevel: 33,
      image: "Assets/Equips/innocent_winter_pants.png",
      description: "Soft winter legwraps that let the wearer slip through still air.",
      set: "Sleeping Winter",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { VIT: 26, INT: 22, HP: 260, EVA: 5, "Magic Resist": 6, "Status Resist": 5 }
    },
    "Lullaby Staff": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "staff",
      rarity: "epic",
      itemLevel: 33,
      image: "Assets/Equips/lullaby_staff.png",
      description: "A two-handed staff that sings frost into every mend and curse.",
      set: "Sleeping Winter",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { INT: 34, VIT: 18, "Magic Damage": 10, HEAL: 7, ACC: 7, Crit: 4 }
    },
    "Frozen Heartseed Ring": {
      type: "armor",
      slot: "ring",
      equipCategory: "ring",
      rarity: "epic",
      itemLevel: 33,
      image: "Assets/Equips/frozen_heartseed_ring.png",
      description: "A ring holding a frozen heartseed from the innocent winter.",
      set: "",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { INT: 25, VIT: 18, HP: 200, HEAL: 6, "Magic Resist": 6, "Status Resist": 5 }
    },
  /* END SYNCED MMO ITEMS */

    "Small Bone": {
      type: "material",
      value: 5,
      image: "Assets/Resources/small_bone.png",
      description: "Small Bone used in crafting."
    },

    "Blood Herb": {
      type: "material",
      value: 5,
      image: "Assets/Resources/blood_herb.png",
      description: "Blood Herb used in crafting."
    },

    "Stone Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/stone_fragment.png",
      description: "Stone Fragment used in crafting."
    },

    "Claw Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/claw_fragment.png",
      description: "Claw Fragment used in crafting."
    },

    "Abyss Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/abyss_core.png",
      description: "Abyss Core used in crafting and loot."
    },
    "Abyss Flesh": {
      type: "material",
      value: 5,
      image: "Assets/Resources/abyss_flesh.png",
      description: "Abyss Flesh used in crafting and loot."
    },
    "Abyss Residue": {
      type: "material",
      value: 5,
      image: "Assets/Resources/abyss_residue.png",
      description: "Abyss Residue used in crafting and loot."
    },
    "Abyssal Essence": {
      type: "material",
      value: 5,
      image: "Assets/Resources/abyssal_essence.png",
      description: "Abyssal Essence used in crafting and loot."
    },
    "Advanced Mechanism": {
      type: "material",
      value: 5,
      image: "Assets/Resources/advanced_mechanism.png",
      description: "Advanced Mechanism used in crafting and loot."
    },
    "Agility Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/agility_core.png",
      description: "Agility Core used in crafting and loot."
    },
    "Alpha Pelt": {
      type: "material",
      value: 5,
      image: "Assets/Resources/alpha_pelt.png",
      description: "Alpha Pelt used in crafting and loot."
    },
    "Ancient Bark": {
      type: "material",
      value: 5,
      image: "Assets/Resources/ancient_bark.png",
      description: "Ancient Bark used in crafting and loot."
    },
    "Ancient Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/ancient_fragment.png",
      description: "Ancient Fragment used in crafting and loot."
    },
    "Ancient Seed": {
      type: "material",
      value: 5,
      image: "Assets/Resources/ancient_seed.png",
      description: "Ancient Seed used in crafting and loot."
    },
    "Ancient Soul Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/ancient_soul_core.png",
      description: "Ancient Soul Core used in crafting and loot."
    },
    "Antler Piece": {
      type: "material",
      value: 5,
      image: "Assets/Resources/antler_piece.png",
      description: "Antler Piece used in crafting and loot."
    },
    "Apex Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/apex_core.png",
      description: "Apex Core used in crafting and loot."
    },
    "Ash Residue": {
      type: "material",
      value: 5,
      image: "Assets/Resources/ash_residue.png",
      description: "Ash Residue used in crafting and loot."
    },
    "Ash Scale": {
      type: "material",
      value: 5,
      image: "Assets/Resources/ash_scale.png",
      description: "Ash Scale used in crafting and loot."
    },
    "Assassin Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/assasin_core.png",
      description: "Assassin Core used in crafting and loot."
    },
    "Bark": {
      type: "material",
      value: 5,
      image: "Assets/Resources/bark.png",
      description: "Bark used in crafting and loot."
    },
    "Bark Fiber": {
      type: "material",
      value: 5,
      image: "Assets/Resources/bark_fiber.png",
      description: "Bark Fiber used in crafting and loot."
    },
    "Bark Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/spirit_bark.png",
      description: "Bark Fragment used in crafting and loot."
    },
    "Basilisk Eye": {
      type: "material",
      value: 5,
      image: "Assets/Resources/basilisk_eye.png",
      description: "Basilisk Eye used in crafting and loot."
    },
    "Boar Tusk": {
      type: "material",
      value: 5,
      image: "Assets/Resources/boar_tusk.png",
      description: "Boar Tusk used in crafting and loot."
    },
    "Bone Dust": {
      type: "material",
      value: 5,
      image: "Assets/Resources/bone_dust.png",
      description: "Bone Dust used in crafting and loot."
    },
    "Bone Shard": {
      type: "material",
      value: 5,
      image: "Assets/Resources/bone_shard.png",
      description: "Bone Shard used in crafting and loot."
    },
    "Bound Remains": {
      type: "material",
      value: 5,
      image: "Assets/Resources/bound_remains.png",
      description: "Bound Remains used in crafting and loot."
    },
    "Bound Soul": {
      type: "material",
      value: 5,
      image: "Assets/Resources/bound_soul.png",
      description: "Bound Soul used in crafting and loot."
    },
    "Bulwark Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/bulwark_core.png",
      description: "Bulwark Core used in crafting and loot."
    },
    "Burnt Hide": {
      type: "material",
      value: 5,
      image: "Assets/Resources/burnt_hide.png",
      description: "Burnt Hide used in crafting and loot."
    },
    "Carapace Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/carapace_fragment.png",
      description: "Carapace Fragment used in crafting and loot."
    },
    "Charged Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/charged_core.png",
      description: "Charged Core used in crafting and loot."
    },
    "Chill Residue": {
      type: "material",
      value: 5,
      image: "Assets/Resources/chill_residue.png",
      description: "Chill Residue used in crafting and loot."
    },
    "Cliff Moss": {
      type: "material",
      value: 5,
      image: "Assets/Resources/cliff_moss.png",
      description: "Cliff Moss used in crafting and loot."
    },
    "Condensed Soul": {
      type: "material",
      value: 5,
      image: "Assets/Resources/condesed_core.png",
      description: "Condensed Soul used in crafting and loot."
    },
    "Control Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/control_core.png",
      description: "Control Core used in crafting and loot."
    },
    "Corroded Gear": {
      type: "material",
      value: 5,
      image: "Assets/Resources/corroded_gear.png",
      description: "Corroded Gear used in crafting and loot."
    },
    "Corrosive Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/corrosive_core.png",
      description: "Corrosive Core used in crafting and loot."
    },
    "Crushing Essence": {
      type: "material",
      value: 5,
      image: "Assets/Resources/crushing_essence.png",
      description: "Crushing Essence used in crafting and loot."
    },
    "Crust Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/crust_fragment.png",
      description: "Crust Fragment used in crafting and loot."
    },
    "Crystal Stone": {
      type: "material",
      value: 5,
      image: "Assets/Resources/crystal_stone.png",
      description: "Crystal Stone used in crafting and loot."
    },
    "Crystalized Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/crystallized_core.png",
      description: "Crystalized Core used in crafting and loot."
    },
    "Dark Residue": {
      type: "material",
      value: 5,
      image: "Assets/Resources/dark_residue.png",
      description: "Dark Residue used in crafting and loot."
    },
    "Decay Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/decay_fragment.png",
      description: "Decay Fragment used in crafting and loot."
    },
    "Deepwater Essence": {
      type: "material",
      value: 5,
      image: "Assets/Resources/deepwater_essence.png",
      description: "Deepwater Essence used in crafting and loot."
    },
    "Defense Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/defense_core.png",
      description: "Defense Core used in crafting and loot."
    },
    "Defensive Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/defensive_core.png",
      description: "Defensive Core used in crafting and loot."
    },
    "Dense Bone": {
      type: "material",
      value: 5,
      image: "Assets/Resources/dense_bone.png",
      description: "Dense Bone used in crafting and loot."
    },
    "Dense Fur": {
      type: "material",
      value: 5,
      image: "Assets/Resources/dense_fur.png",
      description: "Dense Fur used in crafting and loot."
    },
    "Dense Stone": {
      type: "material",
      value: 5,
      image: "Assets/Resources/dense_stone.png",
      description: "Dense Stone used in crafting and loot."
    },
    "Devourer Tooth": {
      type: "material",
      value: 5,
      image: "Assets/Resources/devourer_tooth.png",
      description: "Devourer Tooth used in crafting and loot."
    },
    "Digging Claw": {
      type: "material",
      value: 5,
      image: "Assets/Resources/digging_claw.png",
      description: "Digging Claw used in crafting and loot."
    },
    "Distorted Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/distorted_core.png",
      description: "Distorted Core used in crafting and loot."
    },
    "Dust Essence": {
      type: "material",
      value: 5,
      image: "Assets/Resources/dust_essence.png",
      description: "Dust Essence used in crafting and loot."
    },
    "Earth Residue": {
      type: "material",
      value: 5,
      image: "Assets/Resources/earth_residue.png",
      description: "Earth Residue used in crafting and loot."
    },
    "Echo Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/echo_fragment.png",
      description: "Echo Fragment used in crafting and loot."
    },
    "Elastic Tendon": {
      type: "material",
      value: 5,
      image: "Assets/Resources/elastic_tendon.png",
      description: "Elastic Tendon used in crafting and loot."
    },
    "Elemental Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/elemental_fragment.png",
      description: "Elemental Fragment used in crafting and loot."
    },
    "Elite Bone": {
      type: "material",
      value: 5,
      image: "Assets/Resources/elite_bone.png",
      description: "Elite Bone used in crafting and loot."
    },
    "Elite Hide": {
      type: "material",
      value: 5,
      image: "Assets/Resources/elite_hide.png",
      description: "Elite Hide used in crafting and loot."
    },
    "Ember Dust": {
      type: "material",
      value: 5,
      image: "Assets/Resources/ember_dust.png",
      description: "Ember Dust used in crafting and loot."
    },
    "Ember Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/ember_fragment.png",
      description: "Ember Fragment used in crafting and loot."
    },
    "Endurance Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/endurance_core.png",
      description: "Endurance Core used in crafting and loot."
    },
    "Faint Residue": {
      type: "material",
      value: 5,
      image: "Assets/Resources/faint_residue.png",
      description: "Faint Residue used in crafting and loot."
    },
    "Fire Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/fire_core.png",
      description: "Fire Core used in crafting and loot."
    },
    "Fire Seed": {
      type: "material",
      value: 5,
      image: "Assets/Resources/fire_seed.png",
      description: "Fire Seed used in crafting and loot."
    },
    "Flame Essence": {
      type: "material",
      value: 5,
      image: "Assets/Resources/flame_essence.png",
      description: "Flame Essence used in crafting and loot."
    },
    "Flexible Reinforced Leather": {
      type: "material",
      value: 5,
      image: "Assets/Resources/flexible_reinforced_leather.png",
      description: "Flexible Reinforced Leather used in crafting and loot."
    },
    "Fluid Sac": {
      type: "material",
      value: 5,
      image: "Assets/Resources/fluid_sac.png",
      description: "Fluid Sac used in crafting and loot."
    },
    "Forest Fur": {
      type: "material",
      value: 5,
      image: "Assets/Resources/forest_fur.png",
      description: "Forest Fur used in crafting and loot."
    },
    "Fragmented Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/fragmented_core.png",
      description: "Fragmented Core used in crafting and loot."
    },
    "Frost Claw": {
      type: "material",
      value: 5,
      image: "Assets/Resources/frost_claw.png",
      description: "Frost Claw used in crafting and loot."
    },
    "Frost Thread": {
      type: "material",
      value: 5,
      image: "Assets/Resources/frost_thread.png",
      description: "Frost Thread used in crafting and loot."
    },
    "Frozen Shell": {
      type: "material",
      value: 5,
      image: "Assets/Resources/frozen_shell.png",
      description: "Frozen Shell used in crafting and loot."
    },
    "Fur Pelt": {
      type: "material",
      value: 5,
      image: "Assets/Resources/fur_pelt.png",
      description: "Fur Pelt used in crafting and loot."
    },
    "Growth Seed": {
      type: "material",
      value: 5,
      image: "Assets/Resources/growth_seed.png",
      description: "Growth Seed used in crafting and loot."
    },
    "Hardened Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/hardened_core.png",
      description: "Hardened Core used in crafting and loot."
    },
    "Hardened Leather": {
      type: "material",
      value: 5,
      image: "Assets/Resources/hardened_leather.png",
      description: "Hardened Leather used in crafting and loot."
    },
    "Heat Shell": {
      type: "material",
      value: 5,
      image: "Assets/Resources/heat_shell.png",
      description: "Heat Shell used in crafting and loot."
    },
    "Heavy Bone": {
      type: "material",
      value: 5,
      image: "Assets/Resources/heavy_bone.png",
      description: "Heavy Bone used in crafting and loot."
    },
    "Heavy Fang": {
      type: "material",
      value: 5,
      image: "Assets/Resources/heavy_fang.png",
      description: "Heavy Fang used in crafting and loot."
    },
    "Hunger Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/hunger_core.png",
      description: "Hunger Core used in crafting and loot."
    },
    "Hunter Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/hunter_core.png",
      description: "Crystallized instinct for pursuit, timing, and finishing pressure."
    },
    "Ice Essence": {
      type: "material",
      value: 5,
      image: "Assets/Resources/ice_essence.png",
      description: "Ice Essence used in crafting and loot."
    },
    "Ice Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/ice_fragment.png",
      description: "Ice Fragment used in crafting and loot."
    },
    "Illusion Essence": {
      type: "material",
      value: 5,
      image: "Assets/Resources/illusion_essence.png",
      description: "Illusion Essence used in crafting and loot."
    },
    "Illusion Thread": {
      type: "material",
      value: 5,
      image: "Assets/Resources/illusion_thread.png",
      description: "Illusion Thread used in crafting and loot."
    },
    "Infused Dust": {
      type: "material",
      value: 5,
      image: "Assets/Resources/infused_dust.png",
      description: "Infused Dust used in crafting and loot."
    },
    "Jungle Fiber": {
      type: "material",
      value: 5,
      image: "Assets/Resources/jungle_fiber.png",
      description: "Jungle Fiber used in crafting and loot."
    },
    "Lava Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/lava_core.png",
      description: "Lava Core used in crafting and loot."
    },
    "Life Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/life_core.png",
      description: "Life Core used in crafting and loot."
    },
    "Living Bark": {
      type: "material",
      value: 5,
      image: "Assets/Resources/living_bark.png",
      description: "Living Bark used in crafting and loot."
    },
    "Living Fiber": {
      type: "material",
      value: 5,
      image: "Assets/Resources/living_fiber.png",
      description: "Living Fiber used in crafting and loot."
    },
    "Magma Hide": {
      type: "material",
      value: 5,
      image: "Assets/Resources/magma_hide.png",
      description: "Magma Hide used in crafting and loot."
    },
    "Mechanism Part": {
      type: "material",
      value: 5,
      image: "Assets/Resources/mechanism_part.png",
      description: "Mechanism Part used in crafting and loot."
    },
    "Metal Essence": {
      type: "material",
      value: 5,
      image: "Assets/Resources/metal_essence.png",
      description: "Metal Essence used in crafting and loot."
    },
    "Metal Scrap": {
      type: "material",
      value: 5,
      image: "Assets/Resources/metal_scrap.png",
      description: "Metal Scrap used in crafting and loot."
    },
    "Molten Scale": {
      type: "material",
      value: 5,
      image: "Assets/Resources/molten_scale.png",
      description: "Molten Scale used in crafting and loot."
    },
    "Muscle Fiber": {
      type: "material",
      value: 5,
      image: "Assets/Resources/muscle_fiber.png",
      description: "Muscle Fiber used in crafting and loot."
    },
    "Mythic Hide": {
      type: "material",
      value: 5,
      image: "Assets/Resources/mythic_hide.png",
      description: "Mythic Hide used in crafting and loot."
    },
    "Ocean Essence": {
      type: "material",
      value: 5,
      image: "Assets/Resources/ocean_essence.png",
      description: "Ocean Essence used in crafting and loot."
    },
    "Perfect Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/perfect_core.png",
      description: "Perfect Core used in crafting and loot."
    },
    "Perfected Leather": {
      type: "material",
      value: 5,
      image: "Assets/Resources/perfect_leather.png",
      description: "Perfected Leather used in crafting and loot."
    },
    "Petrify Gland": {
      type: "material",
      value: 5,
      image: "Assets/Resources/petrify_gland.png",
      description: "Petrify Gland used in crafting and loot."
    },
    "Plant Fiber": {
      type: "material",
      value: 5,
      image: "Assets/Resources/plant_fiber.png",
      description: "Plant Fiber used in crafting and loot."
    },
    "Poison Essence": {
      type: "material",
      value: 5,
      image: "Assets/Resources/poison_essence.png",
      description: "Poison Essence used in crafting and loot."
    },
    "Precision Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/precision_core.png",
      description: "Precision Core used in crafting and loot."
    },
    "Predator Fang": {
      type: "material",
      value: 5,
      image: "Assets/Resources/predator_fang.png",
      description: "Predator Fang used in crafting and loot."
    },
    "Predator Instinct Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/predator_instinct_core.png",
      description: "Predator Instinct Core used in crafting and loot."
    },
    "Pressure Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/pressure_core.png",
      description: "Pressure Core used in crafting and loot."
    },
    "Crushed Anchor Shard": {
      type: "material",
      value: 5,
      image: "Assets/Resources/crushed_anchor_shard.png",
      description: "Core shard from a tidebound anchor. Used for Strength and armor penetration gear."
    },
    "Salt-Encrusted Plate": {
      type: "material",
      value: 5,
      image: "Assets/Resources/salt_encrusted_plate.png",
      description: "Salt-hardened plating used for armor and damage reduction gear."
    },
    "Barnacle Cluster": {
      type: "material",
      value: 5,
      image: "Assets/Resources/bernacle_cluster.png",
      description: "Dense barnacle growth used for defensive and hybrid gear."
    },
    "Abyssal Thread": {
      type: "material",
      value: 5,
      image: "Assets/Resources/abyssal_thread.png",
      description: "A wet abyssal filament used for debuff-focused crafting."
    },
    "Echo Residue": {
      type: "material",
      value: 5,
      image: "Assets/Resources/echo_residue.png",
      description: "Lingering echo residue used to extend control effects."
    },
    "Drowned Sigil Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/drowned_sigil_fragment.png",
      description: "A fractured drowned sigil used for advanced control accessories."
    },
    "Abyssal Lightning Scale": {
      type: "material",
      value: 5,
      image: "Assets/Resources/abyssal_lightning_scale.png",
      description: "A scale crackling with abyssal lightning, taken from the Stormwake Leviathan."
    },
    "Charged Brine Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/charged_brine_core.png",
      description: "A brine-saturated power core from abyssal tempests; used in storm and control crafts."
    },
    "Drowned Spark Residue": {
      type: "material",
      value: 5,
      image: "Assets/Resources/drowned_spark_residue.png",
      description: "Faint sparking residue from drowned storm sigils."
    },
    "Eye of the Maelstrom": {
      type: "material",
      value: 5,
      image: "Assets/Resources/eye_of_the_maelstrom.png",
      description: "A still-churning focus from the heart of a maelstrom; used in jeweler storm crafts."
    },
    "Leviathan Stormcore": {
      type: "material",
      value: 5,
      image: "Assets/Resources/leviathan_stormcore.png",
      description: "A dense storm core from the leviathan; anchor material for high-tier storm gear."
    },
    "Charged Scale": {
      type: "material",
      value: 5,
      image: "Assets/Resources/charged_scale.png",
      description: "Stormfang scale charged with coastal static; used in storm-themed armor and weapons."
    },
    "Static Fang Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/static_fang_core.png",
      description: "A crystallized fang core that holds a stormfang's bite."
    },
    "Stormfang Claw": {
      type: "material",
      value: 5,
      image: "Assets/Resources/stormfang_claw.png",
      description: "A talon from a Stormfang Ravager, sharp enough for fine metalwork."
    },
    "Stormhide Strip": {
      type: "material",
      value: 5,
      image: "Assets/Resources/stormhide_strip.png",
      description: "Treated stormhide strip; flexible and weather-sealed for boots and leathers."
    },
    "Storm Sigil Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/storm_sigil_fragment.png",
      description: "A shard of a storm sigil from the abyssal tempest caller's rites."
    },
    "Stormwake Tendril": {
      type: "material",
      value: 5,
      image: "Assets/Resources/stormwake_tendril.png",
      description: "A writhing storm-tendril sample from the deep grotto leviathan."
    },
    "Tempest Thread": {
      type: "material",
      value: 5,
      image: "Assets/Resources/tempest_thread.png",
      description: "Woven tempest thread used for staff bindings and storm-channeling gear."
    },
    "Tidemother Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/tidemother_core.png",
      description: "Boss core from the Tidemother Aberration. Used for high-value abyssal items."
    },
    "Echo Heart": {
      type: "material",
      value: 5,
      image: "Assets/Resources/echo_heart.png",
      description: "A pulsing heart of abyssal echoes used in boss-tier crafting."
    },
    "Corrupted Brine Flesh": {
      type: "material",
      value: 5,
      image: "Assets/Resources/corrupted_brine_flesh.png",
      description: "Corrupted brine flesh used for resilient abyssal armor."
    },
    "Primal Essence": {
      type: "material",
      value: 5,
      image: "Assets/Resources/primal_essence.png",
      description: "Primal Essence used in crafting and loot."
    },
    "Primal Fur": {
      type: "material",
      value: 5,
      image: "Assets/Resources/primal_fur.png",
      description: "Primal Fur used in crafting and loot."
    },
    "Pure Essence": {
      type: "material",
      value: 5,
      image: "Assets/Resources/pure_essence.png",
      description: "Pure Essence used in crafting and loot."
    },
    "Raw Hide": {
      type: "material",
      value: 5,
      image: "Assets/Resources/raw_hide.png",
      description: "Raw Hide used in crafting and loot."
    },
    "Razor Edge Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/razor_edge_fragment.png",
      description: "Razor Edge Fragment used in crafting and loot."
    },
    "Reflex Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/reflex_core.png",
      description: "Reflex Core used in crafting and loot."
    },
    "Reinforced Bone": {
      type: "material",
      value: 5,
      image: "Assets/Resources/reinforced_bone.png",
      description: "Reinforced Bone used in crafting and loot."
    },
    "Reinforced Hide": {
      type: "material",
      value: 5,
      image: "Assets/Resources/reinforced_hide.png",
      description: "Reinforced Hide used in crafting and loot."
    },
    "Reinforced Scrap": {
      type: "material",
      value: 5,
      image: "Assets/Resources/reinforced_scrap.png",
      description: "Reinforced Scrap used in crafting and loot."
    },
    "Reinforced Stone": {
      type: "material",
      value: 5,
      image: "Assets/Resources/reinforced_stone.png",
      description: "Reinforced Stone used in crafting and loot."
    },
    "Residue": {
      type: "material",
      value: 5,
      image: "Assets/Resources/residue.png",
      description: "Residue used in crafting and loot."
    },
    "Resonance Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/resonance_core.png",
      description: "Resonance Core used in crafting and loot."
    },
    "Revenant Core Material": {
      type: "material",
      value: 5,
      image: "Assets/Resources/revenant_core_material.png",
      description: "Revenant Core Material used in crafting and loot."
    },
    "Ripple Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/ripple_core.png",
      description: "Ripple Core used in crafting and loot."
    },
    "Alpha Fang": {
      type: "material",
      value: 5,
      image: "Assets/Resources/alpha_fang.png",
      description: "A dominant fang from the Fangroot Alpha."
    },
    "Ancient Gaia Sap": {
      type: "material",
      value: 5,
      image: "Assets/Resources/ancient_gaia_sap.png",
      description: "Ancient sap crystallized within the Gaiahide Behemoth."
    },
    "Behemoth Rootbone": {
      type: "material",
      value: 5,
      image: "Assets/Resources/behemoth_rootbone.png",
      description: "Dense rootbone from the Gaiahide Behemoth."
    },
    "Bloodroot Hide": {
      type: "material",
      value: 5,
      image: "Assets/Resources/bloodroot_hide.png",
      description: "Blood-soaked hide stripped from the Fangroot Alpha."
    },
    "Bramblehorn Shard": {
      type: "material",
      value: 5,
      image: "Assets/Resources/bramblehorn_shard.png",
      description: "A splintered horn shard from the Bramblehorn Matriarch."
    },
    "Fangroot Claw": {
      type: "material",
      value: 5,
      image: "Assets/Resources/fangroot_claw.png",
      description: "A claw from the Fangroot Alpha, ideal for blades and rings."
    },
    "Gaia Sap Antler": {
      type: "material",
      value: 5,
      image: "Assets/Resources/gaia_sap_antler.png",
      description: "Sap-filled antler from the Bramblehorn Matriarch."
    },
    "Gaiahide Plate": {
      type: "material",
      value: 5,
      image: "Assets/Resources/gaiahide_plate.png",
      description: "Layered hide plate from the Gaiahide Behemoth."
    },
    "Petrified Scale": {
      type: "material",
      value: 5,
      image: "Assets/Resources/petrified_scale.png",
      description: "Petrified scale shed by the Petrified Coilwarden."
    },
    "Venomstone Fang": {
      type: "material",
      value: 5,
      image: "Assets/Resources/venomstone_fang.png",
      description: "A venomstone fang from the Petrified Coilwarden."
    },
    "Mineral Venom Sac": {
      type: "material",
      value: 5,
      image: "Assets/Resources/mineral_venom_sac.png",
      description: "A mineral-veined venom sac from the Coilwarden."
    },
    "Coilwarden Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/coilwarden_core.png",
      description: "Dense core from the Petrified Coilwarden."
    },
    "Granite Horn Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/granite_horn_fragment.png",
      description: "Splintered granite horn from the Granitehorn Breaker."
    },
    "Breaker Hide Plate": {
      type: "material",
      value: 5,
      image: "Assets/Resources/breaker_hide_plate.png",
      description: "Layered hide plate stripped from the Granitehorn Breaker."
    },
    "Faultline Hoof": {
      type: "material",
      value: 5,
      image: "Assets/Resources/faultline_hoof.png",
      description: "A fault-scored hoof from the Granitehorn Breaker."
    },
    "Hornbreaker Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/hornbreaker_core.png",
      description: "Crushing core from the Granitehorn Breaker."
    },
    "Colossus Plate Shard": {
      type: "material",
      value: 5,
      image: "Assets/Resources/colossus_stoneplate_shard.png",
      description: "Stoneplate shard torn from the Held Colossus."
    },
    "Stillstone Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/stillstone_fragment.png",
      description: "Stillstone fragment shaken loose from the Held Colossus."
    },
    "Faultvein Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/faultvein_core.png",
      description: "Fault-veined core from the Held Colossus."
    },
    "Pressurecore Heart": {
      type: "material",
      value: 5,
      image: "Assets/Resources/pressurecore_heart.png",
      description: "A pressure core heart from the Held Colossus."
    },
    "Mountainbound Soulstone": {
      type: "material",
      value: 5,
      image: "Assets/Resources/mountainbound_soulstone.png",
      description: "Rare soulstone bound to the mountain's held breath."
    },
    "Soft Pine Fur": {
      type: "material",
      value: 5,
      image: "Assets/Resources/soft_pine_fur.png",
      description: "Soft fur shed by a Pinebound Fawn."
    },
    "Frost Berry": {
      type: "material",
      value: 5,
      image: "Assets/Resources/frost_berry.png",
      description: "A frost-sweet berry from the innocence pines."
    },
    "Gentle Antler Chip": {
      type: "material",
      value: 5,
      image: "Assets/Resources/gentle_antler_chip.png",
      description: "A gentle antler chip from a Pinebound Fawn."
    },
    "Grace Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/grace_core.png",
      description: "A grace core from a Pinebound Fawn."
    },
    "Frozen Needle": {
      type: "material",
      value: 5,
      image: "Assets/Resources/frozen_needle.png",
      description: "Frozen needles from a fallen pinecone."
    },
    "Ice Sap Shell": {
      type: "material",
      value: 5,
      image: "Assets/Resources/ice_sap_shell.png",
      description: "An ice-sapped shell from a Frozen Pinecone."
    },
    "Frostbite Seed": {
      type: "material",
      value: 5,
      image: "Assets/Resources/frostbite_seed.png",
      description: "A frostbite seed from a Frozen Pinecone."
    },
    "Ice Tusk Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/ice_tusk_fragment.png",
      description: "A chipped ice tusk from an Ice-Tusked Boar."
    },
    "Frosthide Plate": {
      type: "material",
      value: 5,
      image: "Assets/Resources/frosthide_plate.png",
      description: "Frosthide plate stripped from an Ice-Tusked Boar."
    },
    "Cold Rage Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/cold_rage_core.png",
      description: "A cold rage core from an Ice-Tusked Boar."
    },
    "Barkskin Shard": {
      type: "material",
      value: 5,
      image: "Assets/Resources/barkskin_shard.png",
      description: "A barkskin shard from a Barkhide Spriggan."
    },
    "Nature Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/nature_core.png",
      description: "A nature core from a Barkhide Spriggan."
    },
    "Guardian Iceplate": {
      type: "material",
      value: 5,
      image: "Assets/Resources/guardian_iceplate.png",
      description: "Iceplate shed by a Winter Guardian."
    },
    "Frozen Bark Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/frozen_bark_core.png",
      description: "A frozen bark core from a Winter Guardian."
    },
    "Winter Ward Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/winter_ward_fragment.png",
      description: "A ward fragment from a Winter Guardian."
    },
    "Whitebark Antler": {
      type: "material",
      value: 5,
      image: "Assets/Resources/whitebark_antler.png",
      description: "A whitebark antler from the Matron."
    },
    "Matron Rootcloth": {
      type: "material",
      value: 5,
      image: "Assets/Resources/matron_rootcloth.png",
      description: "Rootcloth woven by the Whitebark Matron."
    },
    "Frozen Mend Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/frozen_mend_core.png",
      description: "A mend core from the Whitebark Matron."
    },
    "Whitebark Heartseed": {
      type: "material",
      value: 5,
      image: "Assets/Resources/whitebark_heartseed.png",
      description: "A rare heartseed from the Whitebark Matron."
    },
    "Frosthorn Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/frosthorn_fragment.png",
      description: "A frosthorn fragment from the Bulwark."
    },
    "Bulwark Icehide": {
      type: "material",
      value: 5,
      image: "Assets/Resources/bulwark_icehide.png",
      description: "Bulwark icehide stripped from the Frosthorn Bulwark."
    },
    "Frozen Tusk Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/frozen_tusk_core.png",
      description: "A frozen tusk core from the Frosthorn Bulwark."
    },
    "Frosthorn Soulplate": {
      type: "material",
      value: 5,
      image: "Assets/Resources/frosthorn_soulplate.png",
      description: "A soulplate torn from the Frosthorn Bulwark."
    },
    "Frost Veil Scrap": {
      type: "material",
      value: 5,
      image: "Assets/Resources/frost_veil_scrap.png",
      description: "A scrap of frost veil shaken loose from the Sleeping Child."
    },
    "Sleeping Root Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/sleeping_root_fragment.png",
      description: "A sleeping root fragment from the innocent winter."
    },
    "Innocent Winter Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/innocent_winter_core.png",
      description: "An innocent winter core from the sleeping child."
    },
    "Frozen Heartseed": {
      type: "material",
      value: 5,
      image: "Assets/Resources/frozen_heartseed.png",
      description: "A frozen heartseed from the Sleeping Child of Winter."
    },
    "Lullaby Soulcore": {
      type: "material",
      value: 5,
      image: "Assets/Resources/lullaby_soulcore.png",
      description: "A rare lullaby soulcore from the Sleeping Child of Winter."
    },
    "Heartburrow Horn": {
      type: "material",
      value: 5,
      image: "Assets/Resources/heartburrow_horn.png",
      description: "A horn core from deep within the Rootwarren behemoth."
    },
    "Living Bramble Fiber": {
      type: "material",
      value: 5,
      image: "Assets/Resources/living_bramble_fiber.png",
      description: "Still-living bramble fiber from the Matriarch's ward."
    },
    "Predator Sap": {
      type: "material",
      value: 5,
      image: "Assets/Resources/predator_sap.png",
      description: "Predatory sap distilled from the Fangroot Alpha."
    },
    "Root Fiber": {
      type: "material",
      value: 5,
      image: "Assets/Resources/root_fiber.png",
      description: "Root Fiber used in crafting and loot."
    },
    "Rootmend Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/rootmend_core.png",
      description: "A mending core from the Bramblehorn Matriarch."
    },
    "Rootquake Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/rootquake_core.png",
      description: "A tremor core shaken loose from the Gaiahide Behemoth."
    },
    "Rough Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/rough_core.png",
      description: "Rough Core used in crafting and loot."
    },
    "Rusted Metal": {
      type: "material",
      value: 5,
      image: "Assets/Resources/rusted_metal.png",
      description: "Rusted Metal used in crafting and loot."
    },
    "Salt Flesh": {
      type: "material",
      value: 5,
      image: "Assets/Resources/salt_flesh.png",
      description: "Salt Flesh used in crafting and loot."
    },
    "Sand Blade Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/sand_blade_fragment.png",
      description: "Sand Blade Fragment used in crafting and loot."
    },
    "Sand Residue": {
      type: "material",
      value: 5,
      image: "Assets/Resources/sand_residue.png",
      description: "Sand Residue used in crafting and loot."
    },
    "Scaled Skin": {
      type: "material",
      value: 5,
      image: "Assets/Resources/scaled_skin.png",
      description: "Scaled Skin used in crafting and loot."
    },
    "Seeds": {
      type: "material",
      value: 5,
      image: "Assets/Resources/seeds.png",
      description: "Seeds used in crafting and loot."
    },
    "Shadow Dust": {
      type: "material",
      value: 5,
      image: "Assets/Resources/shadow_dust.png",
      description: "Shadow Dust used in crafting and loot."
    },
    "Shadow Essence": {
      type: "material",
      value: 5,
      image: "Assets/Resources/shadow_essence.png",
      description: "Shadow Essence used in crafting and loot."
    },
    "Shadow Residue": {
      type: "material",
      value: 5,
      image: "Assets/Resources/shadow_residue.png",
      description: "Shadow Residue used in crafting and loot."
    },
    "Small Tooth": {
      type: "material",
      value: 5,
      image: "Assets/Resources/small_tooth.png",
      description: "Small Tooth used in crafting and loot."
    },
    "Soft Leather": {
      type: "material",
      value: 5,
      image: "Assets/Resources/soft_leather.png",
      description: "Soft Leather used in crafting and loot."
    },
    "Solid Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/solid_core.png",
      description: "Solid Core used in crafting and loot."
    },
    "Soul Dust": {
      type: "material",
      value: 5,
      image: "Assets/Resources/soul_dust.png",
      description: "Soul Dust used in crafting and loot."
    },
    "Soul Residue": {
      type: "material",
      value: 5,
      image: "Assets/Resources/soul_residue.png",
      description: "Soul Residue used in crafting and loot."
    },
    "Spirit Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/spirit_core.png",
      description: "Spirit Core used in crafting and loot."
    },
    "Spirit Essence": {
      type: "material",
      value: 5,
      image: "Assets/Resources/spirit_essence.png",
      description: "Spirit Essence used in crafting and loot."
    },
    "Spirit Seed": {
      type: "material",
      value: 5,
      image: "Assets/Resources/spirit_seed.png",
      description: "Spirit Seed used in crafting and loot."
    },
    "Spirit Thread": {
      type: "material",
      value: 5,
      image: "Assets/Resources/spirit_thread.png",
      description: "Spirit Thread used in crafting and loot."
    },
    "Stable Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/stable_core.png",
      description: "Stable Core used in crafting and loot."
    },
    "Stone Claw": {
      type: "material",
      value: 5,
      image: "Assets/Resources/stone_claw.png",
      description: "Stone Claw used in crafting and loot."
    },
    "Stone Scale": {
      type: "material",
      value: 5,
      image: "Assets/Resources/stone_scale.png",
      description: "Stone Scale used in crafting and loot."
    },
    "Stone Skin": {
      type: "material",
      value: 5,
      image: "Assets/Resources/stone_skin.png",
      description: "Stone Skin used in crafting and loot."
    },
    "Strength Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/strength_core.png",
      description: "Strength Core used in crafting and loot."
    },
    "Support Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/support_core.png",
      description: "Support Core used in crafting and loot."
    },
    "Talon Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/talon_fragment.png",
      description: "Talon Fragment used in crafting and loot."
    },
    "Thick Fur": {
      type: "material",
      value: 5,
      image: "Assets/Resources/thick_fur.png",
      description: "Thick Fur used in crafting and loot."
    },
    "Thin Fur": {
      type: "material",
      value: 5,
      image: "Assets/Resources/thin_fur.png",
      description: "Thin Fur used in crafting and loot."
    },
    "Tidal Essence": {
      type: "material",
      value: 5,
      image: "Assets/Resources/tidal_essence.png",
      description: "Tidal Essence used in crafting and loot."
    },
    "Tide Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/tide_fragment.png",
      description: "Tide Fragment used in crafting and loot."
    },
    "Titan Bone": {
      type: "material",
      value: 5,
      image: "Assets/Resources/titan_bone.png",
      description: "Titan Bone used in crafting and loot."
    },
    "Titan Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/titan_core.png",
      description: "Titan Core used in crafting and loot."
    },
    "Tough Hide": {
      type: "material",
      value: 5,
      image: "Assets/Resources/tough_hide.png",
      description: "Tough Hide used in crafting and loot."
    },
    "Toxic Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/toxic_core.png",
      description: "Toxic Core used in crafting and loot."
    },
    "Toxic Essence": {
      type: "material",
      value: 5,
      image: "Assets/Resources/toxic_essence.png",
      description: "Toxic Essence used in crafting and loot."
    },
    "Treated Leather": {
      type: "material",
      value: 5,
      image: "Assets/Resources/treated_leather.png",
      description: "Treated Leather used in crafting and loot."
    },
    "Trickster Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/trickster_core.png",
      description: "Trickster Core used in crafting and loot."
    },
    "Vital Growth": {
      type: "material",
      value: 5,
      image: "Assets/Resources/vital_growth.png",
      description: "Vital Growth used in crafting and loot."
    },
    "Water Essence": {
      type: "material",
      value: 5,
      image: "Assets/Resources/water_essence.png",
      description: "Water Essence used in crafting and loot."
    },
    "Wild Essence": {
      type: "material",
      value: 5,
      image: "Assets/Resources/wild_essence.png",
      description: "Wild Essence used in crafting and loot."
    },
    "Wind Scale": {
      type: "material",
      value: 5,
      image: "Assets/Resources/wind_scale.png",
      description: "Wind Scale used in crafting and loot."
    },
    "Withered Tissue": {
      type: "material",
      value: 5,
      image: "Assets/Resources/withered_tissue.png",
      description: "Withered Tissue used in crafting and loot."
    },
    "Thornback Carapace": {
      type: "material",
      value: 5,
      image: "Assets/Resources/thornbackCarapace.png",
      description: "Thornback Carapace used in crafting and loot."
    },
    "Grave Thorn": {
      type: "material",
      value: 5,
      image: "Assets/Resources/grave_thorn.png",
      description: "Grave Thorn used in crafting and loot."
    },
    "Bleached Shell Plate": {
      type: "material",
      value: 5,
      image: "Assets/Resources/bleached_shell_plate.png",
      description: "Bleached Shell Plate used in crafting and loot."
    },
    "Buried Bone Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/buried_bone_core.png",
      description: "Buried Bone Core used in crafting and loot."
    },
    "Mirage Jawbone": {
      type: "material",
      value: 5,
      image: "Assets/Resources/mirage_jawbone.png",
      description: "Mirage Jawbone used in crafting and loot."
    },
    "Haze-Torn Skin": {
      type: "material",
      value: 5,
      image: "Assets/Resources/haze_torn_skin.png",
      description: "Haze-Torn Skin used in crafting and loot."
    },
    "Thirsting Eye": {
      type: "material",
      value: 5,
      image: "Assets/Resources/thirsting_eye.png",
      description: "Thirsting Eye used in crafting and loot."
    },
    "Splintered Illusion Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/splintered_illusion_core.png",
      description: "Splintered Illusion Core used in crafting and loot."
    },
    "Mourner’s Veilcloth": {
      type: "material",
      value: 5,
      image: "Assets/Resources/mourners_veilcloth.png",
      description: "Mourner’s Veilcloth used in crafting and loot."
    },
    "Hollow Rib Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Resources/hollow_rib_fragment.png",
      description: "Hollow Rib Fragment used in crafting and loot."
    },
    "Drought Essence": {
      type: "material",
      value: 5,
      image: "Assets/Resources/drought_essence.png",
      description: "Drought Essence used in crafting and loot."
    },
    "Black Sand Heart": {
      type: "material",
      value: 5,
      image: "Assets/Resources/black_sand_heart.png",
      description: "Black Sand Heart used in crafting and loot."
    },
    "Mawbound Soulcore": {
      type: "material",
      value: 5,
      image: "Assets/Resources/mawbound_soulcore.png",
      description: "Mawbound Soulcore used in crafting and loot."
    },
    "World Seed": {
      type: "material",
      value: 5,
      image: "Assets/Resources/world_seed.png",
      description: "World Seed used in crafting and loot."
    },
    "Wraith Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/wraith_core.png",
      description: "Wraith Core used in crafting and loot."
    },

    "Template Weapon": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "one_handed_sword",
      rarity: "common",
      itemLevel: 1,
      image: "Assets/Equips/template_weapon.png",
      description: "Template debug item. Obtainable via add-item menu only.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Template Dagger": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "dagger",
      rarity: "common",
      itemLevel: 1,
      image: "Assets/Equips/template_dagger.png",
      description: "Template debug item. Obtainable via add-item menu only.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Template Polearm": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "polearm",
      rarity: "common",
      itemLevel: 1,
      image: "Assets/Equips/template_polearm.png",
      description: "Template debug item. Obtainable via add-item menu only.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Template Greatsword": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "greatsword",
      rarity: "common",
      itemLevel: 1,
      image: "Assets/Equips/template_greatsword.png",
      description: "Template debug item. Obtainable via add-item menu only.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Template Helm": {
      type: "armor",
      slot: "head",
      equipCategory: "helmet",
      rarity: "common",
      itemLevel: 1,
      image: "Assets/Equips/_male_template_hat.png",
      description: "Template debug item. Obtainable via add-item menu only.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Template Chest": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 1,
      image: "Assets/Equips/_template_chest.png",
      description: "Template debug item. Obtainable via add-item menu only.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Template Feet": {
      type: "armor",
      slot: "feet",
      equipCategory: "feet_armor",
      rarity: "common",
      itemLevel: 1,
      image: "Assets/Equips/_template_feet.png",
      description: "Template debug item. Obtainable via add-item menu only.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Template Leggs": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "common",
      itemLevel: 1,
      image: "Assets/Equips/_template_leggs.png",
      description: "Template debug item. Obtainable via add-item menu only.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Template Ring": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 1,
      image: "Assets/Equips/template_ring.png",
      description: "Template debug item. Obtainable via add-item menu only.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Template Bracelet": {
      type: "armor",
      slot: "bracelet",
      equipCategory: "bracelet",
      rarity: "common",
      itemLevel: 1,
      image: "Assets/Equips/template_bracelet.png",
      description: "Template debug item. Obtainable via add-item menu only.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Template Amulet": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 1,
      image: "Assets/Equips/template_amulet.png",
      description: "Template debug item. Obtainable via add-item menu only.",
      bonusSkills: [],
      bonusStats: {}
    }},

  /**
   * Combat tuning. Core stat curves (STR/DEX/VIT/INT) are implemented in game.js as documented formulas.
   * Optional on enemies: `evasionPct`, `physicalResistPct`, `magicResistPct`, `flatDamageReduction` (numbers, % or flat as named).
   */
  statSystem: {
    staminaPerTurn: 6,
    attackStaminaCost: 2,
    minSkillStaminaCost: 2,
    minAttackStaminaCost: 1,
    baseCritMultiplierPct: 150,
    minHitChancePct: 15,
    maxHitChancePct: 100,
    enemyBaseHitChancePct: 100,
    /** Max HP = baseHpFromLevel + vitHpPerPoint * total Vitality (base + gear). */
    baseHpFromLevel: 50,
    hpPerLevel: 10,
    vitHpPerPoint: 5,
    /** Incoming damage split before resists (physical fraction 0–1). */
    incomingPhysicalWeight: 0.55,
    staggerNextAttackMult: 0.85
  },

  /** Short blurbs for overview tooltips (characteristics tab hover). */
  statHelp: {
    level: "Current level.",
    hp: "Total hit points.",
    xp: "Experience to next level.",
    charPoints: "Unused characteristic points.",
    str:
      "Increases physical damage, physical resist and status resist.\n\n10 STR = +1% physical damage\n10 STR = +1% physical resist\n10 STR = +1% status resist (with Vitality)",
    dex:
      "Increases critical chance, accuracy and evasion chance.\n\n10 DEX = +1% critical strike chance\n10 DEX = +1% accuracy\n10 DEX = +1% evasion",
    vit:
      "Increases status resist, total hit points and healing.\n\n10 VIT = +1% status resist (with Strength)\n1 VIT = +5 max HP (in addition to level-based base HP)\n10 VIT = +1% healing received",
    int:
      "Increases magical damage, magical resist and chance to inflict debuffs.\n\n10 INT = +1% magic damage\n10 INT = +1% magic resist\n10 INT = +1% accuracy (with Dexterity)",
    stamina: "Points required to perform actions during the fights.",
    physDmgPct: "Bonus physical damage % from equipment, added on top of Strength scaling.",
    magicDmgPct: "Bonus magic damage % from equipment, added on top of Intelligence scaling.",
    physResistPct: "Bonus physical resist % from equipment, added on top of Strength scaling.",
    magicResistPct: "Bonus magic resist % from equipment, added on top of Intelligence scaling.",
    critPct: "Bonus critical strike chance % from equipment, added on top of Dexterity scaling.",
    evasionPct: "Bonus evasion % from equipment, added on top of Dexterity scaling.",
    accuracyPct:
      "Bonus accuracy % from equipment, added on top of Dexterity and Intelligence scaling (hit chance and debuff land chance).",
    healingPct: "Bonus healing received % from equipment, added on top of Vitality scaling.",
    statusResistPct: "Bonus status resist % from equipment, added on top of Strength and Vitality scaling."
  },

  skills: [
    {
      name: "Power Strike",
      bonus: 5,
      combatMultiplier: 1.55,
      staminaCost: 4,
      damageKind: "physical",
      combatTags: ["heavy"],
      image: "Assets/Skills/power-strike.svg",
      description: "A committed melee swing. Passive: +5 attack. In combat, uses stamina; high multiplier, scales with Strength and Intelligence."
    },
    {
      name: "Heavy Blow",
      bonus: 3,
      combatMultiplier: 1.35,
      staminaCost: 3,
      damageKind: "physical",
      combatTags: ["heavy", "crushing"],
      image: "Assets/Skills/heavy-blow.svg",
      description: "A slower, crushing hit. Passive: +3 attack. Combat skill; solid damage, moderate stamina."
    },
    {
      name: "Precise Shot",
      bonus: 2,
      combatMultiplier: 1.28,
      staminaCost: 3,
      damageKind: "physical",
      image: "Assets/Skills/precise-shot.svg",
      description: "Aimed strike exploiting weak points. Passive: +2 attack. Benefits from Dexterity (crit) and Intelligence."
    },
    {
      name: "Arcane Strike",
      bonus: 4,
      combatMultiplier: 1.42,
      staminaCost: 4,
      damageKind: "magic",
      /** In turn combat, hits every living foe (respects mitigation, reflect, evade per enemy). */
      combatAoe: "all_enemies",
      image: "Assets/Skills/arcane-strike.svg",
      description: "Infused attack blending force and focus. Passive: +4 attack. AoE in fights; Intelligence improves its output."
    },
    {
      name: "Quick Reflexes",
      bonus: 2,
      image: "Assets/Skills/quick-reflexes.svg",
      description: "Passive only: +2 attack from better timing. Does not add a combat button; improves your listed damage."
    }
  ],

  professions: {
    intro:
      "Choose up to 2 hero professions, and up to 1 profession per companion. Weapon/Armor/Jeweller/Provisioner are crafting paths; Skinner/Extractor/Harvester unlock extra monster gathering drops.",
    maxSelected: 2,
    companionMaxSelected: 1,
    available: [
      { id: "weapon_smith", label: "Weapon smith", kind: "crafting" },
      { id: "armor_smith", label: "Armor smith", kind: "crafting" },
      { id: "jeweller", label: "Jeweller", kind: "crafting" },
      { id: "provisioner", label: "Provisioner", kind: "crafting" },
      { id: "skinner", label: "Skinner", kind: "gathering" },
      { id: "extractor", label: "Extractor", kind: "gathering" },
      { id: "harvester", label: "Harvester", kind: "gathering" }
    ],
    gatheringCategories: {
      beast: { label: "Beast", allowed: ["skinner", "extractor", "harvester"] },
      stone: { label: "Stone / Earth", allowed: ["extractor", "harvester"] },
      nature: { label: "Plant / Nature", allowed: ["harvester", "skinner", "extractor"] },
      elemental: { label: "Elemental", allowed: ["harvester", "extractor"] },
      undead: { label: "Undead / Spirit", allowed: ["harvester", "extractor"] },
      construct: { label: "Construct / Corrupted", allowed: ["extractor", "harvester"] }
    }
  },

  monsterGatheringCategories: {
    "Tide Hopper": ["elemental", "beast"],
    "Hermit Crab": ["beast", "stone"],
    "Saltwind Skimmer": ["beast"],
    "Brinegullet Spitter": ["beast", "elemental"],
    "Wavebreaker Idol": ["construct", "stone"],
    "Tidemeld Revenant": ["undead", "elemental"],
    "Coastal Horror": ["beast", "elemental"],
    "Tidebound Crusher": ["undead", "stone"],
    "Drowned Channeler": ["undead", "elemental"],
    "Tidemother Aberration": ["beast", "elemental"],
    Tideharrow: ["elemental"],
    "Burrow Hare": ["beast"],
    "Plains Raptor": ["beast"],
    "Grass Snake": ["beast"],
    "Tusk Boar": ["beast"],
    "Field Wolf": ["beast"],
    "Dust Carver": ["beast", "stone"],
    "Desert Thornback Crawler": ["beast", "stone"],
    "Mirage Lurker": ["construct", "elemental"],
    "Dune Devourer": ["beast", "stone"],
    Witherling: ["undead"],
    "Stone Marmot": ["beast", "stone"],
    "Rock Lynx": ["beast", "stone"],
    "Rock Ibex": ["beast", "stone"],
    "Rock Serpent": ["beast", "stone"],
    "Rock Lizard": ["beast", "stone"],
    "Leafdart Squirrel": ["beast", "nature"],
    "Canopy Screecher": ["beast", "nature"],
    "Greenleaf Fox": ["beast", "nature"],
    "Jungle Stag": ["beast", "nature"],
    Gorilla: ["beast"],
    "Barkhide Spriggan": ["nature"],
    "Icy Mink": ["beast", "elemental"],
    "Icy Serpent": ["beast", "elemental"],
    "Glacier Turtoise": ["beast", "stone", "elemental"],
    "Frozen Stalker": ["beast", "elemental"],
    "Frost Skitter": ["elemental"],
    "Pinebound Fawn": ["beast", "nature"],
    "Frozen Pinecone": ["nature", "elemental"],
    "Ice-Tusked Boar": ["beast", "elemental"],
    "Winter Guardian": ["construct", "elemental"],
    "Ash Lizard": ["beast", "elemental"],
    "Cinder Stalker": ["beast", "elemental"],
    "Ember Scuttler": ["elemental"],
    "Magma Boar": ["beast", "elemental"],
    "Lava Basilisk": ["beast", "elemental"],
    "Faded War Wraith": ["undead"],
    "Ash Horror": ["elemental", "undead"],
    "Cinder Husk": ["construct", "elemental"],
    "Ash Skulker": ["beast", "elemental"],
    "Remnant of Rust": ["construct"],
    Driftling: ["elemental"],
    "Stormfang Ravager": ["beast", "elemental"],
    "Abyssal Tempest Caller": ["beast", "elemental"],
    "The Stormwake Leviathan": ["beast", "elemental"],
    "Cliff Lurker": ["beast", "stone"],
    "Bramblehorn Matriarch": ["beast", "nature"],
    "Fangroot Alpha": ["beast"],
    "Gaiahide Behemoth": ["beast", "stone"],
    "Thornback Graveguard": ["beast", "stone"],
    "Mirage Maw": ["construct", "elemental"],
    "Mirage Remnant": ["construct", "elemental"],
    "The Dune Mourner": ["undead", "elemental"],
    "Petrified Coilwarden": ["construct", "stone"],
    "Granitehorn Breaker": ["beast", "stone"],
    "The Held Colossus": ["construct", "stone"],
    "Whitebark Matron": ["beast", "nature", "elemental"],
    "Frosthorn Bulwark": ["beast", "elemental"],
    "The Sleeping Child of Winter": ["construct", "elemental", "nature"],
    "Frostroot Seedling": ["nature", "elemental"]
  },

  crafting: {
    recipeTiers: [
      {
        id: "early",
        minLevel: 1,
        maxLevel: 10,
        recipes: [
          {
            id: "skimmer_blade",
            resultItem: "Skimmer Blade",
            resultLevel: 5,
            ingredients: [
              { item: "Sharp Fin", qty: 6, source: "monster_loot" },
              { item: "Wet Membrane", qty: 6, source: "monster_loot" },
              { item: "Bone Fragment", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "tidecall_amulet",
            resultItem: "Tidecall Amulet",
            resultLevel: 6,
            ingredients: [
              { item: "Ripple Core", qty: 6, source: "monster_loot" },
              { item: "Wet Membrane", qty: 6, source: "monster_loot" },
              { item: "Residue", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "shellsplitter",
            resultItem: "Shellsplitter",
            resultLevel: 7,
            ingredients: [
              { item: "Hardened Shell", qty: 6, source: "monster_loot" },
              { item: "Stone Core", qty: 6, source: "monster_loot" },
              { item: "Seeds", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "ripple_staff",
            resultItem: "Ripple Staff",
            resultLevel: 9,
            ingredients: [
              { item: "Stone Core", qty: 6, source: "monster_loot" },
              { item: "Fluid Sac", qty: 6, source: "monster_loot" }
            ]
          },
          {
            id: "scaleguard_shirt",
            resultItem: "Scaleguard Shirt",
            resultLevel: 7,
            ingredients: [
              { item: "Fluid Sac", qty: 6, source: "monster_loot" },
              { item: "Ripple Core", qty: 6, source: "monster_loot" },
              { item: "Plant Fiber", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "tide_shell_vest",
            resultItem: "Tide Horror Vest",
            resultLevel: 8,
            ingredients: [
              { item: "Ripple Core", qty: 6, source: "monster_loot" },
              { item: "Salt Flesh", qty: 6, source: "monster_loot" }
            ]
          },
          {
            id: "wet_boots",
            resultItem: "Wet Boots",
            resultLevel: 6,
            ingredients: [
              { item: "Salt Flesh", qty: 6, source: "monster_loot" },
              { item: "Abyss Residue", qty: 6, source: "monster_loot" },
              { item: "Raw Hide", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "coastal_helm",
            resultItem: "Coastal Hat",
            resultLevel: 8,
            ingredients: [
              { item: "Abyss Residue", qty: 6, source: "monster_loot" },
              { item: "Sharp Fin", qty: 6, source: "monster_loot" }
            ]
          },
          {
            id: "driftcloak_vest",
            resultItem: "Driftcloak Vest",
            resultLevel: 7,
            ingredients: [
              { item: "Fluid Sac", qty: 6, source: "monster_loot" },
              { item: "Ripple Core", qty: 6, source: "monster_loot" },
              { item: "Plant Fiber", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "wave_leggings",
            resultItem: "Wave Leggings",
            resultLevel: 9,
            ingredients: [
              { item: "Wet Membrane", qty: 6, source: "monster_loot" },
              { item: "Hardened Shell", qty: 6, source: "monster_loot" }
            ]
          },
          {
            id: "flow_ring",
            resultItem: "Flow Ring",
            resultLevel: 6,
            ingredients: [
              { item: "Hardened Shell", qty: 6, source: "monster_loot" },
              { item: "Stone Core", qty: 6, source: "monster_loot" },
              { item: "Bone Fragment", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "salt_amulet",
            resultItem: "Salt Amulet",
            resultLevel: 8,
            ingredients: [
              { item: "Stone Core", qty: 6, source: "monster_loot" },
              { item: "Fluid Sac", qty: 6, source: "monster_loot" }
            ]
          },
          {
            id: "drift_bracelet",
            resultItem: "Drift Bracelet",
            resultLevel: 7,
            ingredients: [
              { item: "Fluid Sac", qty: 6, source: "monster_loot" },
              { item: "Ripple Core", qty: 6, source: "monster_loot" },
              { item: "Seeds", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "ripple_charm",
            resultItem: "Ripple Charm",
            resultLevel: 9,
            ingredients: [
              { item: "Ripple Core", qty: 6, source: "monster_loot" },
              { item: "Salt Flesh", qty: 6, source: "monster_loot" }
            ]
          },
          {
            id: "sand_band",
            resultItem: "Sand Band",
            resultLevel: 8,
            ingredients: [
              { item: "Salt Flesh", qty: 6, source: "monster_loot" },
              { item: "Abyss Residue", qty: 6, source: "monster_loot" },
              { item: "Plant Fiber", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "tide_loop",
            resultItem: "Tide Loop",
            resultLevel: 10,
            ingredients: [
              { item: "Abyss Residue", qty: 6, source: "monster_loot" },
              { item: "Sharp Fin", qty: 6, source: "monster_loot" }
            ]
          },
          {
            id: "sunken_grotto_key",
            resultItem: "Sunken Grotto Key",
            resultLevel: 10,
            ingredients: [
              { item: "Ripple Core", qty: 5, source: "monster_loot" },
              { item: "Hardened Shell", qty: 6, source: "monster_loot" },
              { item: "Wet Membrane", qty: 5, source: "monster_loot" },
              { item: "Fluid Sac", qty: 4, source: "monster_loot" },
              { item: "Abyss Residue", qty: 3, source: "monster_loot" },
              { item: "Salt Flesh", qty: 5, source: "monster_loot" },
              { item: "Residue", qty: 4, source: "gathering_loot" },
              { item: "Bone Fragment", qty: 3, source: "gathering_loot" }
            ]
          }
        ]
      },
      {
        id: "low_mid",
        minLevel: 11,
        maxLevel: 20,
        recipes: [
          {
            id: "stormbreak_hollow_key",
            resultItem: "Stormbreak Hollow Key",
            resultLevel: 12,
            ingredients: [
              { item: "Sharp Fin", qty: 5, source: "monster_loot" },
              { item: "Wind Scale", qty: 4, source: "monster_loot" },
              { item: "Acid Gland", qty: 4, source: "monster_loot" },
              { item: "Fluid Sac", qty: 4, source: "monster_loot" },
              { item: "Stone Core", qty: 5, source: "monster_loot" },
              { item: "Ancient Fragment", qty: 3, source: "monster_loot" },
              { item: "Tide Fragment", qty: 4, source: "monster_loot" },
              { item: "Pressure Core", qty: 3, source: "monster_loot" }
            ]
          },
          {
            id: "rootwarren_key",
            resultItem: "Rootwarren Key",
            resultLevel: 18,
            ingredients: [
              { item: "Digging Claw", qty: 6, source: "monster_loot" },
              { item: "Earth Essence", qty: 4, source: "monster_loot" },
              { item: "Scaled Skin", qty: 5, source: "monster_loot" },
              { item: "Poison Essence", qty: 3, source: "monster_loot" },
              { item: "Talon Fragment", qty: 5, source: "monster_loot" },
              { item: "Wild Essence", qty: 4, source: "monster_loot" },
              { item: "Boar Tusk", qty: 3, source: "monster_loot" },
              { item: "Nature Essence", qty: 4, source: "monster_loot" }
            ]
          },
          {
            id: "withered_maw_key",
            resultItem: "Withered Maw Key",
            resultLevel: 20,
            ingredients: [
              { item: "Razor Claw", qty: 6, source: "monster_loot" },
              { item: "Dust Essence", qty: 4, source: "monster_loot" },
              { item: "Withered Tissue", qty: 6, source: "monster_loot" },
              { item: "Decay Fragment", qty: 5, source: "monster_loot" },
              { item: "Spiked Shell", qty: 4, source: "monster_loot" },
              { item: "Mirage Dust", qty: 5, source: "monster_loot" },
              { item: "Illusion Thread", qty: 4, source: "monster_loot" },
              { item: "Hunger Core", qty: 2, source: "monster_loot" }
            ]
          },
          {
            id: "sandfang_blade",
            resultItem: "Sandfang Blade",
            resultLevel: 15,
            ingredients: [
              { item: "Razor Claw", qty: 6, source: "monster_loot" },
              { item: "Sand Core", qty: 6, source: "monster_loot" },
              { item: "Boar Tusk", qty: 5, source: "monster_loot" },
              { item: "Dense Bone", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "mirage_edge",
            resultItem: "Mirage Edge",
            resultLevel: 16,
            ingredients: [
              { item: "Sand Core", qty: 6, source: "monster_loot" },
              { item: "Boar Tusk", qty: 6, source: "monster_loot" },
              { item: "Tough Hide", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "boarbreaker_axe",
            resultItem: "Boarbreaker Axe",
            resultLevel: 18,
            ingredients: [
              { item: "Boar Tusk", qty: 6, source: "monster_loot" },
              { item: "Thick Hide", qty: 6, source: "monster_loot" },
              { item: "Venom Sac", qty: 5, source: "monster_loot" },
              { item: "Root Fiber", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "venom_channeler",
            resultItem: "Venom Channeler",
            resultLevel: 19,
            ingredients: [
              { item: "Thick Hide", qty: 6, source: "monster_loot" },
              { item: "Venom Sac", qty: 6, source: "monster_loot" },
              { item: "Sand Residue", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "thornback_armor",
            resultItem: "Thornback Armor",
            resultLevel: 20,
            ingredients: [
              { item: "Venom Sac", qty: 6, source: "monster_loot" },
              { item: "Toxic Essence", qty: 6, source: "monster_loot" },
              { item: "Illusion Essence", qty: 5, source: "monster_loot" },
              { item: "Growth Seed", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "boarhide_chest",
            resultItem: "Boarhide Chest",
            resultLevel: 20,
            ingredients: [
              { item: "Toxic Essence", qty: 6, source: "monster_loot" },
              { item: "Illusion Essence", qty: 6, source: "monster_loot" },
              { item: "Distorted Core", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "sandstep_boots",
            resultItem: "Sandstep Boots",
            resultLevel: 15,
            ingredients: [
              { item: "Illusion Essence", qty: 6, source: "monster_loot" },
              { item: "Devourer Tooth", qty: 6, source: "monster_loot" },
              { item: "Razor Claw", qty: 5, source: "monster_loot" },
              { item: "Dense Bone", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "mirage_helm",
            resultItem: "Mirage Helm",
            resultLevel: 17,
            ingredients: [
              { item: "Devourer Tooth", qty: 6, source: "monster_loot" },
              { item: "Razor Claw", qty: 6, source: "monster_loot" },
              { item: "Tough Hide", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "boneguard_gloves",
            resultItem: "Boneguard Gloves",
            resultLevel: 18,
            ingredients: [
              { item: "Razor Claw", qty: 6, source: "monster_loot" },
              { item: "Sand Core", qty: 6, source: "monster_loot" },
              { item: "Boar Tusk", qty: 5, source: "monster_loot" },
              { item: "Root Fiber", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "dune_leggings",
            resultItem: "Dune Leggings",
            resultLevel: 19,
            ingredients: [
              { item: "Sand Core", qty: 6, source: "monster_loot" },
              { item: "Boar Tusk", qty: 6, source: "monster_loot" },
              { item: "Sand Residue", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "venom_ring",
            resultItem: "Venom Ring",
            resultLevel: 19,
            ingredients: [
              { item: "Boar Tusk", qty: 6, source: "monster_loot" },
              { item: "Thick Hide", qty: 6, source: "monster_loot" },
              { item: "Venom Sac", qty: 5, source: "monster_loot" },
              { item: "Growth Seed", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "sand_amulet",
            resultItem: "Sand Amulet",
            resultLevel: 16,
            ingredients: [
              { item: "Thick Hide", qty: 6, source: "monster_loot" },
              { item: "Venom Sac", qty: 6, source: "monster_loot" },
              { item: "Distorted Core", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "mirage_bracelet",
            resultItem: "Mirage Bracelet",
            resultLevel: 17,
            ingredients: [
              { item: "Venom Sac", qty: 6, source: "monster_loot" },
              { item: "Toxic Essence", qty: 6, source: "monster_loot" },
              { item: "Illusion Essence", qty: 5, source: "monster_loot" },
              { item: "Dense Bone", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "bone_charm",
            resultItem: "Bone Charm",
            resultLevel: 18,
            ingredients: [
              { item: "Toxic Essence", qty: 6, source: "monster_loot" },
              { item: "Illusion Essence", qty: 6, source: "monster_loot" },
              { item: "Tough Hide", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "fang_loop",
            resultItem: "Fang Loop",
            resultLevel: 20,
            ingredients: [
              { item: "Illusion Essence", qty: 6, source: "monster_loot" },
              { item: "Devourer Tooth", qty: 6, source: "monster_loot" },
              { item: "Razor Claw", qty: 5, source: "monster_loot" },
              { item: "Root Fiber", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "dune_band",
            resultItem: "Dune Band",
            resultLevel: 15,
            ingredients: [
              { item: "Devourer Tooth", qty: 6, source: "monster_loot" },
              { item: "Razor Claw", qty: 6, source: "monster_loot" },
              { item: "Sand Residue", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "burrowstep_boots",
            resultItem: "Burrowstep Boots",
            resultLevel: 15,
            ingredients: [
              { item: "Soft Fur", qty: 5, source: "monster_loot" },
              { item: "Small Bone", qty: 4, source: "gathering_loot" },
              { item: "Root Fiber", qty: 3, source: "gathering_loot" },
              { item: "Raw Hide", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "boarhide_leggings",
            resultItem: "Boarhide Leggings",
            resultLevel: 19,
            ingredients: [
              { item: "Thick Hide", qty: 7, source: "monster_loot" },
              { item: "Tough Hide", qty: 5, source: "gathering_loot" },
              { item: "Dense Bone", qty: 4, source: "gathering_loot" },
              { item: "Seeds", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "devourer_axe",
            resultItem: "Devourer Axe",
            resultLevel: 18,
            ingredients: [
              { item: "Devourer Tooth", qty: 6, source: "monster_loot" },
              { item: "Sand Residue", qty: 4, source: "gathering_loot" },
              { item: "Dense Bone", qty: 4, source: "gathering_loot" },
              { item: "Tough Hide", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "fang_dagger",
            resultItem: "Fang Dagger",
            resultLevel: 17,
            ingredients: [
              { item: "Sharp Fang", qty: 6, source: "monster_loot" },
              { item: "Tough Hide", qty: 4, source: "gathering_loot" },
              { item: "Blood Herb", qty: 3, source: "gathering_loot" },
              { item: "Bone Fragment", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "mirage_ring",
            resultItem: "Mirage Ring",
            resultLevel: 16,
            ingredients: [
              { item: "Illusion Essence", qty: 5, source: "monster_loot" },
              { item: "Distorted Core", qty: 3, source: "gathering_loot" },
              { item: "Residue", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "thornback_graveplate",
            resultItem: "Thornback Graveplate",
            resultLevel: 20,
            ingredients: [
              { item: "Thornback Carapace", qty: 4, source: "monster_loot" },
              { item: "Bleached Shell Plate", qty: 3, source: "monster_loot" },
              { item: "Spiked Shell", qty: 8, source: "monster_loot" },
              { item: "Carapace Fragment", qty: 10, source: "monster_loot" },
              { item: "Defense Core", qty: 2, source: "monster_loot" },
              { item: "Earth Essence", qty: 6, source: "monster_loot" }
            ]
          },
          {
            id: "bone_spike_pants",
            resultItem: "Bone-Spike Pants",
            resultLevel: 21,
            ingredients: [
              { item: "Thornback Carapace", qty: 3, source: "monster_loot" },
              { item: "Grave Thorn", qty: 4, source: "monster_loot" },
              { item: "Bleached Shell Plate", qty: 2, source: "monster_loot" },
              { item: "Spiked Shell", qty: 7, source: "monster_loot" },
              { item: "Carapace Fragment", qty: 8, source: "monster_loot" },
              { item: "Withered Tissue", qty: 6, source: "monster_loot" }
            ]
          },
          {
            id: "grave_impaler",
            resultItem: "Grave Impaler",
            resultLevel: 21,
            ingredients: [
              { item: "Grave Thorn", qty: 5, source: "monster_loot" },
              { item: "Buried Bone Core", qty: 1, source: "monster_loot" },
              { item: "Thornback Carapace", qty: 2, source: "monster_loot" },
              { item: "Razor Claw", qty: 6, source: "monster_loot" },
              { item: "Sand Blade Fragment", qty: 6, source: "monster_loot" },
              { item: "Precision Core", qty: 2, source: "monster_loot" },
              { item: "Dust Essence", qty: 5, source: "monster_loot" }
            ]
          },
          {
            id: "mirage_maw_hood",
            resultItem: "Mirage Maw Hood",
            resultLevel: 21,
            ingredients: [
              { item: "Haze-Torn Skin", qty: 4, source: "monster_loot" },
              { item: "Mirage Jawbone", qty: 2, source: "monster_loot" },
              { item: "Mirage Dust", qty: 8, source: "monster_loot" },
              { item: "Illusion Thread", qty: 6, source: "monster_loot" },
              { item: "Trickster Core", qty: 2, source: "monster_loot" },
              { item: "Illusion Essence", qty: 5, source: "monster_loot" }
            ]
          },
          {
            id: "haze_torn_pants",
            resultItem: "Haze-Torn Pants",
            resultLevel: 21,
            ingredients: [
              { item: "Haze-Torn Skin", qty: 5, source: "monster_loot" },
              { item: "Mirage Dust", qty: 8, source: "monster_loot" },
              { item: "Illusion Thread", qty: 8, source: "monster_loot" },
              { item: "Sand Residue", qty: 6, source: "monster_loot" },
              { item: "Withered Tissue", qty: 5, source: "monster_loot" },
              { item: "Trickster Core", qty: 1, source: "monster_loot" }
            ]
          },
          {
            id: "false_wound_ring",
            resultItem: "False Wound Ring",
            resultLevel: 22,
            ingredients: [
              { item: "Thirsting Eye", qty: 3, source: "monster_loot" },
              { item: "Splintered Illusion Core", qty: 1, source: "monster_loot" },
              { item: "Mirage Dust", qty: 6, source: "monster_loot" },
              { item: "Illusion Essence", qty: 5, source: "monster_loot" },
              { item: "Distorted Core", qty: 2, source: "monster_loot" },
              { item: "Shadow Essence", qty: 4, source: "monster_loot" }
            ]
          },
          {
            id: "mourners_veil",
            resultItem: "Mourner’s Veil",
            resultLevel: 22,
            ingredients: [
              { item: "Mourner’s Veilcloth", qty: 4, source: "monster_loot" },
              { item: "Hollow Rib Fragment", qty: 2, source: "monster_loot" },
              { item: "Drought Essence", qty: 2, source: "monster_loot" },
              { item: "Illusion Thread", qty: 8, source: "monster_loot" },
              { item: "Shadow Essence", qty: 6, source: "monster_loot" },
              { item: "Decay Fragment", qty: 6, source: "monster_loot" }
            ]
          },
          {
            id: "hollow_sand_robe",
            resultItem: "Hollow Sand Robe",
            resultLevel: 22,
            ingredients: [
              { item: "Mourner’s Veilcloth", qty: 5, source: "monster_loot" },
              { item: "Hollow Rib Fragment", qty: 3, source: "monster_loot" },
              { item: "Black Sand Heart", qty: 1, source: "monster_loot" },
              { item: "Withered Tissue", qty: 10, source: "monster_loot" },
              { item: "Decay Fragment", qty: 8, source: "monster_loot" },
              { item: "Decay Core", qty: 2, source: "monster_loot" },
              { item: "Shadow Essence", qty: 6, source: "monster_loot" }
            ]
          },
          {
            id: "droughtworn_pants",
            resultItem: "Droughtworn Pants",
            resultLevel: 23,
            ingredients: [
              { item: "Mourner’s Veilcloth", qty: 4, source: "monster_loot" },
              { item: "Drought Essence", qty: 3, source: "monster_loot" },
              { item: "Hollow Rib Fragment", qty: 2, source: "monster_loot" },
              { item: "Sand Residue", qty: 10, source: "monster_loot" },
              { item: "Withered Tissue", qty: 8, source: "monster_loot" },
              { item: "Decay Core", qty: 2, source: "monster_loot" },
              { item: "Hunger Core", qty: 1, source: "monster_loot" }
            ]
          },
          {
            id: "mawcaller_staff",
            resultItem: "Mawcaller Staff",
            resultLevel: 23,
            ingredients: [
              { item: "Mawbound Soulcore", qty: 1, source: "monster_loot" },
              { item: "Black Sand Heart", qty: 2, source: "monster_loot" },
              { item: "Hollow Rib Fragment", qty: 5, source: "monster_loot" },
              { item: "Drought Essence", qty: 4, source: "monster_loot" },
              { item: "Devourer Tooth", qty: 6, source: "monster_loot" },
              { item: "Sand Core", qty: 3, source: "monster_loot" },
              { item: "Hunger Core", qty: 2, source: "monster_loot" },
              { item: "Shadow Essence", qty: 8, source: "monster_loot" }
            ]
          },
          {
            id: "crushers_anchor_cleaver",
            resultItem: "Crusher's Anchor Cleaver",
            resultLevel: 14,
            ingredients: [
              { item: "Crushed Anchor Shard", qty: 6, source: "monster_loot" },
              { item: "Pressure Core", qty: 4, source: "monster_loot" },
              { item: "Dense Bone", qty: 3, source: "gathering_loot" },
              { item: "Raw Hide", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "saltbound_bulwark_plate",
            resultItem: "Saltbound Bulwark Plate",
            resultLevel: 14,
            ingredients: [
              { item: "Salt-Encrusted Plate", qty: 6, source: "monster_loot" },
              { item: "Barnacle Cluster", qty: 4, source: "monster_loot" },
              { item: "Tough Hide", qty: 3, source: "gathering_loot" },
              { item: "Root Fiber", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "pressure_loop",
            resultItem: "Pressure Loop",
            resultLevel: 14,
            ingredients: [
              { item: "Pressure Core", qty: 5, source: "monster_loot" },
              { item: "Crushed Anchor Shard", qty: 4, source: "monster_loot" },
              { item: "Dense Bone", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "channelers_focus_rod",
            resultItem: "Channeler's Focus Rod",
            resultLevel: 13,
            ingredients: [
              { item: "Abyssal Thread", qty: 6, source: "monster_loot" },
              { item: "Distorted Core", qty: 4, source: "monster_loot" },
              { item: "Residue", qty: 3, source: "gathering_loot" },
              { item: "Plant Fiber", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "abyssbind_band",
            resultItem: "Abyssbind Band",
            resultLevel: 13,
            ingredients: [
              { item: "Echo Residue", qty: 6, source: "monster_loot" },
              { item: "Abyssal Thread", qty: 4, source: "monster_loot" },
              { item: "Root Fiber", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "drowned_sigil_amulet",
            resultItem: "Drowned Sigil Amulet",
            resultLevel: 13,
            ingredients: [
              { item: "Drowned Sigil Fragment", qty: 3, source: "monster_loot" },
              { item: "Distorted Core", qty: 4, source: "monster_loot" },
              { item: "Living Fiber", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "tidemother_fangblade",
            resultItem: "Tidemother Fangblade",
            resultLevel: 15,
            ingredients: [
              { item: "Tidemother Core", qty: 4, source: "monster_loot" },
              { item: "Echo Heart", qty: 3, source: "monster_loot" },
              { item: "Abyss Residue", qty: 3, source: "monster_loot" },
              { item: "Dense Bone", qty: 3, source: "gathering_loot" },
              { item: "Living Fiber", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "abyssal_carapace_chest",
            resultItem: "Abyssal Carapace Vest",
            resultLevel: 15,
            ingredients: [
              { item: "Corrupted Brine Flesh", qty: 6, source: "monster_loot" },
              { item: "Tidemother Core", qty: 3, source: "monster_loot" },
              { item: "Tough Hide", qty: 4, source: "gathering_loot" },
              { item: "Reinforced Bone", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "thunderclaw_dirk_craft",
            resultItem: "Thunderclaw Dirk",
            resultLevel: 14,
            ingredients: [
              { item: "Stormfang Claw", qty: 6, source: "monster_loot" },
              { item: "Charged Scale", qty: 4, source: "monster_loot" },
              { item: "Sharp Fin", qty: 4, source: "monster_loot" },
              { item: "Wet Membrane", qty: 3, source: "monster_loot" },
              { item: "Elastic Tendon", qty: 3, source: "monster_loot" },
              { item: "Acid Gland", qty: 3, source: "monster_loot" }
            ]
          },
          {
            id: "stormhide_boots_craft",
            resultItem: "Stormhide Boots",
            resultLevel: 14,
            ingredients: [
              { item: "Stormhide Strip", qty: 6, source: "monster_loot" },
              { item: "Charged Scale", qty: 4, source: "monster_loot" },
              { item: "Sharp Fin", qty: 3, source: "monster_loot" },
              { item: "Salt Flesh", qty: 3, source: "monster_loot" },
              { item: "Raw Hide", qty: 3, source: "gathering_loot" },
              { item: "Tide Fragment", qty: 3, source: "monster_loot" }
            ]
          },
          {
            id: "static_fang_bracelet_craft",
            resultItem: "Static Fang Bracelet",
            resultLevel: 14,
            ingredients: [
              { item: "Static Fang Core", qty: 4, source: "monster_loot" },
              { item: "Stormfang Claw", qty: 4, source: "monster_loot" },
              { item: "Stormhide Strip", qty: 3, source: "monster_loot" },
              { item: "Ripple Core", qty: 3, source: "monster_loot" },
              { item: "Bone Fragment", qty: 3, source: "gathering_loot" },
              { item: "Residue", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "gale_slashed_leggings_craft",
            resultItem: "Gale-Slashed Leggings",
            resultLevel: 14,
            ingredients: [
              { item: "Stormhide Strip", qty: 5, source: "monster_loot" },
              { item: "Charged Scale", qty: 4, source: "monster_loot" },
              { item: "Stormfang Claw", qty: 3, source: "monster_loot" },
              { item: "Hardened Shell", qty: 4, source: "monster_loot" },
              { item: "Raw Hide", qty: 3, source: "gathering_loot" },
              { item: "Ancient Fragment", qty: 3, source: "monster_loot" }
            ]
          },
          {
            id: "tempest_caller_rod_craft",
            resultItem: "Tempest Caller Rod",
            resultLevel: 13,
            ingredients: [
              { item: "Tempest Thread", qty: 6, source: "monster_loot" },
              { item: "Storm Sigil Fragment", qty: 4, source: "monster_loot" },
              { item: "Fluid Sac", qty: 4, source: "monster_loot" },
              { item: "Ripple Core", qty: 3, source: "monster_loot" },
              { item: "Residue", qty: 3, source: "gathering_loot" },
              { item: "Plant Fiber", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "stormbind_hood_craft",
            resultItem: "Stormbind Hood",
            resultLevel: 13,
            ingredients: [
              { item: "Tempest Thread", qty: 5, source: "monster_loot" },
              { item: "Charged Brine Core", qty: 3, source: "monster_loot" },
              { item: "Abyss Residue", qty: 4, source: "monster_loot" },
              { item: "Salt Flesh", qty: 3, source: "monster_loot" },
              { item: "Bone Fragment", qty: 3, source: "gathering_loot" },
              { item: "Residue", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "brinestorm_amulet_craft",
            resultItem: "Brinestorm Amulet",
            resultLevel: 13,
            ingredients: [
              { item: "Storm Sigil Fragment", qty: 5, source: "monster_loot" },
              { item: "Drowned Spark Residue", qty: 3, source: "monster_loot" },
              { item: "Charged Brine Core", qty: 2, source: "monster_loot" },
              { item: "Ripple Core", qty: 4, source: "monster_loot" },
              { item: "Fluid Sac", qty: 3, source: "monster_loot" },
              { item: "Bone Fragment", qty: 3, source: "gathering_loot" },
              { item: "Residue", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "leviathan_arcblade_craft",
            resultItem: "Leviathan Arcblade",
            resultLevel: 15,
            ingredients: [
              { item: "Leviathan Stormcore", qty: 4, source: "monster_loot" },
              { item: "Abyssal Lightning Scale", qty: 5, source: "monster_loot" },
              { item: "Stormfang Claw", qty: 4, source: "monster_loot" },
              { item: "Tempest Thread", qty: 4, source: "monster_loot" },
              { item: "Sharp Fin", qty: 4, source: "monster_loot" },
              { item: "Dense Bone", qty: 3, source: "gathering_loot" },
              { item: "Residue", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "leviathan_scale_mantle_craft",
            resultItem: "Leviathan Scale Mantle",
            resultLevel: 15,
            ingredients: [
              { item: "Abyssal Lightning Scale", qty: 6, source: "monster_loot" },
              { item: "Leviathan Stormcore", qty: 3, source: "monster_loot" },
              { item: "Charged Brine Core", qty: 3, source: "monster_loot" },
              { item: "Charged Scale", qty: 4, source: "monster_loot" },
              { item: "Hardened Shell", qty: 5, source: "monster_loot" },
              { item: "Salt Flesh", qty: 3, source: "monster_loot" },
              { item: "Plant Fiber", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "maelstrom_eye_ring_craft",
            resultItem: "Maelstrom Eye Ring",
            resultLevel: 15,
            ingredients: [
              { item: "Eye of the Maelstrom", qty: 2, source: "monster_loot" },
              { item: "Stormwake Tendril", qty: 5, source: "monster_loot" },
              { item: "Storm Sigil Fragment", qty: 4, source: "monster_loot" },
              { item: "Static Fang Core", qty: 3, source: "monster_loot" },
              { item: "Ripple Core", qty: 4, source: "monster_loot" },
              { item: "Bone Fragment", qty: 3, source: "gathering_loot" },
              { item: "Residue", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "stormwake_legguards_craft",
            resultItem: "Stormwake Legguards",
            resultLevel: 15,
            ingredients: [
              { item: "Abyssal Lightning Scale", qty: 5, source: "monster_loot" },
              { item: "Stormwake Tendril", qty: 4, source: "monster_loot" },
              { item: "Leviathan Stormcore", qty: 3, source: "monster_loot" },
              { item: "Charged Scale", qty: 4, source: "monster_loot" },
              { item: "Stormhide Strip", qty: 3, source: "monster_loot" },
              { item: "Bone Fragment", qty: 3, source: "gathering_loot" },
              { item: "Residue", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "echo_loop_of_the_deep",
            resultItem: "Echo Loop of the Deep",
            resultLevel: 15,
            ingredients: [
              { item: "Echo Heart", qty: 5, source: "monster_loot" },
              { item: "Abyss Residue", qty: 4, source: "monster_loot" },
              { item: "Residue", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "bramblehorn_antler_crown",
            resultItem: "Bramblehorn Antler Crown",
            resultLevel: 20,
            ingredients: [
              { item: "Gaia Sap Antler", qty: 2, source: "monster_loot" },
              { item: "Living Bramble Fiber", qty: 6, source: "monster_loot" },
              { item: "Nature Essence", qty: 8, source: "monster_loot" },
              { item: "Soft Fur", qty: 5, source: "monster_loot" },
              { item: "Bone Shard", qty: 3, source: "monster_loot" }
            ]
          }]
      },
      {
        id: "mid",
        minLevel: 21,
        maxLevel: 30,
        recipes: [
          {
            id: "rootmender_sash",
            resultItem: "Rootmender Sash",
            resultLevel: 21,
            ingredients: [
              { item: "Rootmend Core", qty: 1, source: "monster_loot" },
              { item: "Living Bramble Fiber", qty: 8, source: "monster_loot" },
              { item: "Thick Hide", qty: 6, source: "monster_loot" },
              { item: "Nature Essence", qty: 8, source: "monster_loot" },
              { item: "Digging Claw", qty: 4, source: "monster_loot" }
            ]
          },
          {
            id: "thornweave_bracelet",
            resultItem: "Thornweave Bracelet",
            resultLevel: 21,
            ingredients: [
              { item: "Bramblehorn Shard", qty: 3, source: "monster_loot" },
              { item: "Living Bramble Fiber", qty: 5, source: "monster_loot" },
              { item: "Venom Sac", qty: 3, source: "monster_loot" },
              { item: "Nature Essence", qty: 6, source: "monster_loot" },
              { item: "Bone Shard", qty: 4, source: "monster_loot" }
            ]
          },
          {
            id: "fangroot_biteblade",
            resultItem: "Fangroot Biteblade",
            resultLevel: 21,
            ingredients: [
              { item: "Fangroot Claw", qty: 3, source: "monster_loot" },
              { item: "Alpha Fang", qty: 2, source: "monster_loot" },
              { item: "Talon Fragment", qty: 8, source: "monster_loot" },
              { item: "Bone Shard", qty: 5, source: "monster_loot" },
              { item: "Root Fiber", qty: 6, source: "gathering_loot" }
            ]
          },
          {
            id: "bloodroot_mantle",
            resultItem: "Bloodroot Mantle",
            resultLevel: 21,
            ingredients: [
              { item: "Bloodroot Hide", qty: 3, source: "monster_loot" },
              { item: "Predator Sap", qty: 2, source: "monster_loot" },
              { item: "Thick Hide", qty: 8, source: "monster_loot" },
              { item: "Soft Fur", qty: 6, source: "monster_loot" },
              { item: "Root Fiber", qty: 5, source: "gathering_loot" }
            ]
          },
          {
            id: "predator_fang_ring",
            resultItem: "Predator Fang Ring",
            resultLevel: 22,
            ingredients: [
              { item: "Alpha Fang", qty: 2, source: "monster_loot" },
              { item: "Fangroot Claw", qty: 2, source: "monster_loot" },
              { item: "Predator Sap", qty: 3, source: "monster_loot" },
              { item: "Digging Claw", qty: 5, source: "monster_loot" },
              { item: "Talon Fragment", qty: 6, source: "monster_loot" }
            ]
          },
          {
            id: "gaiahide_warplate",
            resultItem: "Gaiahide Warplate",
            resultLevel: 22,
            ingredients: [
              { item: "Gaiahide Plate", qty: 4, source: "monster_loot" },
              { item: "Behemoth Rootbone", qty: 2, source: "monster_loot" },
              { item: "Ancient Gaia Sap", qty: 2, source: "monster_loot" },
              { item: "Thick Hide", qty: 10, source: "monster_loot" },
              { item: "Root Fiber", qty: 8, source: "gathering_loot" },
              { item: "Digging Claw", qty: 6, source: "monster_loot" }
            ]
          },
          {
            id: "rootquake_greaves",
            resultItem: "Rootquake Greaves",
            resultLevel: 22,
            ingredients: [
              { item: "Rootquake Core", qty: 2, source: "monster_loot" },
              { item: "Gaiahide Plate", qty: 3, source: "monster_loot" },
              { item: "Behemoth Rootbone", qty: 2, source: "monster_loot" },
              { item: "Thick Hide", qty: 8, source: "monster_loot" },
              { item: "Nature Essence", qty: 8, source: "monster_loot" }
            ]
          },
          {
            id: "heartburrow_horn_charm",
            resultItem: "Heartburrow Horn Charm",
            resultLevel: 23,
            ingredients: [
              { item: "Heartburrow Horn", qty: 2, source: "monster_loot" },
              { item: "Ancient Gaia Sap", qty: 3, source: "monster_loot" },
              { item: "Behemoth Rootbone", qty: 2, source: "monster_loot" },
              { item: "Bone Shard", qty: 8, source: "monster_loot" },
              { item: "Nature Essence", qty: 10, source: "monster_loot" }
            ]
          },
          {
            id: "behemoth_rootguard",
            resultItem: "Behemoth Rootguard",
            resultLevel: 23,
            ingredients: [
              { item: "Gaiahide Plate", qty: 5, source: "monster_loot" },
              { item: "Rootquake Core", qty: 1, source: "monster_loot" },
              { item: "Ancient Gaia Sap", qty: 2, source: "monster_loot" },
              { item: "Root Fiber", qty: 10, source: "gathering_loot" },
              { item: "Thick Hide", qty: 8, source: "monster_loot" },
              { item: "Digging Claw", qty: 8, source: "monster_loot" }
            ]
          },
          {
            id: "rootsap_focus",
            resultItem: "Rootsap Focus",
            resultLevel: 22,
            ingredients: [
              { item: "Ancient Gaia Sap", qty: 2, source: "monster_loot" },
              { item: "Rootmend Core", qty: 1, source: "monster_loot" },
              { item: "Bramblehorn Shard", qty: 2, source: "monster_loot" },
              { item: "Living Bramble Fiber", qty: 6, source: "monster_loot" },
              { item: "Nature Essence", qty: 10, source: "monster_loot" }
            ]
          },
          {
            id: "lynx_fang",
            resultItem: "Lynx Fang",
            resultLevel: 27,
            ingredients: [
              { item: "Sharp Fang", qty: 6, source: "monster_loot" },
              { item: "Stone Claw", qty: 6, source: "monster_loot" },
              { item: "Ibex Horn", qty: 5, source: "monster_loot" },
              { item: "Stable Core", qty: 4, source: "gathering_loot" },
              { item: "Living Fiber", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "serpent_fang",
            resultItem: "Serpent Fang",
            resultLevel: 28,
            ingredients: [
              { item: "Stone Claw", qty: 6, source: "monster_loot" },
              { item: "Ibex Horn", qty: 6, source: "monster_loot" },
              { item: "Muscle Fiber", qty: 5, source: "monster_loot" },
              { item: "Living Fiber", qty: 4, source: "gathering_loot" },
              { item: "Earth Residue", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "hornbreaker_axe",
            resultItem: "Hornbreaker Axe",
            resultLevel: 29,
            ingredients: [
              { item: "Ibex Horn", qty: 6, source: "monster_loot" },
              { item: "Muscle Fiber", qty: 6, source: "monster_loot" },
              { item: "Hardened Stone", qty: 5, source: "monster_loot" },
              { item: "Earth Residue", qty: 4, source: "gathering_loot" },
              { item: "Dense Bone", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "stonevein_key",
            resultItem: "Stonevein Key",
            resultLevel: 28,
            ingredients: [
              { item: "Hardened Stone", qty: 6, source: "monster_loot" },
              { item: "Stone Scale", qty: 5, source: "monster_loot" },
              { item: "Petrify Gland", qty: 4, source: "monster_loot" },
              { item: "Ibex Horn", qty: 5, source: "monster_loot" },
              { item: "Predator Core", qty: 3, source: "monster_loot" },
              { item: "Stone Claw", qty: 5, source: "monster_loot" },
              { item: "Earth Residue", qty: 4, source: "gathering_loot" },
              { item: "Dense Bone", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "frostroot_key",
            resultItem: "Frostroot Key",
            resultLevel: 28,
            ingredients: [
              { item: "Soft Pine Fur", qty: 6, source: "monster_loot" },
              { item: "Frost Berry", qty: 5, source: "monster_loot" },
              { item: "Frozen Needle", qty: 6, source: "monster_loot" },
              { item: "Ice Sap Shell", qty: 5, source: "monster_loot" },
              { item: "Ice Tusk Fragment", qty: 4, source: "monster_loot" },
              { item: "Ancient Seed", qty: 5, source: "monster_loot" },
              { item: "Living Fiber", qty: 4, source: "monster_loot" },
              { item: "Winter Ward Fragment", qty: 2, source: "monster_loot" }
            ]
          },
          {
            id: "stonecaller",
            resultItem: "Stonecaller",
            resultLevel: 30,
            ingredients: [
              { item: "Muscle Fiber", qty: 6, source: "monster_loot" },
              { item: "Hardened Stone", qty: 6, source: "monster_loot" },
              { item: "Dense Fur", qty: 5, source: "monster_loot" },
              { item: "Dense Bone", qty: 4, source: "gathering_loot" },
              { item: "Cliff Moss", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "marmot_bulwark",
            resultItem: "Marmot Bulwark",
            resultLevel: 25,
            ingredients: [
              { item: "Hardened Stone", qty: 6, source: "monster_loot" },
              { item: "Dense Fur", qty: 6, source: "monster_loot" },
              { item: "Petrify Gland", qty: 5, source: "monster_loot" },
              { item: "Cliff Moss", qty: 4, source: "gathering_loot" },
              { item: "Strength Core", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "earthshell_armor",
            resultItem: "Earthshell Armor",
            resultLevel: 26,
            ingredients: [
              { item: "Dense Fur", qty: 6, source: "monster_loot" },
              { item: "Petrify Gland", qty: 6, source: "monster_loot" },
              { item: "Stone Scale", qty: 5, source: "monster_loot" },
              { item: "Strength Core", qty: 4, source: "gathering_loot" },
              { item: "Stable Core", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "rock_serpent_boots",
            resultItem: "Rock Serpent Boots",
            resultLevel: 27,
            ingredients: [
              { item: "Petrify Gland", qty: 6, source: "monster_loot" },
              { item: "Stone Scale", qty: 6, source: "monster_loot" },
              { item: "Sharp Fang", qty: 5, source: "monster_loot" },
              { item: "Stable Core", qty: 4, source: "gathering_loot" },
              { item: "Living Fiber", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "stone_lizzard_helmet",
            resultItem: "Stone Lizzard Helmet",
            resultLevel: 28,
            ingredients: [
              { item: "Stone Scale", qty: 6, source: "monster_loot" },
              { item: "Sharp Fang", qty: 6, source: "monster_loot" },
              { item: "Stone Claw", qty: 5, source: "monster_loot" },
              { item: "Living Fiber", qty: 4, source: "gathering_loot" },
              { item: "Earth Residue", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "claw_ring",
            resultItem: "Claw Ring",
            resultLevel: 26,
            ingredients: [
              { item: "Sharp Fang", qty: 6, source: "monster_loot" },
              { item: "Stone Claw", qty: 6, source: "monster_loot" },
              { item: "Ibex Horn", qty: 5, source: "monster_loot" },
              { item: "Earth Residue", qty: 4, source: "gathering_loot" },
              { item: "Dense Bone", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "stonescale_leggings",
            resultItem: "Stonescale Leggings",
            resultLevel: 29,
            ingredients: [
              { item: "Stone Claw", qty: 6, source: "monster_loot" },
              { item: "Ibex Horn", qty: 6, source: "monster_loot" },
              { item: "Muscle Fiber", qty: 5, source: "monster_loot" },
              { item: "Dense Bone", qty: 4, source: "gathering_loot" },
              { item: "Cliff Moss", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "petrify_ring",
            resultItem: "Petrify Ring",
            resultLevel: 30,
            ingredients: [
              { item: "Ibex Horn", qty: 6, source: "monster_loot" },
              { item: "Muscle Fiber", qty: 6, source: "monster_loot" },
              { item: "Hardened Stone", qty: 5, source: "monster_loot" },
              { item: "Cliff Moss", qty: 4, source: "gathering_loot" },
              { item: "Strength Core", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "core_amulet",
            resultItem: "Core Amulet",
            resultLevel: 29,
            ingredients: [
              { item: "Muscle Fiber", qty: 6, source: "monster_loot" },
              { item: "Hardened Stone", qty: 6, source: "monster_loot" },
              { item: "Dense Fur", qty: 5, source: "monster_loot" },
              { item: "Strength Core", qty: 4, source: "gathering_loot" },
              { item: "Stable Core", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "stone_bracelet",
            resultItem: "Stone Bracelet",
            resultLevel: 25,
            ingredients: [
              { item: "Hardened Stone", qty: 6, source: "monster_loot" },
              { item: "Dense Fur", qty: 6, source: "monster_loot" },
              { item: "Petrify Gland", qty: 5, source: "monster_loot" },
              { item: "Stable Core", qty: 4, source: "gathering_loot" },
              { item: "Living Fiber", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "fang_charm",
            resultItem: "Fang Charm",
            resultLevel: 27,
            ingredients: [
              { item: "Dense Fur", qty: 6, source: "monster_loot" },
              { item: "Petrify Gland", qty: 6, source: "monster_loot" },
              { item: "Stone Scale", qty: 5, source: "monster_loot" },
              { item: "Living Fiber", qty: 4, source: "gathering_loot" },
              { item: "Earth Residue", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "serpent_grip",
            resultItem: "Serpent Grip",
            resultLevel: 28,
            ingredients: [
              { item: "Petrify Gland", qty: 6, source: "monster_loot" },
              { item: "Stone Scale", qty: 6, source: "monster_loot" },
              { item: "Sharp Fang", qty: 5, source: "monster_loot" },
              { item: "Earth Residue", qty: 4, source: "gathering_loot" },
              { item: "Dense Bone", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "stonekind_band",
            resultItem: "Stonekind Band",
            resultLevel: 30,
            ingredients: [
              { item: "Stone Scale", qty: 6, source: "monster_loot" },
              { item: "Sharp Fang", qty: 6, source: "monster_loot" },
              { item: "Stone Claw", qty: 5, source: "monster_loot" },
              { item: "Dense Bone", qty: 4, source: "gathering_loot" },
              { item: "Cliff Moss", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "stonescale_armor",
            resultItem: "Stonescale Armor",
            resultLevel: 28,
            ingredients: [
              { item: "Stone Scale", qty: 7, source: "monster_loot" },
              { item: "Stable Core", qty: 5, source: "gathering_loot" },
              { item: "Living Fiber", qty: 4, source: "gathering_loot" },
              { item: "Dense Bone", qty: 4, source: "gathering_loot" },
              { item: "Thick Hide", qty: 3, source: "monster_loot" },
              { item: "Cliff Moss", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "marmot_helm",
            resultItem: "Marmot Helm",
            resultLevel: 25,
            ingredients: [
              { item: "Dense Fur", qty: 6, source: "monster_loot" },
              { item: "Dense Bone", qty: 5, source: "gathering_loot" },
              { item: "Root Fiber", qty: 3, source: "gathering_loot" },
              { item: "Stone Fragment", qty: 3, source: "monster_loot" },
              { item: "Seeds", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "stonepulse_amulet",
            resultItem: "Stonepulse Amulet",
            resultLevel: 29,
            ingredients: [
              { item: "Earth Residue", qty: 6, source: "gathering_loot" },
              { item: "Stable Core", qty: 5, source: "gathering_loot" },
              { item: "Cliff Moss", qty: 3, source: "gathering_loot" },
              { item: "Distorted Core", qty: 3, source: "monster_loot" },
              { item: "Living Fiber", qty: 2, source: "gathering_loot" }
            ]
          }]
      },
      {
        id: "mid_high",
        minLevel: 31,
        maxLevel: 40,
        recipes: [
          {
            id: "foxfang_blade",
            resultItem: "Foxfang Blade",
            resultLevel: 38,
            ingredients: [
              { item: "Fox Fang", qty: 7, source: "monster_loot" },
              { item: "Forest Fur", qty: 6, source: "monster_loot" },
              { item: "Antler Piece", qty: 5, source: "monster_loot" },
              { item: "Spirit Seed", qty: 5, source: "monster_loot" },
              { item: "Reinforced Bone", qty: 4, source: "gathering_loot" },
              { item: "Living Fiber", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "stagpiercer",
            resultItem: "Stagpiercer",
            resultLevel: 39,
            ingredients: [
              { item: "Forest Fur", qty: 7, source: "monster_loot" },
              { item: "Antler Piece", qty: 6, source: "monster_loot" },
              { item: "Spirit Seed", qty: 5, source: "monster_loot" },
              { item: "Thick Bone", qty: 5, source: "monster_loot" },
              { item: "Rage Core", qty: 4, source: "monster_loot" },
              { item: "Living Fiber", qty: 4, source: "gathering_loot" },
              { item: "Growth Seed", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "gorilla_crusher",
            resultItem: "Gorilla Crusher",
            resultLevel: 40,
            ingredients: [
              { item: "Antler Piece", qty: 7, source: "monster_loot" },
              { item: "Spirit Seed", qty: 6, source: "monster_loot" },
              { item: "Thick Bone", qty: 5, source: "monster_loot" },
              { item: "Rage Core", qty: 5, source: "monster_loot" },
              { item: "Growth Seed", qty: 4, source: "gathering_loot" },
              { item: "Heavy Bone", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "wraithcall_scepter",
            resultItem: "Wraithcall Scepter",
            resultLevel: 40,
            ingredients: [
              { item: "Spirit Seed", qty: 7, source: "monster_loot" },
              { item: "Thick Bone", qty: 6, source: "monster_loot" },
              { item: "Rage Core", qty: 5, source: "monster_loot" },
              { item: "Soul Fragment", qty: 5, source: "monster_loot" },
              { item: "Shadow Residue", qty: 4, source: "monster_loot" },
              { item: "Heavy Bone", qty: 4, source: "gathering_loot" },
              { item: "Jungle Fiber", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "gorilla_armor",
            resultItem: "Gorilla Armor",
            resultLevel: 40,
            ingredients: [
              { item: "Thick Bone", qty: 7, source: "monster_loot" },
              { item: "Rage Core", qty: 6, source: "monster_loot" },
              { item: "Soul Fragment", qty: 5, source: "monster_loot" },
              { item: "Shadow Residue", qty: 5, source: "monster_loot" },
              { item: "Jungle Fiber", qty: 4, source: "gathering_loot" },
              { item: "Spirit Core", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "spirit_bark_armor",
            resultItem: "Wraith Raggs",
            resultLevel: 40,
            ingredients: [
              { item: "Rage Core", qty: 7, source: "monster_loot" },
              { item: "Soul Fragment", qty: 6, source: "monster_loot" },
              { item: "Shadow Residue", qty: 5, source: "monster_loot" },
              { item: "Fox Fang", qty: 5, source: "monster_loot" },
              { item: "Forest Fur", qty: 4, source: "monster_loot" },
              { item: "Spirit Core", qty: 4, source: "gathering_loot" },
              { item: "Reinforced Bone", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "primate_boots",
            resultItem: "Primate Boots",
            resultLevel: 37,
            ingredients: [
              { item: "Soul Fragment", qty: 7, source: "monster_loot" },
              { item: "Shadow Residue", qty: 6, source: "monster_loot" },
              { item: "Fox Fang", qty: 5, source: "monster_loot" },
              { item: "Forest Fur", qty: 5, source: "monster_loot" },
              { item: "Reinforced Bone", qty: 4, source: "gathering_loot" },
              { item: "Living Fiber", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "antler_helm",
            resultItem: "Antler Helm",
            resultLevel: 38,
            ingredients: [
              { item: "Shadow Residue", qty: 7, source: "monster_loot" },
              { item: "Fox Fang", qty: 6, source: "monster_loot" },
              { item: "Forest Fur", qty: 5, source: "monster_loot" },
              { item: "Antler Piece", qty: 5, source: "monster_loot" },
              { item: "Spirit Seed", qty: 4, source: "monster_loot" },
              { item: "Living Fiber", qty: 4, source: "gathering_loot" },
              { item: "Growth Seed", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "forest_leggings",
            resultItem: "Forest Leggings",
            resultLevel: 39,
            ingredients: [
              { item: "Forest Fur", qty: 7, source: "monster_loot" },
              { item: "Antler Piece", qty: 6, source: "monster_loot" },
              { item: "Spirit Seed", qty: 5, source: "monster_loot" },
              { item: "Thick Bone", qty: 5, source: "monster_loot" },
              { item: "Rage Core", qty: 4, source: "monster_loot" },
              { item: "Heavy Bone", qty: 4, source: "gathering_loot" },
              { item: "Jungle Fiber", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "soul_ring",
            resultItem: "Soul Ring",
            resultLevel: 40,
            ingredients: [
              { item: "Antler Piece", qty: 7, source: "monster_loot" },
              { item: "Spirit Seed", qty: 6, source: "monster_loot" },
              { item: "Thick Bone", qty: 5, source: "monster_loot" },
              { item: "Rage Core", qty: 5, source: "monster_loot" },
              { item: "Jungle Fiber", qty: 4, source: "gathering_loot" },
              { item: "Spirit Core", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "heart_of_the_jungle",
            resultItem: "Heart of the Jungle",
            resultLevel: 38,
            ingredients: [
              { item: "Spirit Seed", qty: 7, source: "monster_loot" },
              { item: "Thick Bone", qty: 6, source: "monster_loot" },
              { item: "Rage Core", qty: 5, source: "monster_loot" },
              { item: "Soul Fragment", qty: 5, source: "monster_loot" },
              { item: "Shadow Residue", qty: 4, source: "monster_loot" },
              { item: "Spirit Core", qty: 4, source: "gathering_loot" },
              { item: "Reinforced Bone", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "primate_bracelet",
            resultItem: "Primate Bracelet",
            resultLevel: 37,
            ingredients: [
              { item: "Thick Bone", qty: 7, source: "monster_loot" },
              { item: "Rage Core", qty: 6, source: "monster_loot" },
              { item: "Soul Fragment", qty: 5, source: "monster_loot" },
              { item: "Shadow Residue", qty: 5, source: "monster_loot" },
              { item: "Reinforced Bone", qty: 4, source: "gathering_loot" },
              { item: "Living Fiber", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "fang_charm_alt",
            resultItem: "Fang Charm ALT",
            resultLevel: 35,
            ingredients: [
              { item: "Rage Core", qty: 7, source: "monster_loot" },
              { item: "Soul Fragment", qty: 6, source: "monster_loot" },
              { item: "Shadow Residue", qty: 5, source: "monster_loot" },
              { item: "Fox Fang", qty: 5, source: "monster_loot" },
              { item: "Forest Fur", qty: 4, source: "monster_loot" },
              { item: "Living Fiber", qty: 4, source: "gathering_loot" },
              { item: "Growth Seed", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "growth_loop",
            resultItem: "Growth Loop",
            resultLevel: 36,
            ingredients: [
              { item: "Soul Fragment", qty: 7, source: "monster_loot" },
              { item: "Shadow Residue", qty: 6, source: "monster_loot" },
              { item: "Fox Fang", qty: 5, source: "monster_loot" },
              { item: "Forest Fur", qty: 5, source: "monster_loot" },
              { item: "Growth Seed", qty: 4, source: "gathering_loot" },
              { item: "Heavy Bone", qty: 4, source: "gathering_loot" }
            ]
          },
          {
            id: "swiftbrush_boots",
            resultItem: "Swiftbrush Boots",
            resultLevel: 37,
            ingredients: [
              { item: "Forest Fur", qty: 6, source: "monster_loot" },
              { item: "Living Fiber", qty: 5, source: "gathering_loot" },
              { item: "Reinforced Bone", qty: 4, source: "gathering_loot" },
              { item: "Growth Seed", qty: 4, source: "gathering_loot" },
              { item: "Sharp Fang", qty: 3, source: "monster_loot" },
              { item: "Tough Hide", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "greenleaf_vest",
            resultItem: "Greenleaf Vest",
            resultLevel: 36,
            ingredients: [
              { item: "Forest Fur", qty: 6, source: "monster_loot" },
              { item: "Growth Seed", qty: 4, source: "gathering_loot" },
              { item: "Living Fiber", qty: 4, source: "gathering_loot" },
              { item: "Antler Piece", qty: 3, source: "monster_loot" },
              { item: "Dense Bone", qty: 3, source: "gathering_loot" },
              { item: "Root Fiber", qty: 3, source: "gathering_loot" },
              { item: "Tough Hide", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "soul_echo_amulet",
            resultItem: "Soul Echo Amulet",
            resultLevel: 40,
            ingredients: [
              { item: "Soul Fragment", qty: 7, source: "monster_loot" },
              { item: "Spirit Core", qty: 5, source: "gathering_loot" },
              { item: "Shadow Residue", qty: 4, source: "gathering_loot" },
              { item: "Shadow Dust", qty: 3, source: "gathering_loot" },
              { item: "Distorted Core", qty: 3, source: "monster_loot" },
              { item: "Residue", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "venomstone_ring",
            resultItem: "Venomstone Ring",
            resultLevel: 31,
            ingredients: [
              { item: "Venomstone Fang", qty: 3, source: "monster_loot" },
              { item: "Mineral Venom Sac", qty: 2, source: "monster_loot" },
              { item: "Coilwarden Core", qty: 1, source: "monster_loot" },
              { item: "Petrified Scale", qty: 4, source: "monster_loot" },
              { item: "Petrify Gland", qty: 5, source: "monster_loot" },
              { item: "Control Core", qty: 2, source: "monster_loot" },
              { item: "Earth Residue", qty: 8, source: "gathering_loot" }
            ]
          },
          {
            id: "granitehorn_ramplate",
            resultItem: "Granitehorn Ramplate",
            resultLevel: 31,
            ingredients: [
              { item: "Granite Horn Fragment", qty: 4, source: "monster_loot" },
              { item: "Breaker Hide Plate", qty: 4, source: "monster_loot" },
              { item: "Faultline Hoof", qty: 2, source: "monster_loot" },
              { item: "Ibex Horn", qty: 6, source: "monster_loot" },
              { item: "Stone Skin", qty: 8, source: "monster_loot" },
              { item: "Defense Core", qty: 2, source: "monster_loot" },
              { item: "Hardened Stone", qty: 10, source: "monster_loot" }
            ]
          },
          {
            id: "breakers_horn_bracers",
            resultItem: "Breaker's Horn Bracers",
            resultLevel: 31,
            ingredients: [
              { item: "Granite Horn Fragment", qty: 3, source: "monster_loot" },
              { item: "Faultline Hoof", qty: 3, source: "monster_loot" },
              { item: "Hornbreaker Core", qty: 1, source: "monster_loot" },
              { item: "Ibex Horn", qty: 5, source: "monster_loot" },
              { item: "Stone Claw", qty: 6, source: "monster_loot" },
              { item: "Strength Core", qty: 2, source: "monster_loot" },
              { item: "Muscle Fiber", qty: 8, source: "monster_loot" }
            ]
          },
          {
            id: "colossus_stoneplate",
            resultItem: "Colossus Stoneplate",
            resultLevel: 32,
            ingredients: [
              { item: "Colossus Plate Shard", qty: 5, source: "monster_loot" },
              { item: "Stillstone Fragment", qty: 4, source: "monster_loot" },
              { item: "Faultvein Core", qty: 2, source: "monster_loot" },
              { item: "Hardened Stone", qty: 12, source: "monster_loot" },
              { item: "Stone Skin", qty: 10, source: "monster_loot" },
              { item: "Bulwark Core", qty: 2, source: "monster_loot" },
              { item: "Earth Essence", qty: 8, source: "monster_loot" }
            ]
          },
          {
            id: "stillstone_helm",
            resultItem: "Stillstone Helm",
            resultLevel: 32,
            ingredients: [
              { item: "Stillstone Fragment", qty: 5, source: "monster_loot" },
              { item: "Colossus Plate Shard", qty: 3, source: "monster_loot" },
              { item: "Pressurecore Heart", qty: 1, source: "monster_loot" },
              { item: "Stone Scale", qty: 8, source: "monster_loot" },
              { item: "Dense Bone", qty: 6, source: "gathering_loot" },
              { item: "Stable Core", qty: 2, source: "gathering_loot" },
              { item: "Earth Residue", qty: 10, source: "gathering_loot" }
            ]
          },
          {
            id: "faultvein_pants",
            resultItem: "Faultvein Pants",
            resultLevel: 33,
            ingredients: [
              { item: "Faultvein Core", qty: 3, source: "monster_loot" },
              { item: "Stillstone Fragment", qty: 4, source: "monster_loot" },
              { item: "Colossus Plate Shard", qty: 3, source: "monster_loot" },
              { item: "Stone Skin", qty: 8, source: "monster_loot" },
              { item: "Dense Fur", qty: 6, source: "monster_loot" },
              { item: "Defense Core", qty: 2, source: "monster_loot" },
              { item: "Cliff Moss", qty: 10, source: "gathering_loot" }
            ]
          },
          {
            id: "mountainheart_maul",
            resultItem: "Mountainheart Maul",
            resultLevel: 33,
            ingredients: [
              { item: "Mountainbound Soulstone", qty: 1, source: "monster_loot" },
              { item: "Pressurecore Heart", qty: 2, source: "monster_loot" },
              { item: "Faultvein Core", qty: 4, source: "monster_loot" },
              { item: "Colossus Plate Shard", qty: 4, source: "monster_loot" },
              { item: "Granite Horn Fragment", qty: 3, source: "monster_loot" },
              { item: "Ibex Horn", qty: 6, source: "monster_loot" },
              { item: "Strength Core", qty: 3, source: "monster_loot" },
              { item: "Hardened Stone", qty: 14, source: "monster_loot" }
            ]
          },
          {
            id: "pressurecore_amulet",
            resultItem: "Pressurecore Amulet",
            resultLevel: 33,
            ingredients: [
              { item: "Pressurecore Heart", qty: 2, source: "monster_loot" },
              { item: "Mountainbound Soulstone", qty: 1, source: "monster_loot" },
              { item: "Stillstone Fragment", qty: 4, source: "monster_loot" },
              { item: "Faultvein Core", qty: 2, source: "monster_loot" },
              { item: "Coilwarden Core", qty: 1, source: "monster_loot" },
              { item: "Stable Core", qty: 2, source: "gathering_loot" },
              { item: "Earth Essence", qty: 8, source: "monster_loot" }
            ]
          },
          {
            id: "whitebark_grace_amulet",
            resultItem: "Whitebark Grace Amulet",
            resultLevel: 31,
            ingredients: [
              { item: "Whitebark Antler", qty: 3, source: "monster_loot" },
              { item: "Frozen Mend Core", qty: 2, source: "monster_loot" },
              { item: "Whitebark Heartseed", qty: 1, source: "monster_loot" },
              { item: "Ancient Seed", qty: 8, source: "monster_loot" },
              { item: "Living Fiber", qty: 8, source: "monster_loot" },
              { item: "Frost Berry", qty: 6, source: "monster_loot" },
              { item: "Nature Core", qty: 2, source: "monster_loot" }
            ]
          },
          {
            id: "frosthorn_warplate",
            resultItem: "Frosthorn Warplate",
            resultLevel: 31,
            ingredients: [
              { item: "Frosthorn Fragment", qty: 4, source: "monster_loot" },
              { item: "Bulwark Icehide", qty: 4, source: "monster_loot" },
              { item: "Frozen Tusk Core", qty: 2, source: "monster_loot" },
              { item: "Ice Tusk Fragment", qty: 6, source: "monster_loot" },
              { item: "Frosthide Plate", qty: 8, source: "monster_loot" },
              { item: "Endurance Core", qty: 2, source: "monster_loot" },
              { item: "Guardian Iceplate", qty: 5, source: "monster_loot" }
            ]
          },
          {
            id: "bulwark_frost_bracers",
            resultItem: "Bulwark Frost Bracers",
            resultLevel: 31,
            ingredients: [
              { item: "Frosthorn Fragment", qty: 3, source: "monster_loot" },
              { item: "Bulwark Icehide", qty: 3, source: "monster_loot" },
              { item: "Frosthorn Soulplate", qty: 1, source: "monster_loot" },
              { item: "Ice Tusk Fragment", qty: 5, source: "monster_loot" },
              { item: "Frozen Bark Core", qty: 5, source: "monster_loot" },
              { item: "Winter Ward Fragment", qty: 4, source: "monster_loot" },
              { item: "Titan Core", qty: 1, source: "monster_loot" }
            ]
          },
          {
            id: "frosthoof_greaves",
            resultItem: "Frosthoof Greaves",
            resultLevel: 32,
            ingredients: [
              { item: "Frosthorn Fragment", qty: 3, source: "monster_loot" },
              { item: "Frozen Tusk Core", qty: 2, source: "monster_loot" },
              { item: "Bulwark Icehide", qty: 2, source: "monster_loot" },
              { item: "Ice Tusk Fragment", qty: 6, source: "monster_loot" },
              { item: "Frosthide Plate", qty: 6, source: "monster_loot" },
              { item: "Guardian Iceplate", qty: 5, source: "monster_loot" },
              { item: "Endurance Core", qty: 2, source: "monster_loot" }
            ]
          },
          {
            id: "childs_frost_veil",
            resultItem: "Child's Frost Veil",
            resultLevel: 32,
            ingredients: [
              { item: "Frost Veil Scrap", qty: 5, source: "monster_loot" },
              { item: "Sleeping Root Fragment", qty: 4, source: "monster_loot" },
              { item: "Innocent Winter Core", qty: 2, source: "monster_loot" },
              { item: "Matron Rootcloth", qty: 3, source: "monster_loot" },
              { item: "Ancient Seed", qty: 10, source: "monster_loot" },
              { item: "Living Fiber", qty: 10, source: "monster_loot" },
              { item: "Frost Berry", qty: 8, source: "monster_loot" }
            ]
          },
          {
            id: "cradlewood_robe",
            resultItem: "Cradlewood Robe",
            resultLevel: 32,
            ingredients: [
              { item: "Sleeping Root Fragment", qty: 5, source: "monster_loot" },
              { item: "Frost Veil Scrap", qty: 3, source: "monster_loot" },
              { item: "Frozen Heartseed", qty: 1, source: "monster_loot" },
              { item: "Whitebark Antler", qty: 3, source: "monster_loot" },
              { item: "Guardian Iceplate", qty: 8, source: "monster_loot" },
              { item: "Frozen Bark Core", qty: 6, source: "monster_loot" },
              { item: "Nature Core", qty: 2, source: "monster_loot" }
            ]
          },
          {
            id: "innocent_winter_pants",
            resultItem: "Innocent Winter Pants",
            resultLevel: 33,
            ingredients: [
              { item: "Innocent Winter Core", qty: 3, source: "monster_loot" },
              { item: "Sleeping Root Fragment", qty: 4, source: "monster_loot" },
              { item: "Frost Veil Scrap", qty: 3, source: "monster_loot" },
              { item: "Matron Rootcloth", qty: 4, source: "monster_loot" },
              { item: "Living Fiber", qty: 10, source: "monster_loot" },
              { item: "Frosthide Plate", qty: 6, source: "monster_loot" },
              { item: "Winter Ward Fragment", qty: 5, source: "monster_loot" }
            ]
          },
          {
            id: "lullaby_staff",
            resultItem: "Lullaby Staff",
            resultLevel: 33,
            ingredients: [
              { item: "Lullaby Soulcore", qty: 1, source: "monster_loot" },
              { item: "Frozen Heartseed", qty: 2, source: "monster_loot" },
              { item: "Innocent Winter Core", qty: 4, source: "monster_loot" },
              { item: "Sleeping Root Fragment", qty: 4, source: "monster_loot" },
              { item: "Whitebark Heartseed", qty: 2, source: "monster_loot" },
              { item: "Frozen Needle", qty: 8, source: "monster_loot" },
              { item: "Ice Sap Shell", qty: 8, source: "monster_loot" },
              { item: "Control Core", qty: 2, source: "monster_loot" }
            ]
          },
          {
            id: "frozen_heartseed_ring",
            resultItem: "Frozen Heartseed Ring",
            resultLevel: 33,
            ingredients: [
              { item: "Frozen Heartseed", qty: 2, source: "monster_loot" },
              { item: "Lullaby Soulcore", qty: 1, source: "monster_loot" },
              { item: "Innocent Winter Core", qty: 2, source: "monster_loot" },
              { item: "Whitebark Heartseed", qty: 1, source: "monster_loot" },
              { item: "Frostbite Seed", qty: 8, source: "monster_loot" },
              { item: "Ancient Seed", qty: 8, source: "monster_loot" },
              { item: "Nature Core", qty: 2, source: "monster_loot" }
            ]
          }]
      },
      {
        id: "high_end",
        minLevel: 41,
        maxLevel: 99,
        recipes: [
          {
            id: "ashmaw_cleaver",
            resultItem: "Ashmaw Cleaver",
            resultLevel: 45,
            ingredients: [
              { item: "Ash Scale", qty: 8, source: "monster_loot" },
              { item: "Burnt Hide", qty: 7, source: "monster_loot" },
              { item: "Burning Fang", qty: 6, source: "monster_loot" },
              { item: "Ember Fragment", qty: 6, source: "monster_loot" },
              { item: "Magma Hide", qty: 5, source: "monster_loot" },
              { item: "Titan Core", qty: 3, source: "gathering_loot" },
              { item: "Heavy Bone", qty: 2, source: "gathering_loot" },
              { item: "Fire Seed", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "emberfang",
            resultItem: "Emberfang",
            resultLevel: 47,
            ingredients: [
              { item: "Burnt Hide", qty: 8, source: "monster_loot" },
              { item: "Burning Fang", qty: 7, source: "monster_loot" },
              { item: "Ember Fragment", qty: 6, source: "monster_loot" },
              { item: "Magma Hide", qty: 6, source: "monster_loot" },
              { item: "Lava Core", qty: 5, source: "monster_loot" },
              { item: "Frozen Shell", qty: 5, source: "monster_loot" },
              { item: "Heavy Bone", qty: 3, source: "gathering_loot" },
              { item: "Fire Seed", qty: 2, source: "gathering_loot" },
              { item: "Ancient Seed", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "frozen_edge",
            resultItem: "Frozen Edge",
            resultLevel: 50,
            ingredients: [
              { item: "Burning Fang", qty: 8, source: "monster_loot" },
              { item: "Ember Fragment", qty: 7, source: "monster_loot" },
              { item: "Magma Hide", qty: 6, source: "monster_loot" },
              { item: "Lava Core", qty: 6, source: "monster_loot" },
              { item: "Frozen Shell", qty: 5, source: "monster_loot" },
              { item: "Ice Fang", qty: 5, source: "monster_loot" },
              { item: "Basilisk Eye", qty: 4, source: "monster_loot" },
              { item: "Fire Seed", qty: 3, source: "gathering_loot" },
              { item: "Ancient Seed", qty: 2, source: "gathering_loot" },
              { item: "Living Fiber", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "basilisk_staff",
            resultItem: "Basilisk Staff",
            resultLevel: 52,
            ingredients: [
              { item: "Ember Fragment", qty: 8, source: "monster_loot" },
              { item: "Magma Hide", qty: 7, source: "monster_loot" },
              { item: "Lava Core", qty: 6, source: "monster_loot" },
              { item: "Frozen Shell", qty: 6, source: "monster_loot" },
              { item: "Ice Fang", qty: 5, source: "monster_loot" },
              { item: "Ancient Seed", qty: 3, source: "gathering_loot" },
              { item: "Living Fiber", qty: 2, source: "gathering_loot" },
              { item: "Ash Residue", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "magmahide_plate",
            resultItem: "Magmahide Plate",
            resultLevel: 50,
            ingredients: [
              { item: "Magma Hide", qty: 8, source: "monster_loot" },
              { item: "Lava Core", qty: 7, source: "monster_loot" },
              { item: "Frozen Shell", qty: 6, source: "monster_loot" },
              { item: "Ice Fang", qty: 6, source: "monster_loot" },
              { item: "Basilisk Eye", qty: 5, source: "monster_loot" },
              { item: "Molten Scale", qty: 5, source: "monster_loot" },
              { item: "Living Fiber", qty: 3, source: "gathering_loot" },
              { item: "Ash Residue", qty: 2, source: "gathering_loot" },
              { item: "Ember Dust", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "glacier_shell",
            resultItem: "Glacier Shell",
            resultLevel: 49,
            ingredients: [
              { item: "Lava Core", qty: 8, source: "monster_loot" },
              { item: "Frozen Shell", qty: 7, source: "monster_loot" },
              { item: "Ice Fang", qty: 6, source: "monster_loot" },
              { item: "Basilisk Eye", qty: 6, source: "monster_loot" },
              { item: "Molten Scale", qty: 5, source: "monster_loot" },
              { item: "Ash Scale", qty: 5, source: "monster_loot" },
              { item: "Burnt Hide", qty: 4, source: "monster_loot" },
              { item: "Ash Residue", qty: 3, source: "gathering_loot" },
              { item: "Ember Dust", qty: 2, source: "gathering_loot" },
              { item: "Chill Residue", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "flame_boots",
            resultItem: "Flame Boots",
            resultLevel: 46,
            ingredients: [
              { item: "Frozen Shell", qty: 8, source: "monster_loot" },
              { item: "Ice Fang", qty: 7, source: "monster_loot" },
              { item: "Basilisk Eye", qty: 6, source: "monster_loot" },
              { item: "Molten Scale", qty: 6, source: "monster_loot" },
              { item: "Ash Scale", qty: 5, source: "monster_loot" },
              { item: "Ember Dust", qty: 3, source: "gathering_loot" },
              { item: "Chill Residue", qty: 2, source: "gathering_loot" },
              { item: "Shadow Dust", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "ice_helm",
            resultItem: "Ice Helm",
            resultLevel: 48,
            ingredients: [
              { item: "Ice Fang", qty: 8, source: "monster_loot" },
              { item: "Basilisk Eye", qty: 7, source: "monster_loot" },
              { item: "Molten Scale", qty: 6, source: "monster_loot" },
              { item: "Ash Scale", qty: 6, source: "monster_loot" },
              { item: "Burnt Hide", qty: 5, source: "monster_loot" },
              { item: "Burning Fang", qty: 5, source: "monster_loot" },
              { item: "Chill Residue", qty: 3, source: "gathering_loot" },
              { item: "Shadow Dust", qty: 2, source: "gathering_loot" },
              { item: "Spirit Core", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "molten_bracelet",
            resultItem: "Molten Bracelet",
            resultLevel: 47,
            ingredients: [
              { item: "Basilisk Eye", qty: 8, source: "monster_loot" },
              { item: "Molten Scale", qty: 7, source: "monster_loot" },
              { item: "Ash Scale", qty: 6, source: "monster_loot" },
              { item: "Burnt Hide", qty: 6, source: "monster_loot" },
              { item: "Burning Fang", qty: 5, source: "monster_loot" },
              { item: "Ember Fragment", qty: 5, source: "monster_loot" },
              { item: "Magma Hide", qty: 4, source: "monster_loot" },
              { item: "Shadow Dust", qty: 3, source: "gathering_loot" },
              { item: "Spirit Core", qty: 2, source: "gathering_loot" },
              { item: "Titan Core", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "frost_leggings",
            resultItem: "Frost Leggings",
            resultLevel: 50,
            ingredients: [
              { item: "Molten Scale", qty: 8, source: "monster_loot" },
              { item: "Ash Scale", qty: 7, source: "monster_loot" },
              { item: "Burnt Hide", qty: 6, source: "monster_loot" },
              { item: "Burning Fang", qty: 6, source: "monster_loot" },
              { item: "Ember Fragment", qty: 5, source: "monster_loot" },
              { item: "Spirit Core", qty: 3, source: "gathering_loot" },
              { item: "Titan Core", qty: 2, source: "gathering_loot" },
              { item: "Heavy Bone", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "ember_bracelet",
            resultItem: "Ember Bracelet",
            resultLevel: 47,
            ingredients: [
              { item: "Burnt Hide", qty: 8, source: "monster_loot" },
              { item: "Burning Fang", qty: 7, source: "monster_loot" },
              { item: "Ember Fragment", qty: 6, source: "monster_loot" },
              { item: "Magma Hide", qty: 6, source: "monster_loot" },
              { item: "Lava Core", qty: 5, source: "monster_loot" },
              { item: "Frozen Shell", qty: 5, source: "monster_loot" },
              { item: "Ice Fang", qty: 4, source: "monster_loot" },
              { item: "Heavy Bone", qty: 3, source: "gathering_loot" },
              { item: "Fire Seed", qty: 2, source: "gathering_loot" },
              { item: "Ancient Seed", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "frost_bracelet",
            resultItem: "Frost Bracelet",
            resultLevel: 49,
            ingredients: [
              { item: "Burning Fang", qty: 8, source: "monster_loot" },
              { item: "Ember Fragment", qty: 7, source: "monster_loot" },
              { item: "Magma Hide", qty: 6, source: "monster_loot" },
              { item: "Lava Core", qty: 6, source: "monster_loot" },
              { item: "Frozen Shell", qty: 5, source: "monster_loot" },
              { item: "Fire Seed", qty: 3, source: "gathering_loot" },
              { item: "Ancient Seed", qty: 2, source: "gathering_loot" },
              { item: "Living Fiber", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "inferno_charm",
            resultItem: "Inferno Charm",
            resultLevel: 46,
            ingredients: [
              { item: "Magma Hide", qty: 8, source: "monster_loot" },
              { item: "Lava Core", qty: 7, source: "monster_loot" },
              { item: "Frozen Shell", qty: 6, source: "monster_loot" },
              { item: "Ice Fang", qty: 6, source: "monster_loot" },
              { item: "Basilisk Eye", qty: 5, source: "monster_loot" },
              { item: "Molten Scale", qty: 5, source: "monster_loot" },
              { item: "Ash Scale", qty: 4, source: "monster_loot" },
              { item: "Living Fiber", qty: 3, source: "gathering_loot" },
              { item: "Ash Residue", qty: 2, source: "gathering_loot" },
              { item: "Ember Dust", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "ice_band",
            resultItem: "Ice Band",
            resultLevel: 48,
            ingredients: [
              { item: "Lava Core", qty: 8, source: "monster_loot" },
              { item: "Frozen Shell", qty: 7, source: "monster_loot" },
              { item: "Ice Fang", qty: 6, source: "monster_loot" },
              { item: "Basilisk Eye", qty: 6, source: "monster_loot" },
              { item: "Molten Scale", qty: 5, source: "monster_loot" },
              { item: "Ash Residue", qty: 3, source: "gathering_loot" },
              { item: "Ember Dust", qty: 2, source: "gathering_loot" },
              { item: "Chill Residue", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "molten_gaze_ring",
            resultItem: "Molten Gaze Ring",
            resultLevel: 50,
            ingredients: [
              { item: "Molten Scale", qty: 5, source: "monster_loot" },
              { item: "Lava Core", qty: 5, source: "gathering_loot" },
              { item: "Fire Seed", qty: 4, source: "gathering_loot" },
              { item: "Ash Residue", qty: 3, source: "gathering_loot" },
              { item: "Ember Fragment", qty: 3, source: "monster_loot" },
              { item: "Dense Bone", qty: 3, source: "gathering_loot" },
              { item: "Residue", qty: 2, source: "gathering_loot" },
              { item: "Tough Hide", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "ember_core_ring",
            resultItem: "Ember Core Ring",
            resultLevel: 47,
            ingredients: [
              { item: "Ember Fragment", qty: 6, source: "monster_loot" },
              { item: "Ember Dust", qty: 4, source: "gathering_loot" },
              { item: "Sharp Fang", qty: 3, source: "monster_loot" },
              { item: "Fire Seed", qty: 3, source: "gathering_loot" },
              { item: "Dense Bone", qty: 3, source: "gathering_loot" },
              { item: "Tough Hide", qty: 3, source: "gathering_loot" },
              { item: "Residue", qty: 2, source: "gathering_loot" },
              { item: "Sand Residue", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "icebound_boots",
            resultItem: "Icebound Boots",
            resultLevel: 48,
            ingredients: [
              { item: "Frozen Shell", qty: 7, source: "monster_loot" },
              { item: "Chill Residue", qty: 4, source: "gathering_loot" },
              { item: "Stable Core", qty: 4, source: "gathering_loot" },
              { item: "Dense Bone", qty: 4, source: "gathering_loot" },
              { item: "Tough Hide", qty: 3, source: "gathering_loot" },
              { item: "Living Fiber", qty: 3, source: "gathering_loot" },
              { item: "Residue", qty: 2, source: "gathering_loot" },
              { item: "Stone Scale", qty: 2, source: "monster_loot" },
              { item: "Root Fiber", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "lava_greaves",
            resultItem: "Lava Greaves",
            resultLevel: 49,
            ingredients: [
              { item: "Lava Core", qty: 7, source: "monster_loot" },
              { item: "Magma Hide", qty: 6, source: "monster_loot" },
              { item: "Molten Scale", qty: 5, source: "monster_loot" },
              { item: "Fire Seed", qty: 4, source: "gathering_loot" },
              { item: "Titan Core", qty: 4, source: "gathering_loot" },
              { item: "Heavy Bone", qty: 4, source: "gathering_loot" },
              { item: "Dense Bone", qty: 3, source: "gathering_loot" },
              { item: "Ash Residue", qty: 3, source: "gathering_loot" },
              { item: "Living Fiber", qty: 3, source: "gathering_loot" },
              { item: "Tough Hide", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "basilisk_eye_amulet",
            resultItem: "Basilisk Eye Amulet",
            resultLevel: 52,
            ingredients: [
              { item: "Basilisk Eye", qty: 6, source: "monster_loot" },
              { item: "Molten Scale", qty: 5, source: "monster_loot" },
              { item: "Spirit Core", qty: 4, source: "gathering_loot" },
              { item: "Ancient Seed", qty: 3, source: "gathering_loot" },
              { item: "Shadow Dust", qty: 3, source: "gathering_loot" },
              { item: "Lava Core", qty: 3, source: "gathering_loot" },
              { item: "Ember Dust", qty: 3, source: "gathering_loot" },
              { item: "Dense Bone", qty: 2, source: "gathering_loot" },
              { item: "Residue", qty: 2, source: "gathering_loot" },
              { item: "Tough Hide", qty: 2, source: "gathering_loot" }
            ]
          }]
      }
    ]
  },

  /**
   * Count of equippable items per `set` on `GAME_CONFIG.items` (MMO sync: how many pieces exist for set bonuses).
   * Recompute when adding/removing set gear (e.g. `node tools/_count_equipment_set_pieces.mjs`).
   */
  mmoEquipmentSetPieceTotals: {
    "Ash Titan": 3,
    Basilisk: 1,
    "Basilisk Oracle": 2,
    Boarbreaker: 5,
    Bramblehorn: 3,
    Fangroot: 3,
    Gaiahide: 4,
    Granitehorn: 2,
    Frosthorn: 3,
    "Held Colossus": 4,
    "Sleeping Winter": 4,
    "Channeler Set": 3,
    "Crusher Set": 3,
    Dunestrike: 4,
    "Dune Mourner Set": 4,
    Earthbinder: 3,
    Ember: 1,
    "Ember Assassin": 3,
    Frost: 1,
    Frostfang: 3,
    "Frozen Bastion": 3,
    Greenleaf: 2,
    "Greenleaf Assassin": 4,
    "Ibex Dominator": 1,
    "Jungle Titan": 3,
    Lynxstrike: 2,
    Mirage: 3,
    "Mirage Maw Set": 3,
    Molten: 1,
    "Molten Colossus": 1,
    Predator: 1,
    "Primal Rage": 1,
    "Rock Serpent": 4,
    Skimmer: 4,
    Soulbinder: 2,
    Stoneguard: 4,
    "Stormfang Set": 4,
    "Stormwake Set": 4,
    "Thornback Graveguard Set": 3,
    "Tempest Caller Set": 3,
    "Thornback Bulwark": 3,
    Tidecaster: 5,
    Tideguard: 7,
    "Tidemother Set": 3,
    Venomcaster: 2,
    "Verdant Rite": 5,
    Wraith: 1
  },

  /** Highest equipped tier only (not cumulative). Stats only — no combat procs. */
  mmoEquipmentSetBonuses: {
    "Ash Titan": {
      2: { STR: 10, "Phys Damage": 8 },
      3: { STR: 24, "Phys Damage": 8, "Phys Resist": 6 }
    },
    "Basilisk Oracle": {
      2: { INT: 16 }
    },
    Boarbreaker: {
      2: { STR: 3, VIT: 3, "Phys Resist": 5 },
      3: { STR: 7, VIT: 3, "Phys Resist": 5 },
      4: { STA: 1, STR: 7, VIT: 3, "Phys Resist": 5, "Phys Damage": 5 },
      5: { STA: 1, STR: 7, VIT: 8, "Phys Resist": 11, "Phys Damage": 5 }
    },
    Bramblehorn: {
      2: { VIT: 8, HEAL: 4, "Magic Resist": 5 },
      3: { VIT: 14, INT: 10, HEAL: 7, "Magic Resist": 5, "Status Resist": 4 }
    },
    Fangroot: {
      2: { DEX: 10, Crit: 4, ACC: 3 },
      3: { DEX: 18, STR: 10, Crit: 7, ACC: 5, "Phys Damage": 5 }
    },
    Gaiahide: {
      2: { VIT: 12, HP: 120, "Phys Resist": 4 },
      3: { VIT: 20, STR: 12, HP: 220, "Phys Resist": 6, "Status Resist": 4 },
      4: { STA: 1, VIT: 28, STR: 18, HP: 340, "Phys Resist": 8, "Status Resist": 6 }
    },
    Granitehorn: {
      2: { STR: 14, HP: 140, "Phys Damage": 4, "Phys Resist": 4 }
    },
    Frosthorn: {
      2: { VIT: 14, HP: 150, "Phys Resist": 4, "Magic Resist": 4 },
      3: { VIT: 22, STR: 12, HP: 260, "Phys Resist": 6, "Magic Resist": 5, "Status Resist": 4 }
    },
    "Sleeping Winter": {
      2: { INT: 16, VIT: 10, HP: 160, HEAL: 4 },
      3: { INT: 26, VIT: 18, HP: 300, HEAL: 7, "Magic Resist": 5 },
      4: { STA: 1, INT: 36, VIT: 26, HP: 460, HEAL: 9, "Magic Damage": 7, ACC: 6 }
    },
    "Held Colossus": {
      2: { VIT: 16, HP: 180, "Phys Resist": 5 },
      3: { VIT: 26, STR: 14, HP: 320, "Phys Resist": 8, "Status Resist": 5 },
      4: { STA: 1, VIT: 36, STR: 22, HP: 480, "Phys Resist": 10, "Magic Resist": 6, "Status Resist": 7 }
    },
    "Channeler Set": {
      2: { INT: 2 },
      3: { INT: 5, "Magic Damage": 4 }
    },
    "Crusher Set": {
      2: { STR: 2, VIT: 2 },
      3: { STR: 5, VIT: 2, "Phys Resist": 4 }
    },
    Dunestrike: {
      2: { DEX: 2, Crit: 5, ACC: 3 },
      3: { DEX: 6, Crit: 5, ACC: 3, "Crit Damage": 5 },
      4: { STA: 1, DEX: 10, Crit: 5, ACC: 3, "Crit Damage": 11 }
    },
    "Dune Mourner Set": {
      2: { INT: 12, HP: 120, "Magic Damage": 4 },
      3: { INT: 20, VIT: 12, HP: 220, "Magic Damage": 7, ACC: 4 },
      4: { STA: 1, INT: 28, VIT: 18, HP: 340, "Magic Damage": 9, ACC: 6 }
    },
    Earthbinder: {
      2: { INT: 6 },
      3: { INT: 15, "Magic Damage": 6, "Magic Resist": 6 }
    },
    "Ember Assassin": {
      2: { DEX: 10, Crit: 8, "Crit Damage": 8 },
      3: { DEX: 24, Crit: 8, "Crit Damage": 8, "Phys Damage": 10, ACC: 8 }
    },
    Frostfang: {
      2: { DEX: 11 },
      3: { DEX: 26, "Crit Damage": 10 }
    },
    "Frozen Bastion": {
      2: { VIT: 11, "Magic Resist": 8 },
      3: { VIT: 25, "Magic Resist": 18, HP: 336 }
    },
    Greenleaf: {
      2: { DEX: 8, EVA: 7, "HEAL": 7 }
    },
    "Greenleaf Assassin": {
      2: { DEX: 8, Crit: 7, EVA: 7 },
      3: { DEX: 19, Crit: 7, EVA: 7, "Crit Damage": 8, ACC: 7 }
    },
    "Jungle Titan": {
      2: { STR: 8, VIT: 8, "Phys Resist": 7 },
      3: { STR: 19, VIT: 8, "Phys Resist": 7, HP: 266 }
    },
    Lynxstrike: {
      2: { DEX: 6, Crit: 6, ACC: 6 }
    },
    Mirage: {
      2: { DEX: 2, INT: 2, EVA: 5 },
      3: { DEX: 6, INT: 6, EVA: 5 }
    },
    "Mirage Maw Set": {
      2: { INT: 10, ACC: 4, EVA: 3 },
      3: { INT: 18, DEX: 10, ACC: 7, EVA: 5, "Magic Damage": 5 }
    },
    "Rock Serpent": {
      2: { VIT: 6, "Magic Resist": 6, "Phys Resist": 6 },
      3: { VIT: 6, STR: 6, INT: 6, "Magic Resist": 6, "Phys Resist": 6 },
      4: {
        STA: 1,
        VIT: 14,
        STR: 6,
        INT: 6,
        "Magic Resist": 6,
        "Phys Resist": 6,
        "Status Resist": 6
      }
    },
    Skimmer: {
      2: { DEX: 1, Crit: 2, EVA: 2 },
      3: { DEX: 3, Crit: 2, EVA: 2, ACC: 2 },
      4: { STA: 1, DEX: 5, Crit: 2, EVA: 2, ACC: 6 }
    },
    Soulbinder: {
      2: { INT: 9, "Magic Damage": 7 }
    },
    Stoneguard: {
      2: { VIT: 6, "Phys Resist": 6 },
      3: { VIT: 14, "Phys Resist": 12, HP: 182 },
      4: { STA: 1, VIT: 22, "Phys Resist": 12, HP: 442 }
    },
    "Stormfang Set": {
      2: { DEX: 2, Crit: 4, EVA: 3 },
      3: { DEX: 5, Crit: 4, EVA: 3, "Crit Damage": 4, ACC: 3 },
      4: { STA: 1, DEX: 8, Crit: 4, EVA: 7, "Crit Damage": 4, ACC: 3 }
    },
    "Stormwake Set": {
      2: { DEX: 2, INT: 2 },
      3: { DEX: 5, INT: 5, Crit: 5 },
      4: {
        STA: 1,
        DEX: 5,
        INT: 5,
        Crit: 5,
        "Magic Damage": 5,
        "Crit Damage": 5
      }
    },
    "Thornback Graveguard Set": {
      2: { VIT: 10, HP: 120, "Phys Resist": 4 },
      3: { VIT: 18, STR: 10, HP: 220, "Phys Resist": 7, "Status Resist": 4 }
    },
    "Tempest Caller Set": {
      2: { INT: 2 },
      3: { INT: 5, "Magic Damage": 4, "Magic Resist": 3 }
    },
    "Thornback Bulwark": {
      2: { VIT: 3, "Status Resist": 5 },
      3: { VIT: 7, "Status Resist": 5, HP: 126, "Phys Resist": 5 }
    },
    Tidecaster: {
      2: { INT: 1, "Magic Damage": 4 },
      3: { INT: 3, "Magic Damage": 4, "Magic Resist": 3 },
      4: { STA: 1, INT: 5, "Magic Damage": 4, "Magic Resist": 3 },
      5: { STA: 1, INT: 8, "Magic Damage": 8, "Magic Resist": 3 }
    },
    Tideguard: {
      2: { VIT: 1, "Phys Resist": 3 },
      3: { VIT: 3, "Phys Resist": 3, HP: 35, "Magic Resist": 3 },
      4: { STA: 1, VIT: 5, "Phys Resist": 3, HP: 84, "Magic Resist": 3 },
      5: { STA: 1, VIT: 8, "Phys Resist": 8, HP: 84, "Magic Resist": 3, "Status Resist": 4 }
    },
    "Tidemother Set": {
      2: { DEX: 2, INT: 2 },
      3: { STA: 1, DEX: 2, INT: 5, "Crit Damage": 5 }
    },
    Venomcaster: {
      2: { INT: 4, "Magic Damage": 5 }
    },
    "Verdant Rite": {
      2: { INT: 8, VIT: 6, "HEAL": 7 },
      3: { INT: 19, VIT: 6, "HEAL": 7, "Magic Resist": 7 },
      4: { STA: 1, INT: 19, VIT: 17, "HEAL": 16, "Magic Resist": 7 },
      5: { STA: 1, INT: 30, VIT: 28, "HEAL": 16, "Magic Resist": 7, HP: 266 }
    }
  },

  /**
   * Random mood per spawned enemy. attackBonus/attackMult/hpMult/damageTakenMult adjust combat values.
   */
  enemyMoods: [
    {
      id: "berserk",
      name: "Berserk",
      attackBonus: 3,
      attackMult: 1.12,
      hpMult: 1.05,
      damageTakenMult: 1.08,
      description: "Hits harder; slightly easier to wound."
    },
    {
      id: "cautious",
      name: "Cautious",
      attackBonus: -1,
      attackMult: 0.92,
      damageTakenMult: 0.88,
      description: "Softer attacks; harder to hurt."
    },
    {
      id: "steady",
      name: "Steady",
      attackBonus: 0,
      attackMult: 1,
      damageTakenMult: 0.92,
      description: "Takes slightly less damage from your hits."
    },
    {
      id: "grim",
      name: "Grim",
      attackBonus: 2,
      attackMult: 1.06,
      hpMult: 1.08,
      description: "More endurance and bite."
    },
    {
      id: "weary",
      name: "Weary",
      attackBonus: -2,
      attackMult: 0.88,
      hpMult: 0.92,
      description: "Below average stats."
    },
    {
      id: "focused",
      name: "Focused",
      attackBonus: 1,
      attackMult: 1.1,
      damageTakenMult: 1.05,
      description: "Sharper offense; slightly more vulnerable."
    }
  ],

  /**
   * World map (Excel World_map.xlsx → world_map_data.js). Biome index matches cell color legend (rows 104+).
   * Layout and presentation are baselined as complete in v2.4 (see `version` above).
   * Export uses the grid from column B; row 2+ maps to y=0,… — height is capped so the last playable y is 99 (rows below in Excel are margin, ignored).
   * Each passable biome lists possibleEnemies; overworld encounter slots roll fixed group sizes (see game.js): easy 1–3, medium 3–6, hard 5–8 units (combat caps at 8v8). Dungeons use dungeon room definitions only.
   * Optional `partyAllies` on the mob passed to combat: array of `{ name?, maxHp?, hp?, agi?, armor? }` companions (hero always slot 0; max 8 party members total).
   * Per-slot picks use each enemy's `spawnRarity` with `enemySpawnRarityWeights` (weighted tier, then uniform within tier).
   * Optional mobDifficulty: { easy, medium, hard } anchor levels — encounter slots 0/1/2 use easy/medium/hard;
   * the mob's total level (sum of all unit levels) is rolled in ±25% of that anchor (integer bounds).
   * Omit mobDifficulty on overworld: same slot group sizes (1–3 / 3–6 / 5–8) with per-unit levels from each enemy's possibleLevels (legacy-style).
   * encounterSlotsPerTile: separate encounter buttons per map cell (cooldown each).
   * coordinateBackgrounds: optional image per map cell for the Adventure screen (path relative to index.html).
   * Optional per-biome map/minimap art in the same folder as adventure art: texture.png is stretched once over
   * each contiguous region of that biome (not repeated per cell). border_texture.png is still loaded for future
   * edge treatments; soft blending between biomes uses legend/sampled colors. If texture.png is missing, colors apply.
   * Keys must be "x,y" using the same coordinates as the world grid / player.worldMap.
   *
   * coordinateCells: optional layout per coordinate. If omitted, the cell uses the default (enemy encounters from the biome).
   *   kind "encounters" — mob slots (uses biome possibleEnemies); optional encounterSlots overrides the global slot count (0 = none).
   *   kind "scene" — no mob slots; instead show NPCs, doors, pickups, notes (see elements).
   * Elements: npc | note (modal text), door (teleport to target x,y on the same map), pickup | usable (grant itemName once if once !== false),
   * Optional on npc: `image` (path relative to index.html) — shows a clickable image like boats/portals; omit for a text button.
   * portal (waygate — opens modal to travel to other portals; list shows each portal’s `label` as the location name; shared art from worldMap.portalImage).
   * Optional editable: true — when Edit Mode is on in the sidebar, the object can be dragged, resized, or removed; layout is saved in player.worldMap.sceneLayout.
   * Per-coordinate overrides from the editor are stored in player.worldMap.sceneEdits (same shape as a scene cell); when present, they replace config for that coordinate.
   */
  worldMap: {
    /**
     * Increment when you change biome `possibleEnemies`, mob difficulty, or mob rolling rules. Saved mob previews
     * in localStorage are cleared on load when this value differs from the last applied one
     * (see player.worldMap.mobPreviewGeneration).
     */
    mobPreviewVersion: 9,
    /** Cooldown after clearing a mob before it respawns on this map (ms). */
    mobRespawnMs: 60000,
    /**
     * Dynamic encounter pressure per monster type (enemy name), centered on `mobRespawnMs`.
     * Spawn rate multiplier = `1 + spawnRateImpactPct * pressure/100` (pressure clamped to -100..100).
     * Rarity-weighted spawn rolls and cooldown time both use this per-monster multiplier.
     */
    spawnPressure: {
      windowMs: 10 * 60 * 1000,
      windowStrength: 12,
      recoveryFactor: 0.08,
      spawnRateImpactPct: 0.2
    },
    /** How often encounter panels pick new random positions on the adventure map (ms). Min 3000. */
    mobPanelWanderMs: 60000,
    /** Duration of each wander move (ms). Transitions apply only after the map has finished its first layout (no jump on load). */
    mobPanelWanderTransitionMs: 1400,
    /** Min distance from adventure playfield edge to mob panel centers, as percent of width/height (0–100). */
    mobPanelLayoutMarginPct: 14,
    /** Min distance between mob panel centers, as percent of the smaller map dimension (reduced automatically if many slots). */
    mobPanelMinCenterDistPct: 22,
    defaultStart: { x: 29, y: 55 },
    /** Shared art for all waygates (path relative to index.html). Missing or failed loads use the built-in SVG portal at runtime. */
    portalImage: "Assets/portals/my-portal.png",
    /** Optional shared art for boats in scene cells (path relative to index.html). */
    boatImage: "Assets/portals/paradise_boat.png",
    encounterSlotsPerTile: 3,
    /**
     * Optional per-coordinate override (path relative to index.html). If unset, the game uses
     * Assets/Biomes/{exact biome name from biomes[]}/{1|2|3|4}.{png|jpg|jpeg|webp} — variant is stable per coordinate.
     */
    coordinateBackgrounds: {
      "29,55": "Assets/Biomes/Paradise South/boat_between_paradises.png",
      "37,43": "Assets/Biomes/Paradise North/boat_paradise_north.png",
      "22,66": "Assets/Biomes/Skin of Gaia/Rootwarren/rootwaren_entrance.png",
      "35,33": "Assets/Biomes/The misery of life/The Withered Maw/the_withered_maw_entrance.png",
      "32,70": "Assets/Biomes/The held breath/The Stonevein Sanctum/stonevein_entrance.png",
      "23,30": "Assets/Biomes/Innocence of North/The Frostroot Nursery/the_frostroot_nursery_entrance.png"
    },
    /** Filled at runtime from {@link cityPortals} plus any manual entries you add here. */
    coordinateCells: {
      "29,55": {
        kind: "scene",
        title: "Paradise South",
        description: "A small harbor with a boat ready to travel north.",
        elements: [
          {
            type: "boat",
            id: "boat_paradise_south",
            label: "Boat",
            editable: true,
            leftPct: 23.125,
            topPct: 33.218,
            scalePct: 148,
            destinations: [{ label: "Paradise North", x: 37, y: 43 }]
          }
        ]
      },
      "37,43": {
        kind: "scene",
        title: "Paradise North",
        description: "A quiet northern dock with return passage available.",
        elements: [
          {
            type: "boat",
            id: "boat_paradise_north",
            label: "Boat",
            editable: true,
            leftPct: 23.57080035180299,
            topPct: 24.3919119833482,
            scalePct: 125,
            destinations: [{ label: "Paradise South", x: 29, y: 55 }]
          }
        ]
      },
      "37,55": {
        kind: "scene",
        title: "Paradise South — Shore dig",
        description: "Salt wind and a half-buried frame where Hollis has been working.",
        elements: [
          {
            type: "npc",
            id: "hollis_dredge",
            label: "Hollis Dredge",
            editable: true,
            leftPct: 71.42045281150125,
            topPct: 34.93195290478304,
            scalePct: 56,
            image: "Assets/Biomes/Paradise South/Sunken Grotto/hollis_dredge.png",
            text: "Hollis leans on his shovel.",
            dungeonEntrance: "sunken_grotto"
          }
        ]
      },
      "22,66": {
        kind: "scene",
        title: "Skin of Gaia — Rootwarren entrance",
        description: "A gnarled root-choked shaft hums with something hungry below.",
        elements: [
          {
            type: "npc",
            id: "merrit_rootsniffer",
            label: "Merrit Rootsniffer",
            editable: true,
            leftPct: 46.69576059850374,
            topPct: 72.66087059380175,
            scalePct: 90,
            image: "Assets/Biomes/Skin of Gaia/Rootwarren/merrit_rootsniffer.png",
            text: "Merrit watches the sealed roots.",
            dungeonEntrance: "rootwarren"
          }
        ]
      },
      "35,33": {
        kind: "scene",
        title: "The misery of life — Withered Maw entrance",
        description: "A heat-warped sinkhole exhales dry breath. The sand below looks hungry.",
        elements: [
          {
            type: "npc",
            id: "old_varro",
            label: "Old Varro",
            editable: true,
            leftPct: 53.34821428571429,
            topPct: 66.79382540809084,
            scalePct: 100,
            image: "Assets/Biomes/The misery of life/The Withered Maw/old_varro.png",
            text: "Old Varro leans on his crooked stick.",
            dungeonEntrance: "withered_maw"
          }
        ]
      },
      "32,70": {
        kind: "scene",
        title: "The held breath — Stonevein Sanctum",
        description: "A fault-lined descent exhales cold dust. Brannock guards the sealed stone arch.",
        elements: [
          {
            type: "npc",
            id: "brannock_stonewhisper",
            label: "Brannock Stonewhisper",
            editable: true,
            leftPct: 34.70982142857143,
            topPct: 65.2797492311332,
            scalePct: 80,
            image: "Assets/Biomes/The held breath/The Stonevein Sanctum/brannock_stonewhisper.png",
            text: "Brannock listens to the stone breathe.",
            dungeonEntrance: "stonevein_sanctum"
          }
        ]
      },
      "23,30": {
        kind: "scene",
        title: "Innocence of North — Frostroot Nursery",
        description: "Frozen roots arch over a snow-soft path. Elowen keeps watch with a blue lantern.",
        elements: [
          {
            type: "npc",
            id: "elowen_snowbud",
            label: "Elowen Snowbud",
            editable: true,
            leftPct: 51.50669642857143,
            topPct: 61.49455878873906,
            scalePct: 64,
            image: "Assets/Biomes/Innocence of North/The Frostroot Nursery/elowen_snowbud.png",
            text: "Elowen listens to the nursery's lullaby.",
            dungeonEntrance: "frostroot_nursery"
          }
        ]
      },
      "28,43": {
        kind: "scene",
        title: "Paradise North — Stormbreak Hollow",
        description: "A broken cliff mouth hums with pressure, its stone ribs lit by trapped stormwater.",
        elements: [
          {
            type: "npc",
            id: "nera_stormwatch",
            label: "Nera Stormwatch",
            editable: true,
            leftPct: 76.69305189094108,
            topPct: 29.149568837347605,
            scalePct: 72,
            image: "Assets/Biomes/Paradise North/Stormbreak Hollow/nera_stormwatch.png",
            text: "Hold there. That arch doesn't open for curiosity.",
            dungeonEntrance: "stormbreak_hollow"
          }
        ]
      }
    },
    /**
     * Instanced dungeons: `rooms[]` use `bg` stem under `assetBase` (same extensions as biome art).
     * Optional `bgPhaseStems`: string stems `[preFight, phase1, phase2, phase3]` under `assetBase` — adventure uses index 0
     * before combat; during Stormwake Leviathan fights index 1–3 track HP (>70%, ≤70% & >30%, ≤30%). `bg` remains fallback.
     * Each `enemies` entry is a mob-preview unit: `name` (enemy def), optional `level`, `moodId`, `portraitImage` override.
     * Optional `modifierText` is appended to the combat log at fight start. Each room shows the mob on the adventure
     * screen; the player clicks it to start combat (no auto-start). Empty `enemies` rooms get a Continue control.
     */
    dungeons: {
      sunken_grotto: {
        name: "Sunken Grotto",
        keyItem: "Sunken Grotto Key",
        entrance: { x: 37, y: 55 },
        assetBase: "Assets/Biomes/Paradise South/Sunken Grotto",
        rooms: [
          {
            bg: "1",
            enemies: [
              { name: "Tide Hopper", level: 5, moodId: "berserk" },
              { name: "Tide Hopper", level: 5, moodId: "berserk" },
              { name: "Tide Hopper", level: 5, moodId: "berserk" },
              { name: "Driftling", level: 7, moodId: "berserk" },
              { name: "Driftling", level: 7, moodId: "berserk" },
              { name: "Hermit Crab", level: 6, moodId: "berserk" }
            ]
          },
          {
            bg: "2",
            enemies: [
              { name: "Hermit Crab", level: 7, moodId: "berserk" },
              { name: "Hermit Crab", level: 7, moodId: "berserk" },
              { name: "Driftling", level: 8, moodId: "berserk" },
              { name: "Driftling", level: 8, moodId: "berserk" },
              { name: "Tide Hopper", level: 6, moodId: "berserk" },
              { name: "Tide Hopper", level: 6, moodId: "berserk" }
            ]
          },
          {
            bg: "3",
            modifierText: "Brine veil — the grotto strikes harder: foes deal +10% damage this fight.",
            enemyDamageMult: 1.1,
            enemies: [
              { name: "Tidebound Crusher", level: 14, moodId: "berserk" },
              { name: "Tide Hopper", level: 6, moodId: "berserk" },
              { name: "Tide Hopper", level: 6, moodId: "berserk" },
              { name: "Driftling", level: 8, moodId: "berserk" },
              { name: "Driftling", level: 8, moodId: "berserk" },
              { name: "Hermit Crab", level: 7, moodId: "berserk" },
              { name: "Hermit Crab", level: 7, moodId: "berserk" }
            ]
          },
          {
            bg: "4",
            enemies: [
              { name: "Tidemeld Revenant", level: 9, moodId: "berserk" },
              { name: "Tidemeld Revenant", level: 9, moodId: "berserk" },
              { name: "Driftling", level: 8, moodId: "berserk" },
              { name: "Driftling", level: 8, moodId: "berserk" },
              { name: "Tide Hopper", level: 6, moodId: "berserk" },
              { name: "Tide Hopper", level: 6, moodId: "berserk" },
              { name: "Hermit Crab", level: 7, moodId: "berserk" }
            ]
          },
          {
            bg: "5",
            enemies: [
              { name: "Drowned Channeler", level: 13, moodId: "berserk" },
              { name: "Hermit Crab", level: 7, moodId: "berserk" },
              { name: "Hermit Crab", level: 7, moodId: "berserk" },
              { name: "Tide Hopper", level: 6, moodId: "berserk" },
              { name: "Tide Hopper", level: 6, moodId: "berserk" },
              { name: "Driftling", level: 8, moodId: "berserk" },
              { name: "Driftling", level: 8, moodId: "berserk" },
              { name: "Tidemeld Revenant", level: 9, moodId: "berserk" }
            ]
          },
          {
            bg: "6",
            enemies: [
              { name: "Tidemother Aberration", level: 15, moodId: "berserk", isBoss: true },
              { name: "Drowned Channeler", level: 13, moodId: "berserk" },
              { name: "Tidebound Crusher", level: 14, moodId: "berserk" },
              { name: "Tide Hopper", level: 6, moodId: "berserk" },
              { name: "Driftling", level: 8, moodId: "berserk" },
              { name: "Hermit Crab", level: 7, moodId: "berserk" },
              { name: "Tidemeld Revenant", level: 9, moodId: "berserk" },
              { name: "Tidemeld Revenant", level: 9, moodId: "berserk" }
            ]
          }
        ]
      },
      stormbreak_hollow: {
        name: "Stormbreak Hollow",
        keyItem: "Stormbreak Hollow Key",
        entrance: { x: 28, y: 43 },
        assetBase: "Assets/Biomes/Paradise North/Stormbreak Hollow",
        stormPressure: true,
        rooms: [
          {
            bg: "1",
            modifierText: "Storm Pressure gathers in the hollow: every 2 turns, random party members become Storm Marked.",
            enemies: [
              { name: "Saltwind Skimmer", level: 5, moodId: "berserk" },
              { name: "Saltwind Skimmer", level: 5, moodId: "berserk" },
              { name: "Saltwind Skimmer", level: 5, moodId: "berserk" },
              { name: "Brinegullet Spitter", level: 7, moodId: "berserk" },
              { name: "Brinegullet Spitter", level: 7, moodId: "berserk" },
              { name: "Wavebreaker Idol", level: 9, moodId: "berserk" }
            ]
          },
          {
            bg: "2",
            enemies: [
              { name: "Cliff Lurker", level: 11, moodId: "berserk" },
              { name: "Cliff Lurker", level: 11, moodId: "berserk" },
              { name: "Saltwind Skimmer", level: 6, moodId: "berserk" },
              { name: "Saltwind Skimmer", level: 6, moodId: "berserk" },
              { name: "Tideharrow", level: 13, moodId: "berserk" },
              { name: "Brinegullet Spitter", level: 8, moodId: "berserk" }
            ]
          },
          {
            bg: "3",
            enemies: [
              { name: "Stormfang Ravager", level: 14, moodId: "berserk" },
              { name: "Saltwind Skimmer", level: 6, moodId: "berserk" },
              { name: "Saltwind Skimmer", level: 6, moodId: "berserk" },
              { name: "Cliff Lurker", level: 11, moodId: "berserk" },
              { name: "Cliff Lurker", level: 11, moodId: "berserk" },
              { name: "Brinegullet Spitter", level: 8, moodId: "berserk" },
              { name: "Brinegullet Spitter", level: 8, moodId: "berserk" }
            ]
          },
          {
            bg: "4",
            enemies: [
              { name: "Tideharrow", level: 13, moodId: "berserk" },
              { name: "Tideharrow", level: 13, moodId: "berserk" },
              { name: "Brinegullet Spitter", level: 8, moodId: "berserk" },
              { name: "Brinegullet Spitter", level: 8, moodId: "berserk" },
              { name: "Wavebreaker Idol", level: 10, moodId: "berserk" },
              { name: "Wavebreaker Idol", level: 10, moodId: "berserk" },
              { name: "Saltwind Skimmer", level: 6, moodId: "berserk" }
            ]
          },
          {
            bg: "5",
            enemies: [
              { name: "Abyssal Tempest Caller", level: 13, moodId: "berserk" },
              { name: "Tideharrow", level: 13, moodId: "berserk" },
              { name: "Tideharrow", level: 13, moodId: "berserk" },
              { name: "Wavebreaker Idol", level: 10, moodId: "berserk" },
              { name: "Wavebreaker Idol", level: 10, moodId: "berserk" },
              { name: "Brinegullet Spitter", level: 8, moodId: "berserk" },
              { name: "Brinegullet Spitter", level: 8, moodId: "berserk" },
              { name: "Cliff Lurker", level: 11, moodId: "berserk" }
            ]
          },
          {
            bg: "6",
            bgPhaseStems: ["5_0", "5_1", "5_2", "5_3"],
            enemies: [
              { name: "The Stormwake Leviathan", level: 15, moodId: "berserk", isBoss: true }
            ]
          }
        ]
      },
      rootwarren: {
        name: "The Rootwarren",
        keyItem: "Rootwarren Key",
        entrance: { x: 22, y: 66 },
        assetBase: "Assets/Biomes/Skin of Gaia/Rootwarren",
        rootPressure: true,
        rooms: [
          {
            bg: "1",
            enemies: [
              { name: "Burrow Hare", level: 15, moodId: "cautious" },
              { name: "Burrow Hare", level: 15, moodId: "cautious" },
              { name: "Plains Raptor", level: 17, moodId: "focused" },
              { name: "Plains Raptor", level: 17, moodId: "focused" },
              { name: "Grass Snake", level: 19, moodId: "focused" },
              { name: "Tusk Boar", level: 20, moodId: "steady" }
            ]
          },
          {
            bg: "2",
            enemies: [
              { name: "Burrow Hare", level: 15, moodId: "cautious" },
              { name: "Burrow Hare", level: 15, moodId: "cautious" },
              { name: "Grass Snake", level: 19, moodId: "focused" },
              { name: "Grass Snake", level: 19, moodId: "focused" },
              { name: "Plains Raptor", level: 17, moodId: "focused" },
              { name: "Plains Raptor", level: 17, moodId: "focused" },
              { name: "Tusk Boar", level: 20, moodId: "steady" }
            ]
          },
          {
            bg: "3",
            modifierText: "Root Pressure: every 3 rounds, a random hero may be Crippled.",
            enemies: [
              { name: "Plains Raptor", level: 17, moodId: "focused" },
              { name: "Plains Raptor", level: 17, moodId: "focused" },
              { name: "Plains Raptor", level: 17, moodId: "focused" },
              { name: "Field Wolf", level: 21, moodId: "berserk" },
              { name: "Burrow Hare", level: 15, moodId: "cautious" },
              { name: "Grass Snake", level: 19, moodId: "focused" },
              { name: "Tusk Boar", level: 20, moodId: "steady" }
            ]
          },
          {
            bg: "4",
            modifierText: "Root Pressure continues in this chamber.",
            enemies: [
              { name: "Tusk Boar", level: 20, moodId: "steady" },
              { name: "Tusk Boar", level: 20, moodId: "steady" },
              { name: "Grass Snake", level: 19, moodId: "focused" },
              { name: "Grass Snake", level: 19, moodId: "focused" },
              { name: "Burrow Hare", level: 15, moodId: "cautious" },
              { name: "Plains Raptor", level: 17, moodId: "focused" },
              { name: "Field Wolf", level: 21, moodId: "berserk" },
              {
                name: "Bramblehorn Matriarch",
                level: 20,
                moodId: "steady",
                portraitImage: "Assets/Biomes/Skin of Gaia/Rootwarren/bramblehorn_matriarch.png"
              }
            ]
          },
          {
            bg: "5",
            modifierText: "Root Pressure continues in this chamber.",
            enemies: [
              { name: "Field Wolf", level: 21, moodId: "berserk" },
              { name: "Field Wolf", level: 21, moodId: "berserk" },
              { name: "Plains Raptor", level: 17, moodId: "focused" },
              { name: "Plains Raptor", level: 17, moodId: "focused" },
              { name: "Grass Snake", level: 19, moodId: "focused" },
              { name: "Tusk Boar", level: 20, moodId: "steady" },
              { name: "Burrow Hare", level: 15, moodId: "cautious" },
              {
                name: "Fangroot Alpha",
                level: 21,
                moodId: "berserk",
                portraitImage: "Assets/Biomes/Skin of Gaia/Rootwarren/fangroot_alpha.png"
              }
            ]
          },
          {
            bg: "6",
            modifierText: "Root Pressure continues. The Behemoth calls reinforcements on long fights.",
            enemies: [
              { name: "Burrow Hare", level: 15, moodId: "cautious" },
              { name: "Plains Raptor", level: 17, moodId: "focused" },
              { name: "Plains Raptor", level: 17, moodId: "focused" },
              { name: "Grass Snake", level: 19, moodId: "focused" },
              { name: "Tusk Boar", level: 20, moodId: "steady" },
              { name: "Field Wolf", level: 21, moodId: "berserk" },
              {
                name: "Fangroot Alpha",
                level: 21,
                moodId: "berserk",
                portraitImage: "Assets/Biomes/Skin of Gaia/Rootwarren/fangroot_alpha.png"
              },
              {
                name: "Gaiahide Behemoth",
                level: 22,
                moodId: "berserk",
                isBoss: true,
                portraitImage: "Assets/Biomes/Skin of Gaia/Rootwarren/gaiahide_behemoth.png"
              }
            ]
          }
        ]
      },
      withered_maw: {
        name: "The Withered Maw",
        keyItem: "Withered Maw Key",
        entrance: { x: 35, y: 33 },
        assetBase: "Assets/Biomes/The misery of life/The Withered Maw",
        thirstingSand: true,
        starvationPressure: true,
        rooms: [
          {
            bg: "1",
            enemies: [
              { name: "Dust Carver", level: 14, moodId: "berserk" },
              { name: "Dust Carver", level: 14, moodId: "berserk" },
              { name: "Witherling", level: 15, moodId: "berserk" },
              { name: "Witherling", level: 15, moodId: "berserk" },
              { name: "Desert Thornback Crawler", level: 17, moodId: "berserk" },
              { name: "Mirage Lurker", level: 18, moodId: "berserk" }
            ]
          },
          {
            bg: "2",
            enemies: [
              { name: "Desert Thornback Crawler", level: 17, moodId: "berserk" },
              { name: "Desert Thornback Crawler", level: 17, moodId: "berserk" },
              { name: "Dust Carver", level: 14, moodId: "berserk" },
              { name: "Dust Carver", level: 14, moodId: "berserk" },
              { name: "Witherling", level: 15, moodId: "berserk" },
              { name: "Mirage Lurker", level: 18, moodId: "berserk" },
              { name: "Dune Devourer", level: 19, moodId: "berserk" }
            ]
          },
          {
            bg: "3",
            modifierText: "Thirsting Sand: every 3 rounds, a random fighter may be Blinded.",
            enemies: [
              { name: "Mirage Lurker", level: 18, moodId: "berserk" },
              { name: "Mirage Lurker", level: 18, moodId: "berserk" },
              { name: "Dust Carver", level: 14, moodId: "berserk" },
              { name: "Dust Carver", level: 14, moodId: "berserk" },
              { name: "Witherling", level: 15, moodId: "berserk" },
              { name: "Witherling", level: 15, moodId: "berserk" },
              { name: "Desert Thornback Crawler", level: 17, moodId: "berserk" }
            ]
          },
          {
            bg: "4",
            modifierText: "Thirsting Sand and Starvation Pressure threaten this chamber.",
            enemies: [
              { name: "Desert Thornback Crawler", level: 17, moodId: "berserk" },
              { name: "Desert Thornback Crawler", level: 17, moodId: "berserk" },
              { name: "Witherling", level: 15, moodId: "berserk" },
              { name: "Witherling", level: 15, moodId: "berserk" },
              { name: "Dust Carver", level: 14, moodId: "berserk" },
              { name: "Mirage Lurker", level: 18, moodId: "berserk" },
              { name: "Dune Devourer", level: 19, moodId: "berserk" },
              {
                name: "Thornback Graveguard",
                level: 20,
                moodId: "steady",
                portraitImage: "Assets/Biomes/The misery of life/The Withered Maw/thornback_graveguard.png"
              }
            ]
          },
          {
            bg: "5",
            modifierText: "Thirsting Sand and Starvation Pressure continue here.",
            enemies: [
              { name: "Dune Devourer", level: 19, moodId: "berserk" },
              { name: "Dune Devourer", level: 19, moodId: "berserk" },
              { name: "Mirage Lurker", level: 18, moodId: "berserk" },
              { name: "Mirage Lurker", level: 18, moodId: "berserk" },
              { name: "Witherling", level: 15, moodId: "berserk" },
              { name: "Dust Carver", level: 14, moodId: "berserk" },
              { name: "Desert Thornback Crawler", level: 17, moodId: "berserk" },
              {
                name: "Mirage Maw",
                level: 21,
                moodId: "berserk",
                portraitImage: "Assets/Biomes/The misery of life/The Withered Maw/mirage_maw.png"
              }
            ]
          },
          {
            bg: "6",
            modifierText:
              "Thirsting Sand and Starvation Pressure continue. The Dune Mourner calls Mirage Remnants on long fights.",
            enemies: [
              { name: "Dust Carver", level: 14, moodId: "berserk" },
              { name: "Witherling", level: 15, moodId: "berserk" },
              { name: "Witherling", level: 15, moodId: "berserk" },
              { name: "Mirage Lurker", level: 18, moodId: "berserk" },
              { name: "Desert Thornback Crawler", level: 17, moodId: "berserk" },
              { name: "Dune Devourer", level: 19, moodId: "berserk" },
              {
                name: "Mirage Maw",
                level: 21,
                moodId: "berserk",
                portraitImage: "Assets/Biomes/The misery of life/The Withered Maw/mirage_maw.png"
              },
              {
                name: "The Dune Mourner",
                level: 22,
                moodId: "berserk",
                isBoss: true,
                portraitImage: "Assets/Biomes/The misery of life/The Withered Maw/the_dune_mourner.png"
              }
            ]
          }
        ]
      },
      stonevein_sanctum: {
        name: "The Stonevein Sanctum",
        keyItem: "Stonevein Key",
        entrance: { x: 32, y: 70 },
        assetBase: "Assets/Biomes/The held breath/The Stonevein Sanctum",
        pressureCracks: true,
        fallingStone: true,
        rooms: [
          {
            bg: "1",
            enemies: [
              { name: "Stone Marmot", level: 22, moodId: "berserk" },
              { name: "Stone Marmot", level: 22, moodId: "berserk" },
              { name: "Rock Lynx", level: 23, moodId: "berserk" },
              { name: "Rock Lynx", level: 23, moodId: "berserk" },
              { name: "Rock Ibex", level: 24, moodId: "berserk" },
              { name: "Rock Serpent", level: 25, moodId: "berserk" }
            ]
          },
          {
            bg: "2",
            enemies: [
              { name: "Stone Marmot", level: 22, moodId: "berserk" },
              { name: "Stone Marmot", level: 22, moodId: "berserk" },
              { name: "Rock Lynx", level: 23, moodId: "berserk" },
              { name: "Rock Lynx", level: 23, moodId: "berserk" },
              { name: "Rock Ibex", level: 24, moodId: "berserk" },
              { name: "Rock Ibex", level: 24, moodId: "berserk" },
              { name: "Rock Serpent", level: 25, moodId: "berserk" }
            ]
          },
          {
            bg: "3",
            modifierText: "Pressure Cracks: every 3 rounds, cracked stone may Cripple a random fighter.",
            enemies: [
              { name: "Rock Ibex", level: 26, moodId: "berserk" },
              { name: "Rock Ibex", level: 26, moodId: "berserk" },
              { name: "Rock Serpent", level: 27, moodId: "berserk" },
              { name: "Rock Serpent", level: 27, moodId: "berserk" },
              { name: "Stone Marmot", level: 22, moodId: "berserk" },
              { name: "Rock Lynx", level: 23, moodId: "berserk" },
              { name: "Rock Lizard", level: 28, moodId: "berserk" }
            ]
          },
          {
            bg: "4",
            modifierText: "Pressure Cracks and Falling Stone threaten this chamber.",
            enemies: [
              { name: "Rock Serpent", level: 27, moodId: "berserk" },
              { name: "Rock Serpent", level: 27, moodId: "berserk" },
              { name: "Rock Lizard", level: 28, moodId: "berserk" },
              { name: "Stone Marmot", level: 23, moodId: "berserk" },
              { name: "Stone Marmot", level: 23, moodId: "berserk" },
              { name: "Rock Lynx", level: 24, moodId: "berserk" },
              { name: "Rock Ibex", level: 26, moodId: "berserk" },
              {
                name: "Petrified Coilwarden",
                level: 30,
                moodId: "steady",
                portraitImage: "Assets/Biomes/The held breath/The Stonevein Sanctum/petrified_coilwarden.png"
              }
            ]
          },
          {
            bg: "5",
            modifierText: "Pressure Cracks and Falling Stone continue here.",
            enemies: [
              { name: "Rock Ibex", level: 27, moodId: "berserk" },
              { name: "Rock Ibex", level: 27, moodId: "berserk" },
              { name: "Rock Lynx", level: 25, moodId: "berserk" },
              { name: "Rock Lynx", level: 25, moodId: "berserk" },
              { name: "Rock Serpent", level: 28, moodId: "berserk" },
              { name: "Rock Lizard", level: 29, moodId: "berserk" },
              { name: "Stone Marmot", level: 23, moodId: "berserk" },
              {
                name: "Granitehorn Breaker",
                level: 31,
                moodId: "berserk",
                portraitImage: "Assets/Biomes/The held breath/The Stonevein Sanctum/granitehorn_breaker.png"
              }
            ]
          },
          {
            bg: "6",
            bgPhaseStems: ["6", "6_1", "6_2", "6_3"],
            modifierText:
              "Pressure Cracks and Falling Stone continue. The Held Colossus awakens as the mountain shifts.",
            enemies: [
              { name: "Stone Marmot", level: 24, moodId: "berserk" },
              { name: "Rock Lynx", level: 25, moodId: "berserk" },
              { name: "Rock Ibex", level: 26, moodId: "berserk" },
              { name: "Rock Serpent", level: 27, moodId: "berserk" },
              { name: "Rock Lizard", level: 28, moodId: "berserk" },
              {
                name: "Petrified Coilwarden",
                level: 30,
                moodId: "steady",
                portraitImage: "Assets/Biomes/The held breath/The Stonevein Sanctum/petrified_coilwarden.png"
              },
              {
                name: "Granitehorn Breaker",
                level: 31,
                moodId: "berserk",
                portraitImage: "Assets/Biomes/The held breath/The Stonevein Sanctum/granitehorn_breaker.png"
              },
              {
                name: "The Held Colossus",
                level: 32,
                moodId: "berserk",
                isBoss: true,
                portraitImage: "Assets/Biomes/The held breath/The Stonevein Sanctum/the_held_colossus.png"
              }
            ]
          }
        ]
      },
      frostroot_nursery: {
        name: "The Frostroot Nursery",
        keyItem: "Frostroot Key",
        entrance: { x: 23, y: 30 },
        assetBase: "Assets/Biomes/Innocence of North/The Frostroot Nursery",
        frostrootSnare: true,
        winterStillness: true,
        rooms: [
          {
            bg: "1",
            enemies: [
              { name: "Pinebound Fawn", level: 22, moodId: "berserk" },
              { name: "Pinebound Fawn", level: 22, moodId: "berserk" },
              { name: "Frozen Pinecone", level: 22, moodId: "berserk" },
              { name: "Frozen Pinecone", level: 22, moodId: "berserk" },
              { name: "Ice-Tusked Boar", level: 23, moodId: "berserk" },
              { name: "Barkhide Spriggan", level: 23, moodId: "berserk" }
            ]
          },
          {
            bg: "2",
            enemies: [
              { name: "Pinebound Fawn", level: 23, moodId: "berserk" },
              { name: "Pinebound Fawn", level: 23, moodId: "berserk" },
              { name: "Frozen Pinecone", level: 23, moodId: "berserk" },
              { name: "Frozen Pinecone", level: 23, moodId: "berserk" },
              { name: "Ice-Tusked Boar", level: 24, moodId: "berserk" },
              { name: "Ice-Tusked Boar", level: 24, moodId: "berserk" },
              { name: "Barkhide Spriggan", level: 24, moodId: "berserk" }
            ]
          },
          {
            bg: "3",
            modifierText: "Frostroot Snare: every 3 rounds, frozen roots may Cripple a random fighter.",
            enemies: [
              { name: "Frozen Pinecone", level: 25, moodId: "berserk" },
              { name: "Frozen Pinecone", level: 25, moodId: "berserk" },
              { name: "Barkhide Spriggan", level: 25, moodId: "berserk" },
              { name: "Barkhide Spriggan", level: 25, moodId: "berserk" },
              { name: "Pinebound Fawn", level: 24, moodId: "berserk" },
              { name: "Ice-Tusked Boar", level: 25, moodId: "berserk" },
              { name: "Winter Guardian", level: 27, moodId: "berserk" }
            ]
          },
          {
            bg: "4",
            modifierText: "Frostroot Snare and Winter Stillness thicken the whitebark nursery air.",
            enemies: [
              { name: "Pinebound Fawn", level: 26, moodId: "berserk" },
              { name: "Pinebound Fawn", level: 26, moodId: "berserk" },
              { name: "Barkhide Spriggan", level: 26, moodId: "berserk" },
              { name: "Barkhide Spriggan", level: 26, moodId: "berserk" },
              { name: "Frozen Pinecone", level: 26, moodId: "berserk" },
              { name: "Ice-Tusked Boar", level: 27, moodId: "berserk" },
              { name: "Winter Guardian", level: 28, moodId: "berserk" },
              {
                name: "Whitebark Matron",
                level: 30,
                moodId: "steady",
                portraitImage: "Assets/Biomes/Innocence of North/The Frostroot Nursery/whitebark_matron.png"
              }
            ]
          },
          {
            bg: "5",
            modifierText: "Frostroot Snare and Winter Stillness continue across the ice-tusk crossing.",
            enemies: [
              { name: "Ice-Tusked Boar", level: 28, moodId: "berserk" },
              { name: "Ice-Tusked Boar", level: 28, moodId: "berserk" },
              { name: "Winter Guardian", level: 29, moodId: "berserk" },
              { name: "Winter Guardian", level: 29, moodId: "berserk" },
              { name: "Frozen Pinecone", level: 27, moodId: "berserk" },
              { name: "Barkhide Spriggan", level: 27, moodId: "berserk" },
              { name: "Pinebound Fawn", level: 26, moodId: "berserk" },
              {
                name: "Frosthorn Bulwark",
                level: 31,
                moodId: "berserk",
                portraitImage: "Assets/Biomes/Innocence of North/The Frostroot Nursery/frosthorn_bulwark.png"
              }
            ]
          },
          {
            bg: "6",
            bgPhaseStems: ["6", "6_1", "6_2", "6_3"],
            modifierText:
              "Frostroot Snare and Winter Stillness continue. The Sleeping Child of Winter stirs beneath the frost.",
            enemies: [
              { name: "Pinebound Fawn", level: 27, moodId: "berserk" },
              { name: "Frozen Pinecone", level: 27, moodId: "berserk" },
              { name: "Ice-Tusked Boar", level: 28, moodId: "berserk" },
              { name: "Barkhide Spriggan", level: 28, moodId: "berserk" },
              { name: "Winter Guardian", level: 29, moodId: "berserk" },
              {
                name: "Whitebark Matron",
                level: 30,
                moodId: "steady",
                portraitImage: "Assets/Biomes/Innocence of North/The Frostroot Nursery/whitebark_matron.png"
              },
              {
                name: "Frosthorn Bulwark",
                level: 31,
                moodId: "berserk",
                portraitImage: "Assets/Biomes/Innocence of North/The Frostroot Nursery/frosthorn_bulwark.png"
              },
              {
                name: "The Sleeping Child of Winter",
                level: 32,
                moodId: "steady",
                isBoss: true,
                portraitImage: "Assets/Biomes/Innocence of North/The Frostroot Nursery/the_sleeping_child_of_winter.png"
              }
            ]
          }
        ]
      }
    },
    /**
     * Inter-city waygates: one scene + portal per entry, only on the anchor tile (x,y). Adventure backgrounds
     * use Assets/Biomes/{cityName}/{1|2|3|4} per cell (see getCityAdventureBackgroundVariant). Optional bg is unused.
     * Optional layout: leftPct / topPct (0–100, adventure playfield), scalePct (25–200). Player edit-mode overrides
     * are stored in save `sceneLayout`; use Edit mode → “Export portal layout” to copy waygates, boat, and npc layouts into config.
     */
    cityPortals:[
  {
    "name": "Maidenfrost",
    "x": 17,
    "y": 10,
    "bg": "Assets/Biomes/Maidenfrost/1.png",
    "theme": "portal-theme-frost",
    "label": "Maidenfrost",
    "leftPct": 59.67442306569248,
    "topPct": 94.20303320743713,
    "scalePct": 100
  },
  {
    "name": "Widow’s Ash",
    "x": 42,
    "y": 13,
    "bg": "Assets/Biomes/Widow’s Ash/1.png",
    "theme": "portal-theme-ash",
    "label": "Widow’s Ash",
    "leftPct": 29.800670535065404,
    "topPct": 92.40494071126665,
    "scalePct": 100
  },
  {
    "name": "Iceveil",
    "x": 6,
    "y": 34,
    "bg": "Assets/Biomes/Iceveil/1.png",
    "theme": "portal-theme-ice",
    "label": "Iceveil",
    "leftPct": 86.88230008984726,
    "topPct": 68.48944394885518,
    "scalePct": 100
  },
  {
    "name": "Dolorhame",
    "x": 36,
    "y": 37,
    "bg": "Assets/Biomes/Dolorhame/1.png",
    "theme": "portal-theme-dune",
    "label": "Dolorhame",
    "leftPct": 32.45847784403551,
    "topPct": 85.61216292624863,
    "scalePct": 100
  },
  {
    "name": "Breathless Vale",
    "x": 33,
    "y": 61,
    "bg": "Assets/Biomes/Breathless Vale/1.png",
    "theme": "portal-theme-vale",
    "label": "Breathless Vale",
    "leftPct": 72.00665546810112,
    "topPct": 89.20834029729306,
    "scalePct": 73
  },
  {
    "name": "Greenhollow",
    "x": 5,
    "y": 63,
    "bg": "Assets/Biomes/Greenhollow/1.png",
    "theme": "portal-theme-hollow",
    "label": "Greenhollow",
    "leftPct": 61.48172879139846,
    "topPct": 82.21577022309135,
    "scalePct": 83
  },
  {
    "name": "Blazewound",
    "x": 43,
    "y": 83,
    "bg": "Assets/Biomes/Blazewound/1.png",
    "theme": "portal-theme-blaze",
    "label": "Blazewound",
    "leftPct": 70.8372137633669,
    "topPct": 90.40706354720902,
    "scalePct": 68
  },
  {
    "name": "Windmere",
    "x": 17,
    "y": 85,
    "bg": "Assets/Biomes/Windmere/1.png",
    "theme": "portal-theme-wind",
    "label": "Windmere",
    "leftPct": 12.3654489105326,
    "topPct": 70.02872257085843,
    "scalePct": 76
  }
],
    biomes: [
      {
        name: "World's Belt",
        passable: false,
        color: "#1E6F86",
        enemyScale: 1,
        possibleEnemies: []
      },
      {
        name: "North Titan",
        passable: false,
        color: "#2F6F9E",
        enemyScale: 1,
        possibleEnemies: []
      },
      {
        name: "South Titan",
        passable: false,
        color: "#7A1F14",
        enemyScale: 1,
        possibleEnemies: []
      },
      {
        name: "North Titan's Shield",
        passable: false,
        color: "#C7D8E8",
        enemyScale: 1,
        possibleEnemies: []
      },
      {
        name: "South Titan's Sword",
        passable: false,
        color: "#9E4A4A",
        enemyScale: 1,
        possibleEnemies: []
      },
      {
        name: "The World's End",
        passable: false,
        color: "#14232F",
        enemyScale: 1,
        possibleEnemies: []
      },
      {
        name: "Tears of God",
        passable: false,
        color: "#1C5F78",
        enemyScale: 1,
        possibleEnemies: []
      },
      {
        name: "Paradise South",
        passable: true,
        color: "#E6C48A",
        enemyScale: 1,
        mobDifficulty: { easy: 3, medium: 6, hard: 10 },
        possibleEnemies: ["Tide Hopper", "Hermit Crab", "Driftling", "Tidemeld Revenant", "Coastal Horror"]
      },
      {
        name: "Heart of Gaia",
        passable: true,
        color: "#1F4F1F",
        enemyScale: 1.1,
        mobDifficulty: { easy: 32, medium: 36, hard: 40 },
        possibleEnemies: ["Leafdart Squirrel", "Canopy Screecher", "Greenleaf Fox", "Jungle Stag", "Gorilla"]
      },
      {
        name: "Skin of Gaia",
        passable: true,
        color: "#6DA544",
        enemyScale: 1.1,
        mobDifficulty: { easy: 12, medium: 16, hard: 20 },
        possibleEnemies: ["Burrow Hare", "Plains Raptor", "Grass Snake", "Tusk Boar", "Field Wolf"]
      },
      {
        name: "Hatred of the World",
        passable: true,
        color: "#A63A1F",
        enemyScale: 1.25,
        mobDifficulty: { easy: 42, medium: 46, hard: 50 },
        possibleEnemies: ["Ash Lizard", "Cinder Stalker", "Ember Scuttler", "Magma Boar", "Lava Basilisk"]
      },
      {
        name: "The held breath",
        passable: true,
        color: "#6E6A64",
        enemyScale: 1.15,
        mobDifficulty: { easy: 22, medium: 26, hard: 30 },
        possibleEnemies: ["Stone Marmot", "Rock Lynx", "Rock Ibex", "Rock Serpent", "Rock Lizard"]
      },
      {
        name: "Aftermath of War",
        passable: true,
        color: "#4B4B4F",
        enemyScale: 1.2,
        mobDifficulty: { easy: 32, medium: 36, hard: 40 },
        possibleEnemies: ["Ash Horror", "Cinder Husk", "Ash Skulker", "Remnant of Rust", "Faded War Wraith"]
      },
      {
        name: "The misery of life",
        passable: true,
        color: "#D2A26B",
        enemyScale: 1.1,
        mobDifficulty: { easy: 12, medium: 16, hard: 20 },
        possibleEnemies: ["Dust Carver", "Witherling", "Desert Thornback Crawler", "Mirage Lurker", "Dune Devourer"]
      },
      {
        name: "The apathy of the World",
        passable: true,
        color: "#8FB7D1",
        enemyScale: 1.3,
        mobDifficulty: { easy: 42, medium: 46, hard: 50 },
        possibleEnemies: ["Icy Mink", "Icy Serpent", "Glacier Turtoise", "Frozen Stalker", "Frost Skitter"]
      },
      {
        name: "Innocence of North",
        passable: true,
        color: "#E8EEF2",
        enemyScale: 1,
        mobDifficulty: { easy: 22, medium: 26, hard: 30 },
        possibleEnemies: ["Pinebound Fawn", "Frozen Pinecone", "Ice-Tusked Boar", "Barkhide Spriggan", "Winter Guardian"]
      },
      {
        name: "Paradise North",
        passable: true,
        color: "#E6C48A",
        enemyScale: 1,
        mobDifficulty: { easy: 3, medium: 6, hard: 10 },
        possibleEnemies: ["Saltwind Skimmer", "Brinegullet Spitter", "Wavebreaker Idol", "Cliff Lurker", "Tideharrow"]
      }
    ]
  }
};

