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
  startingLoadout: [
    { name: "Small Potion", count: 999 },
    { name: "Rusty Sword", count: 1 }
  ],

  /**
   * Enemy drops: gold: either a number (fixed) or { min, max } for a random integer in that range per defeated
   * enemy. items: each entry is either a string (item name, 100% drop) or { name, dropRate } with dropRate in 0–100 (% per kill).
   * `drops.xp` is optional metadata only; kill XP uses `victoryXp` (rarity base, level gap, and M/P ratio clamp).
   * Enemy art supports legacy `image`, state images (`images: { idle, walk, attack }`),
   * or sprite strips (`sprites: { idle|walk|attack: { sheet, frames, fps, loop?, cols?, rows? } }`).
   * For atlas layouts (e.g. 10 frames in 2 rows), set `cols` and `rows` (example: cols: 5, rows: 2).
   * Optional `spawnRarity`: "common" | "rare" | "epic" | "myth" | "ancient" — used with `enemySpawnRarityWeights`
   * when rolling mobs from a biome or region pool (see game.js). Omitted defaults to common.
   * Optional `combatScript`: id for scripted enemy turns (skills, cooldowns, AI); see game.js `enemyCombatRunScript`.
   * Optional `combatRole`: "tank" | "assassin" | "bruiser" | "mage" | "support" | "controller" | "summoner" — splits level×statsPerLevel
   * budget (see monsterScaling). If omitted, role is inferred from combatScript.
   * `hp` and `attack` are anchors: max HP ≈ hp×scale + VIT×hpPerVit; attack is the damage base before STR scaling in combat.
   */
  enemies: [
    {
      name: "Burrow Hare",
      combatScript: "burrow_hare",
      combatRole: "controller",
      spawnRarity: "common",
      hp: 40,
      attack: 6,
      image: "Assets/Monsters/burrow_hare.png",
      possibleLevels: [11, 12, 13, 14, 15],
      possibleMoods: ["cautious"],
      drops: {
        gold: { min: 1, max: 10 },
        xp: 25,
        items: [{ name: "Rusty Sword", dropRate: 35 }]
      }
    },
    {
      name: "Plains Raptor",
      combatScript: "plains_raptor",
      combatRole: "bruiser",
      spawnRarity: "common",
      hp: 60,
      attack: 8,
      image: "Assets/Monsters/plains_raptor.png",
      possibleLevels: [13, 14, 15, 16, 17],
      possibleMoods: ["focused"],
      drops: {
        gold: { min: 2, max: 12 },
        xp: 35,
        items: [{ name: "Rusty Sword", dropRate: 35 }]
      }
    },
    {
      name: "Grass Snake",
      combatScript: "grass_snake",
      combatRole: "mage",
      spawnRarity: "rare",
      hp: 40,
      attack: 12,
      image: "Assets/Monsters/grass_snake.png",
      possibleLevels: [15, 16, 17, 18, 19],
      possibleMoods: ["focused"],
      drops: {
        gold: { min: 5, max: 15 },
        xp: 50,
        items: [{ name: "Rusty Sword", dropRate: 35 }]
      }
    },
    {
      name: "Tusk Boar",
      combatScript: "tusk_boar",
      combatRole: "tank",
      spawnRarity: "epic",
      hp: 120,
      attack: 10,
      image: "Assets/Monsters/tusk_boar.png",
      possibleLevels: [17, 18, 19, 20],
      possibleMoods: ["steady"],
      drops: {
        gold: { min: 8, max: 15 },
        xp: 70,
        items: [{ name: "Rusty Sword", dropRate: 35 }]
      }
    },
    {
      name: "Field Wolf",
      combatScript: "field_wolf",
      combatRole: "assassin",
      spawnRarity: "epic",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/field_wolf.png",
      possibleLevels: [19, 20, 21],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Leafdart Squirrel",
      combatScript: "greenleaf_squirrel",
      combatRole: "heart_harasser",
      spawnRarity: "common",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/leafdart_squirrel.png",
      possibleLevels: [31, 32, 33, 34, 35],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Canopy Screecher",
      combatScript: "greenleaf_parrot",
      combatRole: "heart_buffer",
      spawnRarity: "common",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/canopy_screecher.png",
      possibleLevels: [33, 34, 35, 36, 37],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Greenleaf Fox",
      combatScript: "greenleaf_fox",
      combatRole: "assassin",
      spawnRarity: "rare",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/greenleaf_fox.png",
      possibleLevels: [35, 36, 37, 38, 39],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Jungle Stag",
      combatScript: "greenleaf_stag",
      combatRole: "support",
      spawnRarity: "rare",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/jungle_stag.png",
      possibleLevels: [37, 38, 39, 40],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Gorilla",
      combatScript: "gorilla",
      combatRole: "bruiser",
      spawnRarity: "epic",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/greenleaf_gorilla.png",
      possibleLevels: [39, 40, 41, 42],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Stone Marmot",
      combatScript: "stone_marmot",
      combatRole: "tank",
      spawnRarity: "common",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/stone_marmot.png",
      possibleLevels: [21, 22, 23, 24, 25],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Rock Lynx",
      combatScript: "rock_lynx",
      combatRole: "assassin",
      spawnRarity: "common",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/rock_lynx.png",
      possibleLevels: [23, 24, 25, 26, 27],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Rock Ibex",
      combatScript: "rock_ibex",
      combatRole: "bruiser",
      spawnRarity: "rare",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/rock_ibex.png",
      possibleLevels: [25, 26, 27, 28, 29],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Rock Serpent",
      combatScript: "rock_serpent",
      combatRole: "controller",
      spawnRarity: "epic",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/rock_serpent.png",
      possibleLevels: [27, 28, 29, 30],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Rock Lizard",
      combatScript: "rock_lizard",
      combatRole: "tank",
      spawnRarity: "epic",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/rock_lizard.png",
      possibleLevels: [29, 30, 31],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Ash Lizard",
      combatScript: "ash_lizard",
      combatRole: "bruiser",
      spawnRarity: "common",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/ash_lizard.png",
      possibleLevels: [41, 42, 43, 44, 45],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Cinder Stalker",
      combatScript: "cinder_stalker",
      combatRole: "assassin",
      spawnRarity: "common",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/cinder_stalker.png",
      possibleLevels: [43, 44, 45, 46, 47],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Ember Scuttler",
      combatScript: "ember_scuttler",
      combatRole: "controller",
      spawnRarity: "rare",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/ember_scuttler.png",
      possibleLevels: [45, 46, 47, 48, 49],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Magma Boar",
      combatScript: "magma_boar",
      combatRole: "bruiser",
      spawnRarity: "epic",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/magma_boar.png",
      possibleLevels: [47, 48, 49, 50],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Lava Basilisk",
      combatScript: "lava_basilisk",
      combatRole: "controller",
      spawnRarity: "epic",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/lava_basilisk.png",
      possibleLevels: [49, 50, 51, 52, 53],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Icy Mink",
      combatScript: "icy_mink",
      combatRole: "assassin",
      spawnRarity: "common",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/icy_mink.png",
      possibleLevels: [41, 42, 43, 44, 45],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Icy Serpent",
      combatScript: "icy_serpent",
      combatRole: "mage",
      spawnRarity: "common",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/icy_serpent.png",
      possibleLevels: [43, 44, 45, 46, 47],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Glacier Turtoise",
      combatScript: "glacier_turtoise",
      combatRole: "tank",
      spawnRarity: "rare",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/glacier_turtoise.png",
      possibleLevels: [45, 46, 47, 48, 49],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Frozen Stalker",
      combatScript: "frozen_stalker",
      combatRole: "assassin",
      spawnRarity: "epic",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/frozen_stalker.png",
      possibleLevels: [47, 48, 49, 50],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Frost Skitter",
      combatScript: "frost_skitter",
      combatRole: "controller",
      spawnRarity: "myth",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/frost_skitter.png",
      possibleLevels: [49, 50, 51, 52, 53],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },  
    {
      name: "Pinebound Fawn",
      combatScript: "pinebound_fawn",
      combatRole: "support",
      spawnRarity: "common",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/pinebound_fawn.png",
      possibleLevels: [21, 22, 23, 24, 25],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Frozen Pinecone",
      combatScript: "frozen_pinecone",
      combatRole: "controller",
      spawnRarity: "common",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/frozen_pinecone.png",
      possibleLevels: [23, 24, 25, 26, 27],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Ice-Tusked Boar",
      combatScript: "ice_tusked_boar",
      combatRole: "tank",
      spawnRarity: "rare",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/ice_tusked_boar.png",
      possibleLevels: [25, 26, 27, 28, 29],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Barkhide Spriggan",
      combatScript: "barkhide_spriggan",
      combatRole: "support",
      spawnRarity: "epic",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/barkhide_spriggan.png",
      possibleLevels: [27, 28, 29, 30],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Winter Guardian",
      combatScript: "winter_guardian",
      combatRole: "tank",
      spawnRarity: "epic",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/winter_guardian.png",
      possibleLevels: [29, 30, 31],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    }, 
    {
      name: "Dust Carver",
      combatScript: "dust_carver",
      combatRole: "assassin",
      spawnRarity: "common",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/dust_carver.png",
      possibleLevels: [11, 12, 13, 14, 15],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    }, 
    {
      name: "Desert Thornback Crawler",
      combatScript: "desert_thornback_crawler",
      combatRole: "tank",
      spawnRarity: "rare",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/desert_thornback_crawler.png",
      possibleLevels: [15, 16, 17, 18, 19],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Mirage Lurker",
      combatScript: "mirage_lurker",
      combatRole: "controller",
      spawnRarity: "epic",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/mirage_lurker.png",
      possibleLevels: [17, 18, 19, 20],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Dune Devourer",
      combatScript: "dune_devourer",
      combatRole: "bruiser",
      spawnRarity: "epic",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/dune_devourer.png",
      possibleLevels: [19, 20, 21],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Witherling",
      combatScript: "witherling",
      combatRole: "mage",
      spawnRarity: "common",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/witherling.png",
      possibleLevels: [13, 14, 15, 16, 17],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Remnant of Rust",
      combatScript: "remnant_of_rust",
      combatRole: "controller",
      spawnRarity: "epic",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/remnant_of_rust.png",
      possibleLevels: [37, 38, 39, 40],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Faded War Wraith",
      combatScript: "faded_war_wraith",
      combatRole: "summoner",
      spawnRarity: "epic",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/faded_war_wraith.png",
      possibleLevels: [39, 40, 41, 42],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Ash Horror",
      combatScript: "ash_horror",
      combatRole: "mage",
      spawnRarity: "common",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/ash_horror.png",
      possibleLevels: [31, 32, 33, 34, 35],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Cinder Husk",
      combatScript: "cinder_husk",
      combatRole: "tank",
      spawnRarity: "common",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/cinder_husk.png",
      possibleLevels: [33, 34, 35, 36, 37],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Ash Skulker",
      combatScript: "ash_skulker",
      combatRole: "assassin",
      spawnRarity: "rare",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/ash_skulker.png",
      possibleLevels: [35, 36, 37, 38, 39],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Tide Hopper",
      combatScript: "tide_hopper",
      combatRole: "controller",
      spawnRarity: "common",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/tide_hopper.png",
      possibleLevels: [1, 2, 3, 4, 5],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Hermit Crab",
      combatScript: "hermit_crab",
      combatRole: "tank",
      spawnRarity: "common",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/hermit_crab.png",
      possibleLevels: [3, 4, 5, 6, 7],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Driftling",
      combatScript: "driftling",
      combatRole: "support",
      spawnRarity: "rare",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/driftling.png",
      possibleLevels: [5, 6, 7, 8, 9],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Tidemeld Revenant",
      combatScript: "tidemeld_revenant",
      combatRole: "summoner",
      spawnRarity: "epic",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/tidemeld_revenant.png",
      possibleLevels: [7, 8, 9, 10],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Coastal Horror",
      combatScript: "coastal_horror",
      combatRole: "controller",
      spawnRarity: "epic",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/coastal_horror.png",
      possibleLevels: [9, 10, 11],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    }, 
    {
      name: "Saltwind Skimmer",
      combatScript: "saltwind_skimmer",
      combatRole: "assassin",
      spawnRarity: "common",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/saltwind_skimmer.png",
      possibleLevels: [1, 2, 3, 4, 5],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Brinegullet Spitter",
      combatScript: "brinegullet_spitter",
      combatRole: "mage",
      spawnRarity: "common",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/brinegullet_spitter.png",
      possibleLevels: [3, 4, 5, 6, 7],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Wavebreaker Idol",
      combatScript: "wavebreaker_idol",
      combatRole: "tank",
      spawnRarity: "rare",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/wavebreaker_idol.png",
      possibleLevels: [5, 6, 7, 8, 9],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Cliff Lurker",
      combatScript: "cliff_lurker",
      combatRole: "assassin",
      spawnRarity: "epic",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/cliff_lurker.png",
      possibleLevels: [7, 8, 9, 10],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Tideharrow",
      combatScript: "tideharrow",
      combatRole: "controller",
      spawnRarity: "epic",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/tideharrow.png",
      possibleLevels: [9, 10, 11],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Bandit",
      spawnRarity: "common",
      hp: 45,
      attack: 7,
      image: "Assets/Monsters/burrow_hare.png",
      possibleLevels: [1, 2, 3, 4, 5],
      possibleMoods: ["cautious", "focused"],
      drops: { gold: { min: 2, max: 14 }, xp: 30, items: [] }
    },
    {
      name: "Wolf",
      spawnRarity: "rare",
      hp: 55,
      attack: 9,
      image: "Assets/Monsters/field_wolf.png",
      possibleLevels: [3, 4, 5, 6, 7],
      possibleMoods: ["berserk", "focused"],
      drops: { gold: { min: 3, max: 18 }, xp: 45, items: [{ name: "Wolf Pelt", dropRate: 40 }] }
    },
    {
      name: "Drone",
      spawnRarity: "epic",
      hp: 80,
      attack: 12,
      image: "Assets/Monsters/plains_raptor.png",
      possibleLevels: [8, 10, 12, 14, 16],
      possibleMoods: ["focused", "steady"],
      drops: { gold: { min: 8, max: 28 }, xp: 70, items: [{ name: "Energy Cell", dropRate: 35 }] }
    }
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
   * Character leveling: XP per level rises with level² so early levels stay fast and later ones slower.
   * `xpToNextLevel(L) = xpToNextConst + (L² * xpToNextLevelSquare)` is the XP needed to go from level L to L+1 (default 150 + L²×4).
   * At `maxLevel`, further XP is banked but does not increase level.
   */
  leveling: {
    maxLevel: 50,
    xpToNextConst: 150,
    xpToNextLevelSquare: 4
  },

  /**
   * Kill XP per defeated foe (gold/items still use each enemy’s `drops`).
   * Let M = monster level, P = player level, `baseXP = baseXpByRarity[spawnRarity]`.
   * `xp = floor(baseXP * clamp(minXpMult, maxXpMult, 1 + (M - P) * levelDiffPerPlayerLevel))`.
   * Optional: set `minLevelDiffMultiplier` / `maxLevelDiffMultiplier` to clamp only the `(1 + …)` factor.
   */
  victoryXp: {
    /** `xp = floor(baseXP * clamp(minXpMult, maxXpMult, 1 + (M - P) * levelDiffPerPlayerLevel)))` — level ratio factor removed. */
    levelDiffPerPlayerLevel: 0.025,
    minXpMult: 0.75,
    maxXpMult: 1.6,
    levelRatioMin: 0.5,
    levelRatioMax: 1.5,
    minLevelDiffMultiplier: null,
    maxLevelDiffMultiplier: null,
    baseXpByRarity: {
      common: 25,
      rare: 50,
      epic: 100,
      myth: 180,
      ancient: 240
    }
  },

  /**
   * Monster total stat budget ≈ level × statsPerLevel (split by role). Optional per-enemy `combatRole` overrides script inference.
   * Damage / DoT / crit / evade formulas for enemies are applied in game.js using these coefficients.
   */
  monsterScaling: {
    statsPerLevel: 4.5,
    hpPerVit: 8,
    damageStrCoeff: 0.015,
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

  /** Weights sum to 1. Keys: tank | assassin | bruiser | mage | support | controller | summoner (+ optional custom role keys) */
  enemyRoles: {
    tank: { STR: 0.25, DEX: 0.15, VIT: 0.4, INT: 0.2 },
    assassin: { STR: 0.3, DEX: 0.4, VIT: 0.1, INT: 0.2 },
    bruiser: { STR: 0.4, DEX: 0.2, VIT: 0.3, INT: 0.1 },
    mage: { STR: 0.15, DEX: 0.25, VIT: 0.2, INT: 0.4 },
    support: { STR: 0.1, DEX: 0.2, VIT: 0.3, INT: 0.4 },
    controller: { STR: 0.1, DEX: 0.3, VIT: 0.15, INT: 0.45 },
    summoner: { STR: 0.15, DEX: 0.2, VIT: 0.25, INT: 0.4 },
    heart_harasser: { STR: 0.1, DEX: 0.4, VIT: 0.2, INT: 0.3 },
    heart_buffer: { STR: 0.12, DEX: 0.3, VIT: 0.18, INT: 0.4 }
  },

  items: {
    "Rusty Sword": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "one_handed",
      attack: 3,
      image: "Assets/Equips/template_weapon.png",
      description: "A notched blade. Better than fists in a brawl.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Iron Sword": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "one_handed",
      attack: 6,
      image: "Assets/Equips/iron-sword.svg",
      description: "Well-balanced steel. Favored by city guards.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Fantastic Sword": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "one_handed",
      attack: 12,
      image: "Assets/Equips/fantastic_sword.png",
      description: "A brilliant blade with an otherworldly edge.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Fantastic Polearm": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "two_handed",
      attack: 13,
      image: "Assets/Equips/fantastic_polearm.png",
      description: "A long-hafted weapon with uncanny reach and balance.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Fantastic Warhammer": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "two_handed",
      attack: 14,
      image: "Assets/Equips/fantastic_warhammer.png",
      description: "A massive warhammer that lands crushing, thunderous blows.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Fantastic Dagger": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "one_handed",
      attack: 10,
      image: "Assets/Equips/fantastic_dagger.png",
      description: "A swift dagger with a keen edge made for quick strikes.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Fantastic Greatsword": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "two_handed",
      attack: 15,
      image: "Assets/Equips/fantastic_greatsword.png",
      description: "A towering greatsword that cleaves through armor and bone.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Leather Armor": {
      type: "armor",
      slot: "chest",
      defense: 2,
      image: "Assets/Equips/leather-armor.svg",
      description: "Flexible leather plates. Light and quiet.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Fantasy Chest": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      defense: 5,
      image: "Assets/Equips/template_chest.png",
      description: "Arcane-forged chestplate from a fantasy set.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Iron Helm": {
      type: "armor",
      slot: "head",
      defense: 1,
      image: "Assets/Equips/iron-helm.svg",
      description: "Protects the skull from glancing blows.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Fantastic Helm": {
      type: "armor",
      slot: "head",
      defense: 4,
      image: "Assets/Equips/template_helm.png",
      description: "A splendid helm infused with mythic protection.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Wooden Shield": {
      type: "armor",
      slot: "offhand",
      equipCategory: "shield",
      defense: 3,
      image: "Assets/Equips/wooden-shield.svg",
      description: "Reinforced wood. Soaks impact before it reaches you.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Leather Gloves": {
      type: "armor",
      slot: "gloves",
      defense: 1,
      image: "Assets/Equips/leather-gloves.svg",
      description: "Grip and a little padding for parries.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Leather Boots": {
      type: "armor",
      slot: "feet",
      defense: 1,
      image: "Assets/Equips/leather-boots.svg",
      description: "Sturdy soles for rough ground.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Fantasy Feet": {
      type: "armor",
      slot: "feet",
      equipCategory: "feet_armor",
      defense: 4,
      image: "Assets/Equips/template_feet.png",
      description: "Enchanted boots tuned for swift footwork.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Iron Greaves": {
      type: "armor",
      slot: "legs",
      defense: 2,
      image: "Assets/Equips/iron-greaves.svg",
      description: "Metal guards for shins and knees.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Fantasy Leggs": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      defense: 5,
      image: "Assets/Equips/template_leggs.png",
      description: "Runed leg armor from the fantasy set.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Bronze Amulet": {
      type: "armor",
      slot: "amulet",
      defense: 1,
      image: "Assets/Equips/bronze-amulet.svg",
      description: "A simple charm on a chain. Slight warding.",
      bonusSkills: [],
      bonusStats: { VIT: 1 }
    },
    "Band Ring": {
      type: "armor",
      slot: "ring1",
      defense: 1,
      image: "Assets/Equips/band-ring.svg",
      description: "A plain band. Rumored to bring minor luck.",
      bonusSkills: [],
      bonusStats: { STR: 1 }
    },
    "Emerald Ring": {
      type: "armor",
      slot: "ring2",
      defense: 1,
      image: "Assets/Equips/emerald-ring.svg",
      description: "Tiny emerald in a silver setting.",
      bonusSkills: ["Quick Reflexes"],
      bonusStats: { DEX: 1 }
    },
    "Wolf Pelt": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "Thick fur. Merchants pay for winter cloaks.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Energy Cell": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Compact power unit. Salvaged tech.",
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
    }
  },

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
    vitHpPerPoint: 12,
    /** Incoming damage split before resists (physical fraction 0–1). */
    incomingPhysicalWeight: 0.55,
    staggerNextAttackMult: 0.85
  },

  /** Short blurbs for overview tooltips; combat math lives in game.js */
  statHelp: {
    level:
      "Your overall tier. Each level grants 5 characteristic points, +2 base attack, and refills HP. XP required per level grows with the curve in config (leveling).",
    hp: "Hit points: when this reaches 0 in combat, you are defeated. Max HP grows with level and Vitality.",
    xp: "Experience toward the next level. The bar shows progress vs the XP required for your current level (see leveling formula in config).",
    charPoints:
      "Earned each time you level (5 per level). Spend 1 point on Strength, Dexterity, Vitality, or Intelligence (max 50 each).",
    str: "Strength (total): physical damage %, armor penetration %, physical resist %, and stagger on Heavy-tagged skills.",
    dex: "Dexterity (total): crit chance, crit damage bonus, evasion, accuracy vs misses, and combo stamina refunds after skills.",
    vit: "Vitality (total): max HP from a flat per-VIT formula, flat damage reduction, status resist, DoT reduction, and heal bonus.",
    int: "Intelligence (total): magic/skill power %, magic resist %, status potency, stamina cost reduction on skills, debuff duration vs foes.",
    armor: "Armor from gear: flat reduction on incoming hits (combined with Vitality and resistances).",
    damage:
      "Approximate physical attack damage after Strength bonus (no crit); skills use the same weapon core with per-skill multipliers, then stat curves resolve in combat."
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

  /** Placeholder for future crafting/gathering paths */
  professions: {
    intro:
      "Professions (blacksmith, alchemist, hunter, etc.) are not unlocked yet. They will grant crafting recipes and passive bonuses in a future update."
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
   * Each passable biome lists possibleEnemies; mobs roll up to 8 units from that pool (see game.js); combat caps at 8v8 (party + foes).
   * Optional `partyAllies` on the mob passed to combat: array of `{ name?, maxHp?, hp?, agi?, armor? }` companions (hero always slot 0; max 8 party members total).
   * Per-slot picks use each enemy's `spawnRarity` with `enemySpawnRarityWeights` (weighted tier, then uniform within tier).
   * Optional mobDifficulty: { easy, medium, hard } anchor levels — encounter slots 0/1/2 use easy/medium/hard;
   * the mob's total level (sum of all unit levels) is rolled in ±25% of that anchor (integer bounds).
   * Omit mobDifficulty to use legacy per-unit level rolling.
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
    mobPreviewVersion: 8,
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
    defaultStart: { x: 25, y: 59 },
    /** Shared art for all waygates (path relative to index.html). Missing or failed loads use the built-in SVG portal at runtime. */
    portalImage: "Assets/portals/my-portal.png",
    encounterSlotsPerTile: 3,
    /**
     * Optional per-coordinate override (path relative to index.html). If unset, the game uses
     * Assets/Biomes/{exact biome name from biomes[]}/{1|2|3|4}.{png|jpg|jpeg|webp} — variant is stable per coordinate.
     */
    coordinateBackgrounds: {},
    /** Filled at runtime from {@link cityPortals} plus any manual entries you add here. */
    coordinateCells: {},
    /**
     * Inter-city waygates: one scene + portal per entry, only on the anchor tile (x,y). Adventure backgrounds
     * use Assets/Biomes/{cityName}/{1|2|3|4} per cell (see getCityAdventureBackgroundVariant). Optional bg is unused.
     * Optional layout: leftPct / topPct (0–100, adventure playfield), scalePct (25–200). Player edit-mode overrides
     * are stored in save `sceneLayout`; use Edit mode → “Export portal layout” to copy resolved values into config.
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
