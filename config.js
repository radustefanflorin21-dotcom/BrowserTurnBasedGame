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
    "Skimmer Blade": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "dagger",
      rarity: "common",
      itemLevel: 5,
      attack: 4,
      image: "Assets/Equips/skimmer_blade.png",
      description: "Saltwind Skimmer dagger.",
      bonusSkills: [],
      bonusStats: { DEX: 5, STR: 3, Crit: 6 }
    },
    "Lynx Fang": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "dagger",
      rarity: "common",
      itemLevel: 27,
      attack: 14,
      image: "Assets/Equips/template_dagger.png",
      description: "Rock Lynx dagger.",
      bonusSkills: [],
      bonusStats: { DEX: 17, STR: 9, Crit: 10 }
    },
    "Hornbreaker Axe": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "two_handed",
      rarity: "common",
      itemLevel: 29,
      attack: 15,
      image: "Assets/Equips/template_polearm.png",
      description: "Rock Ibex two-handed axe.",
      bonusSkills: [],
      bonusStats: { STR: 18, VIT: 10, "Phys Damage": 10 }
    },
    "Petrify Ring": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 30,
      defense: 5,
      image: "Assets/Equips/template_ring.png",
      description: "Rock Serpent set ring.",
      bonusSkills: [],
      bonusStats: { INT: 19, VIT: 10, Duration: 10 }
    },
    "Foxfang Blade": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "one_handed_sword",
      rarity: "common",
      itemLevel: 38,
      attack: 20,
      image: "Assets/Equips/template_weapon.png",
      description: "Greenleaf Fox set sword.",
      bonusSkills: [],
      bonusStats: { DEX: 24, STR: 13, Crit: 10 }
    },
    "Wraithcall Scepter": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "staff",
      rarity: "common",
      itemLevel: 40,
      attack: 22,
      image: "Assets/Equips/template_polearm.png",
      description: "Faded War Wraith set scepter.",
      bonusSkills: [],
      bonusStats: { INT: 26, DEX: 15, "Skill Power": 12 }
    },
    "Ashmaw Cleaver": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "greatsword",
      rarity: "common",
      itemLevel: 45,
      attack: 23,
      image: "Assets/Equips/template_greatsword.png",
      description: "Ash Lizard greatsword.",
      bonusSkills: [],
      bonusStats: { STR: 28, INT: 16, "Phys Damage": 12 }
    },
    "Emberfang": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "dagger",
      rarity: "common",
      itemLevel: 47,
      attack: 24,
      image: "Assets/Equips/template_dagger.png",
      description: "Cinder Stalker dagger.",
      bonusSkills: [],
      bonusStats: { DEX: 29, STR: 16, Crit: 12 }
    },
    "Magmahide Plate": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 50,
      defense: 10,
      image: "Assets/Equips/template_chest.png",
      description: "Magma Boar set chest.",
      bonusSkills: [],
      bonusStats: { VIT: 31, STR: 17 }
    },
    "Basilisk Eye Amulet": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 52,
      defense: 8,
      image: "Assets/Equips/template_amulet.png",
      description: "Lava Basilisk set amulet.",
      bonusSkills: [],
      bonusStats: { INT: 34, VIT: 18, "Status Potency": 12 }
    },
    "Glacier Shell": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 49,
      defense: 10,
      image: "Assets/Equips/template_chest.png",
      description: "Glacier Tortoise set chest.",
      bonusSkills: [],
      bonusStats: { VIT: 30, STR: 17 }
    },
    "Frozen Edge": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "one_handed_sword",
      rarity: "legendary",
      itemLevel: 50,
      attack: 22,
      image: "Assets/Equips/template_weapon.png",
      description: "A frost-touched blade that leaves rime on the air.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Wet Membrane": {
      type: "resource",
      image: "Assets/Resources/wet_membrane.png",
      description: "Slick tissue from a tide creature. Used in water-themed crafts.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Minor Essence": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "A faint magical condensate.",
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
    "Salt Core": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Crystallized brine with a faint glow.",
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
    "Fluid Core": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "A viscous magical core from brine creatures.",
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
    "Water Rune": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "A carved rune attuned to tides.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Bound Essence": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "Spirit-tethered essence from a revenant.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Soul Fragment": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "A shard of unstable soul-stuff.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Abyss Fragment": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "Dark matter from the deep tide.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Tide Core": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "A pulsing core of abyssal current.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Soft Fur": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "Fine fur from a burrowing beast.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Earth Essence": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Loam-rich essence for earth crafts.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Razor Claw": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "A sharpened claw fragment.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Dust Core": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Packed desert grit with latent heat.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Venom Sac": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "Still-toxic tissue from a serpent.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Toxic Extract": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Refined poison for alchemy.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Raptor Talon": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "A curved talon from a plains hunter.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Bone Fragment": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "Splintered bone suitable for glue or charms.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Thick Hide": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "Boar hide strips. Armor lining material.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Tusk Fragment": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "A chipped boar tusk shard.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Wolf Fang": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "A long canine from a field wolf.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Blood Essence": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Crimson essence distilled from a fresh kill.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Spiked Shell": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "Barbed shell plates from a thornback.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Sand Core": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Glassy sand fused into a solid core.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Devourer Jaw": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "Heavy jawbone with serrated teeth.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Earth Core": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Stable geomantic core material.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Mirage Dust": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Shimmering dust that never settles.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Illusion Fragment": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "A brittle shard of false light.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Decay Core": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "Rotting magical nucleus from a witherling.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Spirit Dust": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Fine powder left when spirits fray.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Hardened Stone": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "Stone marmot hoard quality rock.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Core Fragment": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "A cracked elemental core shard.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Sharp Fang": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "A predator fang in good condition.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Predator Core": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Dense essence of the hunt.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Ibex Horn": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "A spiraled horn segment.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Stone Essence": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Powdered mountain attunement.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Petrify Scale": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "Serpent scale touched by earth magic.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Earth Rune": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "A rune tablet of binding stone.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Thick Scale": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "Heavy lizard scales.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Rock Core": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Geode-like core from bedrock beasts.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Dart Spine": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "Needle spines from a dart squirrel.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Nature Essence": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Green-tinted essence of the canopy.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Fox Fang": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "A polished fang from a greenleaf fox.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Forest Essence": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Sap-rich forest distillate.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Thick Bone": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "Dense gorilla bone matter.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Rage Core": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Hot, unstable core of fury.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Rust Core": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Oxidized metal fused with old magic.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Metal Fragment": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "Salvaged alloy scraps.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Ash Core": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Cinder-heavy core from ash lands.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Flame Fragment": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Glassy shard still warm to the touch.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Burning Fang": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "A charred fang imbued with ember heat.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Fire Essence": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Volatile essence of open flame.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Ember Core": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Slow-burning magical ember.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Heat Crystal": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "A crystal that radiates dry warmth.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Magma Core": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Molten heart-stuff, cooled just enough to carry.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Lava Fragment": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "Obsidian flecks from lava fields.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Basilisk Eye Fragment": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "A chipped lens-like scale from a basilisk.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Molten Core": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Ultra-dense heat reservoir.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Frozen Core": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Permafrost magic packed tight.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Ice Plate": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "Layered ice as hard as steel.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Ice Fang": {
      type: "resource",
      image: "Assets/Resources/wolf-pelt.svg",
      description: "Serrated ice tooth from a stalker.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Frost Essence": {
      type: "resource",
      image: "Assets/Resources/energy-cell.svg",
      description: "Cold blue mist trapped in crystal.",
      bonusSkills: [],
      bonusStats: {}
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
  ,
  
    "Burrowstep Boots": {
      type: "armor",
      slot: "feet",
      equipCategory: "feet_armor",
      rarity: "common",
      itemLevel: 15,
      defense: 4,
      image: "Assets/Equips/burrowstep_boots.png",
      description: "Fast repositioning boots for early skirmishers.",
      set: "",
      build: "DEX_VIT",
      bonusSkills: [],
      bonusStats: { DEX: 9, VIT: 5, Evasion: 6 }
    },
    "Boarhide Leggings": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "common",
      itemLevel: 19,
      defense: 4,
      image: "Assets/Equips/boarhide_leggins.png",
      description: "Boarbreaker set leg protection.",
      set: "Boarbreaker",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 11, STR: 6, DR: 2 }
    },
    "Devourer Axe": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "warhammer",
      rarity: "common",
      itemLevel: 18,
      attack: 11,
      image: "Assets/Equips/template_polearm.png",
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
      attack: 10,
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
      defense: 3,
      image: "Assets/Equips/template_ring.png",
      description: "A mirage-tuned ring for precision hybrids.",
      set: "",
      build: "DEX_INT",
      bonusSkills: [],
      bonusStats: { DEX: 8, INT: 6, Accuracy: 6 }
    },
    "Stonehide Armor": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 28,
      defense: 7,
      image: "Assets/Equips/template_chest.png",
      description: "Stoneguard chest built for sustained tanking.",
      set: "Stoneguard",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 17, STR: 9, DR: 5 }
    },
    "Marmot Helm": {
      type: "armor",
      slot: "head",
      equipCategory: "helmet",
      rarity: "common",
      itemLevel: 25,
      defense: 5,
      image: "Assets/Equips/template_helm.png",
      description: "Dense helm for steady frontliners.",
      set: "",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 15, STR: 7 }
    },
    "Earthbind Amulet": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 30,
      defense: 5,
      image: "Assets/Equips/template_amulet.png",
      description: "Earthbinder amulet for control builds.",
      set: "Earthbinder",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { INT: 18, VIT: 10, "Debuff Duration": 8 }
    },
    "Earthpulse Amulet": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 29,
      defense: 5,
      image: "Assets/Equips/template_amulet.png",
      description: "Arcane earth pulse focus for casters.",
      set: "",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 17, VIT: 9, "Skill Power": 8 }
    },
    "Skitter Ring": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 27,
      defense: 4,
      image: "Assets/Equips/template_ring.png",
      description: "Predator ring built for combo loops.",
      set: "Predator",
      build: "DEX",
      bonusSkills: [],
      bonusStats: { DEX: 16, STR: 8, Combo: 8 }
    },
    "Swiftbrush Boots": {
      type: "armor",
      slot: "feet",
      equipCategory: "feet_armor",
      rarity: "common",
      itemLevel: 37,
      defense: 7,
      image: "Assets/Equips/template_feet.png",
      description: "Greenleaf set boots for evasive play.",
      set: "Greenleaf",
      build: "DEX",
      bonusSkills: [],
      bonusStats: { DEX: 22, VIT: 12, Evasion: 10 }
    },
    "Greenleaf Vest": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 36,
      defense: 7,
      image: "Assets/Equips/template_chest.png",
      description: "Greenleaf set vest for durable skirmishers.",
      set: "Greenleaf",
      build: "DEX_VIT",
      bonusSkills: [],
      bonusStats: { DEX: 20, VIT: 13, "Healing Received": 8 }
    },
    "Gorilla Hide Armor": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 40,
      defense: 8,
      image: "Assets/Equips/template_chest.png",
      description: "Primal set chest that converts bulk into pressure.",
      set: "Primal",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 26, STR: 14, DR: 8 }
    },
    "Soul Echo Amulet": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 40,
      defense: 7,
      image: "Assets/Equips/template_amulet.png",
      description: "Wraith set amulet for long-form control battles.",
      set: "Wraith",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 24, DEX: 12, "Debuff Duration": 10 }
    },
    "Molten Gaze Ring": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 50,
      defense: 8,
      image: "Assets/Equips/template_ring.png",
      description: "High-tier ring for status-heavy casters.",
      set: "",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 30, VIT: 15, "Status Potency": 12 }
    },
    "Ember Core Ring": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 47,
      defense: 8,
      image: "Assets/Equips/template_ring.png",
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
      defense: 8,
      image: "Assets/Equips/template_feet.png",
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
      defense: 8,
      image: "Assets/Equips/template_leggs.png",
      description: "Molten set greaves for heavy damage builds.",
      set: "Molten",
      build: "STR_VIT",
      bonusSkills: [],
      bonusStats: { STR: 30, VIT: 16, "Phys Damage": 10 }
    },
    "Basilisk Eye Amulet": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 52,
      defense: 8,
      image: "Assets/Equips/template_amulet.png",
      description: "Basilisk set amulet for elite status control.",
      set: "Basilisk",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 32, VIT: 16, "Status Potency": 12 }
    },
/* BEGIN SYNCED MMO ITEMS */
    "Skimmer Blade": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "dagger",
      rarity: "common",
      itemLevel: 5,
      attack: 4,
      image: "Assets/Equips/skimmer_blade.png",
      description: "A light coastal dagger made for quick openings and precise cuts.",
      set: "Skimmer",
      build: "DEX",
      bonusSkills: [],
      bonusStats: { DEX: 5, STR: 3, Crit: 4, Accuracy: 3 }
    },
    "Tidecall Amulet": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 6,
      defense: 2,
      image: "Assets/Equips/tidecall_amulet.png",
      description: "A tidebound focus that bends wave pressure into utility spell control.",
      set: "Tidecaster",
      build: "INT_DEX",
      bonusSkills: [],
      bonusStats: { INT: 5, DEX: 3, "Skill Power": 4, "Debuff Duration": 3 }
    },
    "Shellsplitter": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "one_handed_sword",
      rarity: "common",
      itemLevel: 7,
      attack: 5,
      image: "Assets/Equips/Shellsplitter.png",
      description: "A short sword edged with shell shards for brutal close strikes.",
      set: "Tideguard",
      build: "STR",
      bonusSkills: [],
      bonusStats: { STR: 6, VIT: 3, "Phys Damage": 4, "Armor Pen": 3 }
    },
    "Ripple Staff": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "staff",
      rarity: "common",
      itemLevel: 9,
      attack: 6,
      image: "Assets/Equips/ripple_staff.png",
      description: "A tide-carved staff that amplifies flowing magic and control effects.",
      set: "Tidecaster",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 7, DEX: 4, "Skill Power": 4, "Status Potency": 3 }
    },
    "Scaleguard Shirt": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 7,
      defense: 2,
      image: "Assets/Equips/scaleguard_shirt.png",
      description: "Layered crab shell armor built to absorb early-game punishment.",
      set: "Tideguard",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 6, STR: 3, DR: 1, HP: 70 }
    },
    "Tide Horror Vest": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 8,
      defense: 2,
      image: "Assets/Equips/tide_horror_vest.png",
      description: "A lighter tidal cuirass offering balanced defense and magical poise.",
      set: "Tideguard",
      build: "VIT_INT",
      bonusSkills: [],
      bonusStats: { VIT: 6, INT: 7, DR: 1, "Magic Resist": 4, HP: 64 }
    },
    "Wet Boots": {
      type: "armor",
      slot: "feet",
      equipCategory: "feet_armor",
      rarity: "common",
      itemLevel: 6,
      defense: 2,
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
      defense: 2,
      image: "Assets/Equips/coastal_hat.png",
      description: "A crested helm made from coastal shell and bone.",
      set: "Tideguard",
      build: "VIT_STR",
      bonusSkills: [],
      bonusStats: { VIT: 6, STR: 7, DR: 2, "Physical Resist": 4, HP: 64 }
    },
    "Driftcloak Vest": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 7,
      defense: 2,
      image: "Assets/Equips/driftcloak_vest.png",
      description: "A fluid-light vest that shifts with the tide to keep the wearer elusive and steady.",
      set: "Skimmer",
      build: "DEX_VIT",
      bonusSkills: [],
      bonusStats: { DEX: 4, VIT: 4, HP: 64, Evasion: 4 }
    },
    "Wave Leggings": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "common",
      itemLevel: 9,
      defense: 3,
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
      defense: 2,
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
      defense: 2,
      image: "Assets/Equips/salt_amulet.png",
      description: "A salt-crystal amulet that steadies the wearer in drawn-out fights.",
      set: "Tideguard",
      build: "VIT_INT",
      bonusSkills: [],
      bonusStats: { VIT: 5, INT: 6, DR: 1, "Magic Resist": 4, "Debuff Duration": 3 }
    },
    "Drift Bracelet": {
      type: "armor",
      slot: "bracelet",
      equipCategory: "bracelet",
      rarity: "common",
      itemLevel: 7,
      defense: 2,
      image: "Assets/Equips/drift_bracelet.png",
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
      defense: 3,
      image: "Assets/Equips/ripple_charm.png",
      description: "A charm attuned to ripples in magic and momentum.",
      set: "Tidecaster",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 6, DEX: 3, "Skill Power": 4, "Status Potency": 3, "Debuff Duration": 3, "Crit Damage": 3 }
    },
    "Sand Band": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 8,
      defense: 2,
      image: "Assets/Equips/sand_band.png",
      description: "A sturdy shell band favored by frontline bruisers.",
      set: "Tideguard",
      build: "STR",
      bonusSkills: [],
      bonusStats: { STR: 6, VIT: 3, "Phys Damage": 4, "Armor Pen": 3 }
    },
    "Tide Loop": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 10,
      defense: 3,
      image: "Assets/Equips/tide_loop.png",
      description: "A polished loop carrying the weight and patience of the sea.",
      set: "Tidecaster",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { INT: 7, VIT: 3, "Debuff Duration": 6, "Magic Resist": 4 }
    },
    "Sandfang Blade": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "one_handed_sword",
      rarity: "common",
      itemLevel: 15,
      attack: 9,
      image: "Assets/Equips/template_weapon.png",
      description: "A desert-forged blade built for accurate cuts and fast pressure.",
      set: "Dunestrike",
      build: "DEX",
      bonusSkills: [],
      bonusStats: { DEX: 11, STR: 6, Crit: 6, Accuracy: 4 }
    },
    "Mirage Edge": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "one_handed_sword",
      rarity: "common",
      itemLevel: 16,
      attack: 9,
      image: "Assets/Equips/template_weapon.png",
      description: "A shimmering sword that blurs around its target.",
      set: "Mirage",
      build: "DEX_INT",
      bonusSkills: [],
      bonusStats: { DEX: 11, INT: 11, Combo: 6, "Status Potency": 4 }
    },
    "Boarbreaker Axe": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "warhammer",
      rarity: "common",
      itemLevel: 18,
      attack: 10,
      image: "Assets/Equips/boarbreaker_axe.png",
      description: "A crushing weapon made to break lines and armor.",
      set: "Boarbreaker",
      build: "STR",
      bonusSkills: [],
      bonusStats: { STR: 13, VIT: 7, "Phys Damage": 6, "Armor Pen": 4, "Stamina Reduction": 0 }
    },
    "Venom Channeler": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "staff",
      rarity: "common",
      itemLevel: 19,
      attack: 11,
      image: "Assets/Equips/venom_channeler.png",
      description: "A venom-soaked focus for spike pressure and status play.",
      set: "Venomcaster",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 13, DEX: 8, "Skill Power": 6, "Status Potency": 4 }
    },
    "Thornback Armor": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 20,
      defense: 5,
      image: "Assets/Equips/template_chest.png",
      description: "Heavy desert armor reinforced with spined carapace plates.",
      set: "Thornback Bulwark",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 14, STR: 8, DR: 4, HP: 200 }
    },
    "Boarhide Chest": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 20,
      defense: 5,
      image: "Assets/Equips/boarhide_chest.png",
      description: "A thick-hide chestpiece built for stubborn frontliners.",
      set: "Boarbreaker",
      build: "VIT_STR",
      bonusSkills: [],
      bonusStats: { VIT: 13, STR: 13, DR: 4, "Physical Resist": 8, HP: 160 }
    },
    "Sandstep Boots": {
      type: "armor",
      slot: "feet",
      equipCategory: "feet_armor",
      rarity: "common",
      itemLevel: 15,
      defense: 4,
      image: "Assets/Equips/template_feet.png",
      description: "Low-profile boots favored by dune duelists.",
      set: "Dunestrike",
      build: "DEX",
      bonusSkills: [],
      bonusStats: { DEX: 11, STR: 6, Crit: 6 }
    },
    "Mirage Hood": {
      type: "armor",
      slot: "head",
      equipCategory: "helmet",
      rarity: "common",
      itemLevel: 17,
      defense: 4,
      image: "Assets/Equips/template_helm.png",
      description: "A hood that helps its wearer read distortions and openings.",
      set: "Mirage",
      build: "INT_DEX",
      bonusSkills: [],
      bonusStats: { VIT: 7, DEX: 7, HP: 136 }
    },
    "Boneguard Gloves": {
      type: "armor",
      slot: "bracelet",
      equipCategory: "bracelet",
      rarity: "common",
      itemLevel: 18,
      defense: 4,
      image: "Assets/Equips/template_bracelet.png",
      description: "Dense wristguards lashed with beast bone for impact builds.",
      set: "Boarbreaker",
      build: "STR_VIT",
      bonusSkills: [],
      bonusStats: { STR: 12, VIT: 6, Stagger: 6, "Physical Resist": 4 }
    },
    "Dune Leggings": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "common",
      itemLevel: 19,
      defense: 4,
      image: "Assets/Equips/template_leggs.png",
      description: "Leg armor suited for long pursuits and attrition.",
      set: "Thornback Bulwark",
      build: "VIT_DEX",
      bonusSkills: [],
      bonusStats: { VIT: 8, DEX: 8, HP: 152 }
    },
    "Venom Ring": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 19,
      defense: 4,
      image: "Assets/Equips/venom_ring.png",
      description: "A serpent-themed ring that deepens status potency.",
      set: "Venomcaster",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 12, DEX: 7, "Skill Power": 6, "Status Potency": 4, "Debuff Duration": 4, "Crit Damage": 4 }
    },
    "Sand Amulet": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 16,
      defense: 4,
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
      defense: 4,
      image: "Assets/Equips/template_bracelet.png",
      description: "A wavering bracelet made for deceptive fighters.",
      set: "Mirage",
      build: "DEX_INT",
      bonusSkills: [],
      bonusStats: { DEX: 10, INT: 10, Combo: 6, "Status Potency": 4, "Debuff Duration": 4, "Crit Damage": 4 }
    },
    "Bone Charm": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 18,
      defense: 4,
      image: "Assets/Equips/template_amulet.png",
      description: "A charm carved from desert bone to reinforce brute force.",
      set: "Boarbreaker",
      build: "STR",
      bonusSkills: [],
      bonusStats: { STR: 12, VIT: 6, "Phys Damage": 6, "Armor Pen": 4 }
    },
    "Fang Loop": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 20,
      defense: 5,
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
      defense: 4,
      image: "Assets/Equips/template_ring.png",
      description: "A plain but durable band worn by survivalists of the sands.",
      set: "Thornback Bulwark",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 10, STR: 5, DR: 3, HP: 150 }
    },
    "Lynx Fang": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "dagger",
      rarity: "common",
      itemLevel: 27,
      attack: 14,
      image: "Assets/Equips/template_dagger.png",
      description: "A rock-honed dagger for ambushes and repeat pressure.",
      set: "Lynxstrike",
      build: "DEX",
      bonusSkills: [],
      bonusStats: { DEX: 18, STR: 10, Crit: 8, Accuracy: 6 }
    },
    "Serpent Fang": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "dagger",
      rarity: "common",
      itemLevel: 28,
      attack: 15,
      image: "Assets/Equips/template_dagger.png",
      description: "A venom-lined fang blade built for agile control.",
      set: "Earthbinder",
      build: "DEX_INT",
      bonusSkills: [],
      bonusStats: { DEX: 18, INT: 18, Combo: 8, "Status Potency": 6 }
    },
    "Hornbreaker Axe": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "polearm",
      rarity: "common",
      itemLevel: 29,
      attack: 15,
      image: "Assets/Equips/template_polearm.png",
      description: "An ibex-horn polearm that excels at driving through defenses.",
      set: "Ibex Dominator",
      build: "STR",
      bonusSkills: [],
      bonusStats: { STR: 19, VIT: 11, "Phys Damage": 8, "Armor Pen": 6, "Stamina Reduction": 0 }
    },
    "Earthcaller Staff": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "staff",
      rarity: "common",
      itemLevel: 30,
      attack: 16,
      image: "Assets/Equips/template_polearm.png",
      description: "A heavy staff that channels binding and petrifying force.",
      set: "Earthbinder",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 20, DEX: 12, "Skill Power": 8, "Status Potency": 6 }
    },
    "Marmot Bulwark": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 25,
      defense: 6,
      image: "Assets/Equips/template_chest.png",
      description: "A stone-backed chestpiece designed for long, grinding fights.",
      set: "Stoneguard",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 17, STR: 10, DR: 5, HP: 250 }
    },
    "Earthshell Armor": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 26,
      defense: 6,
      image: "Assets/Equips/template_chest.png",
      description: "A compact earthward armor with defensive magical utility.",
      set: "Stoneguard",
      build: "VIT_INT",
      bonusSkills: [],
      bonusStats: { VIT: 17, INT: 16, DR: 4, "Magic Resist": 8, HP: 208 }
    },
    "Rockstep Boots": {
      type: "armor",
      slot: "feet",
      equipCategory: "feet_armor",
      rarity: "common",
      itemLevel: 27,
      defense: 6,
      image: "Assets/Equips/template_feet.png",
      description: "Grip-heavy boots that improve footing on broken terrain.",
      set: "Lynxstrike",
      build: "DEX_VIT",
      bonusSkills: [],
      bonusStats: { VIT: 10, DEX: 10, HP: 216 }
    },
    "Stone Helm": {
      type: "armor",
      slot: "head",
      equipCategory: "helmet",
      rarity: "common",
      itemLevel: 28,
      defense: 6,
      image: "Assets/Equips/template_helm.png",
      description: "A dense helm that favors tanks and bruisers alike.",
      set: "Stoneguard",
      build: "VIT_STR",
      bonusSkills: [],
      bonusStats: { VIT: 18, STR: 18, DR: 6, "Physical Resist": 8, HP: 224 }
    },
    "Claw Gloves": {
      type: "armor",
      slot: "bracelet",
      equipCategory: "bracelet",
      rarity: "common",
      itemLevel: 26,
      defense: 6,
      image: "Assets/Equips/template_bracelet.png",
      description: "Claw-bound gloves that sharpen aggressive melee patterns.",
      set: "Lynxstrike",
      build: "DEX_STR",
      bonusSkills: [],
      bonusStats: { DEX: 16, STR: 15, Crit: 8, "Phys Damage": 6, "Crit Damage": 6 }
    },
    "Core Leggings": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "common",
      itemLevel: 29,
      defense: 6,
      image: "Assets/Equips/template_leggs.png",
      description: "Reinforced leggings threaded with stable core fragments.",
      set: "Earthbinder",
      build: "VIT_INT",
      bonusSkills: [],
      bonusStats: { VIT: 18, INT: 18, DR: 5, "Magic Resist": 8, HP: 232 }
    },
    "Petrify Ring": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 30,
      defense: 6,
      image: "Assets/Equips/template_ring.png",
      description: "A ring meant for controllers who win with time and pressure.",
      set: "Earthbinder",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { INT: 19, VIT: 11, "Debuff Duration": 8, "Magic Resist": 6 }
    },
    "Core Amulet": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 29,
      defense: 6,
      image: "Assets/Equips/template_amulet.png",
      description: "A stable core pendant for controlled casting.",
      set: "Earthbinder",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 18, DEX: 10, "Skill Power": 8, "Status Potency": 6, "Debuff Duration": 6, "Crit Damage": 6 }
    },
    "Stone Bracelet": {
      type: "armor",
      slot: "bracelet",
      equipCategory: "bracelet",
      rarity: "common",
      itemLevel: 25,
      defense: 6,
      image: "Assets/Equips/template_bracelet.png",
      description: "A rough bracelet that reinforces survival over burst.",
      set: "Stoneguard",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 16, STR: 9, DR: 5, HP: 250 }
    },
    "Fang Charm": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 27,
      defense: 6,
      image: "Assets/Equips/template_amulet.png",
      description: "A predatory charm that rewards accurate strikes.",
      set: "Lynxstrike",
      build: "DEX",
      bonusSkills: [],
      bonusStats: { DEX: 17, STR: 9, Crit: 8, "Crit Damage": 6 }
    },
    "Earth Loop": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 28,
      defense: 6,
      image: "Assets/Equips/template_ring.png",
      description: "A grounded loop that supports bruiser builds.",
      set: "Ibex Dominator",
      build: "STR_VIT",
      bonusSkills: [],
      bonusStats: { STR: 18, VIT: 10, Stagger: 8, "Physical Resist": 6 }
    },
    "Crystal Band": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 30,
      defense: 6,
      image: "Assets/Equips/template_ring.png",
      description: "A polished band used by hybrid earth spellblades.",
      set: "Earthbinder",
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
      attack: 19,
      image: "Assets/Equips/template_weapon.png",
      description: "A refined forest blade built for assassins and duelists.",
      set: "Greenleaf Assassin",
      build: "DEX",
      bonusSkills: [],
      bonusStats: { DEX: 25, STR: 14, Crit: 10, Accuracy: 8 }
    },
    "Stagpiercer": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "one_handed_sword",
      rarity: "common",
      itemLevel: 39,
      attack: 20,
      image: "Assets/Equips/template_weapon.png",
      description: "A ceremonial blade that rewards tempo, buffs, and follow-ups.",
      set: "Verdant Rite",
      build: "DEX_INT",
      bonusSkills: [],
      bonusStats: { DEX: 24, INT: 24, Combo: 10, "Status Potency": 8 }
    },
    "Gorilla Crusher": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "warhammer",
      rarity: "common",
      itemLevel: 40,
      attack: 20,
      image: "Assets/Equips/template_polearm.png",
      description: "A primal crushing weapon meant for overwhelming pressure.",
      set: "Primal Rage",
      build: "STR",
      bonusSkills: [],
      bonusStats: { STR: 26, VIT: 15, "Phys Damage": 10, "Armor Pen": 8, "Stamina Reduction": 0 }
    },
    "Wraithcall Scepter": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "staff",
      rarity: "common",
      itemLevel: 40,
      attack: 20,
      image: "Assets/Equips/template_polearm.png",
      description: "A soulbound scepter for persistent magical attrition.",
      set: "Soulbinder",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 26, DEX: 15, "Skill Power": 10, "Status Potency": 8 }
    },
    "Gorilla Armor": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 40,
      defense: 8,
      image: "Assets/Equips/template_chest.png",
      description: "Heavy jungle armor that turns durability into momentum.",
      set: "Jungle Titan",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 26, STR: 15, DR: 8, HP: 400 }
    },
    "Spirit Bark Armor": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 40,
      defense: 8,
      image: "Assets/Equips/template_chest.png",
      description: "Living bark armor for sturdy support casters.",
      set: "Verdant Rite",
      build: "VIT_INT",
      bonusSkills: [],
      bonusStats: { VIT: 25, INT: 24, DR: 7, "Magic Resist": 10, HP: 320 }
    },
    "Jungle Boots": {
      type: "armor",
      slot: "feet",
      equipCategory: "feet_armor",
      rarity: "common",
      itemLevel: 37,
      defense: 8,
      image: "Assets/Equips/template_feet.png",
      description: "Low-noise boots for fast, sustained hunts.",
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
      defense: 8,
      image: "Assets/Equips/template_helm.png",
      description: "A helm crowned with stag antler to enhance supportive patterns.",
      set: "Verdant Rite",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { INT: 25, VIT: 14, "Debuff Duration": 10, "Magic Resist": 8, HP: 304 }
    },
    "Vine Gloves": {
      type: "armor",
      slot: "bracelet",
      equipCategory: "bracelet",
      rarity: "common",
      itemLevel: 36,
      defense: 7,
      image: "Assets/Equips/template_bracelet.png",
      description: "Flexible bracers for combo-heavy hybrid builds.",
      set: "Greenleaf Assassin",
      build: "DEX_INT",
      bonusSkills: [],
      bonusStats: { DEX: 22, INT: 21, Combo: 10, "Status Potency": 8, "Debuff Duration": 8, "Crit Damage": 8 }
    },
    "Forest Leggings": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "common",
      itemLevel: 39,
      defense: 8,
      image: "Assets/Equips/template_leggs.png",
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
      defense: 8,
      image: "Assets/Equips/template_ring.png",
      description: "A shadowed ring that amplifies sustained magical pressure.",
      set: "Soulbinder",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 25, DEX: 14, "Skill Power": 10, "Status Potency": 8, "Debuff Duration": 8, "Crit Damage": 8 }
    },
    "Spirit Amulet": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 38,
      defense: 8,
      image: "Assets/Equips/template_amulet.png",
      description: "An amulet for longer buffs, longer debuffs, longer fights.",
      set: "Verdant Rite",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { INT: 24, VIT: 13, "Debuff Duration": 10, "Magic Resist": 8 }
    },
    "Jungle Bracelet": {
      type: "armor",
      slot: "bracelet",
      equipCategory: "bracelet",
      rarity: "common",
      itemLevel: 37,
      defense: 8,
      image: "Assets/Equips/template_bracelet.png",
      description: "A dense bracelet used by dominant frontliners.",
      set: "Jungle Titan",
      build: "STR_VIT",
      bonusSkills: [],
      bonusStats: { STR: 23, VIT: 13, Stagger: 10, "Physical Resist": 8 }
    },
    "Fang Charm ALT": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 35,
      defense: 7,
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
      defense: 7,
      image: "Assets/Equips/template_ring.png",
      description: "A loop that rewards support and recovery play.",
      set: "Verdant Rite",
      build: "VIT_INT",
      bonusSkills: [],
      bonusStats: { VIT: 22, INT: 21, DR: 6, "Magic Resist": 10, "Debuff Duration": 8 }
    },
    "Echo Band": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 39,
      defense: 8,
      image: "Assets/Equips/template_ring.png",
      description: "An echo-tuned band favored by control casters.",
      set: "Soulbinder",
      build: "INT_DEX",
      bonusSkills: [],
      bonusStats: { VIT: 14, DEX: 14, "Crit Damage": 8 }
    },
    "Ashmaw Cleaver": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "greatsword",
      rarity: "common",
      itemLevel: 45,
      attack: 22,
      image: "Assets/Equips/template_greatsword.png",
      description: "A fire-scarred greatsword for punishing heavy swings.",
      set: "Ash Titan",
      build: "STR",
      bonusSkills: [],
      bonusStats: { STR: 29, VIT: 17, "Phys Damage": 12, "Armor Pen": 10, "Stamina Reduction": 0 }
    },
    "Emberfang": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "dagger",
      rarity: "common",
      itemLevel: 47,
      attack: 23,
      image: "Assets/Equips/template_dagger.png",
      description: "A blazing assassin dagger built for lethal turn bursts.",
      set: "Ember Assassin",
      build: "DEX",
      bonusSkills: [],
      bonusStats: { DEX: 30, STR: 17, Crit: 12, Accuracy: 10 }
    },
    "Frozen Edge": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "one_handed_sword",
      rarity: "common",
      itemLevel: 50,
      attack: 24,
      image: "Assets/Equips/template_weapon.png",
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
      attack: 25,
      image: "Assets/Equips/template_polearm.png",
      description: "A basilisk relic staff for high-end control and debuffing.",
      set: "Basilisk Oracle",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 33, DEX: 19, "Skill Power": 12, "Status Potency": 10 }
    },
    "Magmahide Plate": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 50,
      defense: 10,
      image: "Assets/Equips/template_chest.png",
      description: "A furnace-like chestpiece for top-tier tanks.",
      set: "Molten Colossus",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 32, STR: 18, DR: 10, HP: 500 }
    },
    "Glacier Shell": {
      type: "armor",
      slot: "chest",
      equipCategory: "chest_armor",
      rarity: "common",
      itemLevel: 49,
      defense: 10,
      image: "Assets/Equips/template_chest.png",
      description: "A glacier-forged shell piece combining defense and calm magic.",
      set: "Frozen Bastion",
      build: "VIT_INT",
      bonusSkills: [],
      bonusStats: { VIT: 30, INT: 29, DR: 9, "Magic Resist": 12, HP: 392 }
    },
    "Flame Boots": {
      type: "armor",
      slot: "feet",
      equipCategory: "feet_armor",
      rarity: "common",
      itemLevel: 46,
      defense: 9,
      image: "Assets/Equips/template_feet.png",
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
      defense: 10,
      image: "Assets/Equips/template_helm.png",
      description: "A cold-forged helm that stabilizes endgame survivability.",
      set: "Frozen Bastion",
      build: "VIT_INT",
      bonusSkills: [],
      bonusStats: { VIT: 30, INT: 29, DR: 9, "Magic Resist": 12, HP: 384 }
    },
    "Molten Gloves": {
      type: "armor",
      slot: "bracelet",
      equipCategory: "bracelet",
      rarity: "common",
      itemLevel: 47,
      defense: 9,
      image: "Assets/Equips/template_bracelet.png",
      description: "Brutal gauntlets for maximum pressure and penetration.",
      set: "Ash Titan",
      build: "STR",
      bonusSkills: [],
      bonusStats: { STR: 29, VIT: 16, "Phys Damage": 12, "Armor Pen": 10 }
    },
    "Frost Leggings": {
      type: "armor",
      slot: "legs",
      equipCategory: "leg_armor",
      rarity: "common",
      itemLevel: 50,
      defense: 10,
      image: "Assets/Equips/template_leggs.png",
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
      defense: 10,
      image: "Assets/Equips/template_amulet.png",
      description: "A high-end amulet for status-heavy controllers.",
      set: "Basilisk Oracle",
      build: "INT",
      bonusSkills: [],
      bonusStats: { INT: 32, DEX: 18, "Skill Power": 12, "Status Potency": 10, "Debuff Duration": 10, "Crit Damage": 10 }
    },
    "Ember Ring": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 47,
      defense: 9,
      image: "Assets/Equips/template_ring.png",
      description: "A ring that sharpens burst timing and critical conversion.",
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
      defense: 10,
      image: "Assets/Equips/template_bracelet.png",
      description: "A bracelet that rewards precise frost setups.",
      set: "Frostfang",
      build: "DEX_INT",
      bonusSkills: [],
      bonusStats: { DEX: 29, INT: 28, Combo: 12, "Status Potency": 10, "Debuff Duration": 10, "Crit Damage": 10 }
    },
    "Soul Loop": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 51,
      defense: 10,
      image: "Assets/Equips/template_ring.png",
      description: "A shadow-touched loop for elite attrition casters.",
      set: "Basilisk Oracle",
      build: "INT_VIT",
      bonusSkills: [],
      bonusStats: { INT: 32, VIT: 18, "Debuff Duration": 12, "Magic Resist": 10 }
    },
    "Inferno Charm": {
      type: "armor",
      slot: "amulet",
      equipCategory: "amulet",
      rarity: "common",
      itemLevel: 46,
      defense: 9,
      image: "Assets/Equips/template_amulet.png",
      description: "A charm for aggressive hybrid damage builds.",
      set: "Ash Titan",
      build: "STR_INT",
      bonusSkills: [],
      bonusStats: { STR: 28, INT: 26, "Phys Damage": 12, "Skill Power": 10, "Debuff Duration": 10 }
    },
    "Ice Band": {
      type: "armor",
      slot: "ring1",
      equipCategory: "ring",
      rarity: "common",
      itemLevel: 48,
      defense: 10,
      image: "Assets/Equips/template_ring.png",
      description: "A disciplined endgame band focused on resistance and endurance.",
      set: "Frozen Bastion",
      build: "VIT",
      bonusSkills: [],
      bonusStats: { VIT: 30, STR: 17, DR: 10, HP: 480 }
    },
  /* END SYNCED MMO ITEMS */

    "Small Bone": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Small Bone used in crafting."
    },

    "Blood Herb": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Blood Herb used in crafting."
    },

    "Stone Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Stone Fragment used in crafting."
    },

    "Claw Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
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
      image: "Assets/Materials/material_placeholder.png",
      description: "Advanced Mechanism used in crafting and loot."
    },
    "Agility Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Agility Core used in crafting and loot."
    },
    "Alpha Pelt": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Alpha Pelt used in crafting and loot."
    },
    "Ancient Bark": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
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
      image: "Assets/Materials/material_placeholder.png",
      description: "Ancient Seed used in crafting and loot."
    },
    "Ancient Soul Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Ancient Soul Core used in crafting and loot."
    },
    "Antler Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Antler Fragment used in crafting and loot."
    },
    "Antler Piece": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Antler Piece used in crafting and loot."
    },
    "Apex Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Apex Core used in crafting and loot."
    },
    "Ash Residue": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Ash Residue used in crafting and loot."
    },
    "Ash Scale": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Ash Scale used in crafting and loot."
    },
    "Assassin Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Assassin Core used in crafting and loot."
    },
    "Bark": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Bark used in crafting and loot."
    },
    "Bark Fiber": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Bark Fiber used in crafting and loot."
    },
    "Bark Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Bark Fragment used in crafting and loot."
    },
    "Basilisk Eye": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Basilisk Eye used in crafting and loot."
    },
    "Boar Tusk": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Boar Tusk used in crafting and loot."
    },
    "Bone Dust": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Bone Dust used in crafting and loot."
    },
    "Bone Shard": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
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
      image: "Assets/Materials/material_placeholder.png",
      description: "Bound Soul used in crafting and loot."
    },
    "Bulwark Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Bulwark Core used in crafting and loot."
    },
    "Burnt Hide": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Burnt Hide used in crafting and loot."
    },
    "Carapace Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Carapace Fragment used in crafting and loot."
    },
    "Charged Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Charged Core used in crafting and loot."
    },
    "Chill Residue": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Chill Residue used in crafting and loot."
    },
    "Cliff Moss": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Cliff Moss used in crafting and loot."
    },
    "Condensed Soul": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Condensed Soul used in crafting and loot."
    },
    "Control Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Control Core used in crafting and loot."
    },
    "Corroded Gear": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
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
      image: "Assets/Materials/material_placeholder.png",
      description: "Crystal Stone used in crafting and loot."
    },
    "Crystalized Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
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
      image: "Assets/Materials/material_placeholder.png",
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
      image: "Assets/Materials/material_placeholder.png",
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
      image: "Assets/Materials/material_placeholder.png",
      description: "Dense Bone used in crafting and loot."
    },
    "Dense Fur": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Dense Fur used in crafting and loot."
    },
    "Dense Stone": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Dense Stone used in crafting and loot."
    },
    "Devourer Tooth": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Devourer Tooth used in crafting and loot."
    },
    "Digging Claw": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Digging Claw used in crafting and loot."
    },
    "Distorted Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Distorted Core used in crafting and loot."
    },
    "Dust Essence": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Dust Essence used in crafting and loot."
    },
    "Earth Residue": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Earth Residue used in crafting and loot."
    },
    "Echo Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
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
      image: "Assets/Materials/material_placeholder.png",
      description: "Elemental Fragment used in crafting and loot."
    },
    "Elite Bone": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Elite Bone used in crafting and loot."
    },
    "Elite Hide": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Elite Hide used in crafting and loot."
    },
    "Ember Dust": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Ember Dust used in crafting and loot."
    },
    "Ember Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Ember Fragment used in crafting and loot."
    },
    "Endurance Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Endurance Core used in crafting and loot."
    },
    "Faint Residue": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Faint Residue used in crafting and loot."
    },
    "Fire Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Fire Core used in crafting and loot."
    },
    "Fire Seed": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Fire Seed used in crafting and loot."
    },
    "Flame Essence": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Flame Essence used in crafting and loot."
    },
    "Flexible Reinforced Leather": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
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
      image: "Assets/Materials/material_placeholder.png",
      description: "Forest Fur used in crafting and loot."
    },
    "Fragmented Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Fragmented Core used in crafting and loot."
    },
    "Frost Claw": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Frost Claw used in crafting and loot."
    },
    "Frost Thread": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Frost Thread used in crafting and loot."
    },
    "Frozen Shell": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Frozen Shell used in crafting and loot."
    },
    "Fur Pelt": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Fur Pelt used in crafting and loot."
    },
    "Growth Seed": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Growth Seed used in crafting and loot."
    },
    "Hardened Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Hardened Core used in crafting and loot."
    },
    "Hardened Leather": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Hardened Leather used in crafting and loot."
    },
    "Heat Shell": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Heat Shell used in crafting and loot."
    },
    "Heavy Bone": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Heavy Bone used in crafting and loot."
    },
    "Heavy Fang": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Heavy Fang used in crafting and loot."
    },
    "Hunger Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Hunger Core used in crafting and loot."
    },
    "Hunter Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Hunter Core used in crafting and loot."
    },
    "Ice Essence": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Ice Essence used in crafting and loot."
    },
    "Ice Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Ice Fragment used in crafting and loot."
    },
    "Illusion Essence": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Illusion Essence used in crafting and loot."
    },
    "Illusion Thread": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Illusion Thread used in crafting and loot."
    },
    "Infused Dust": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Infused Dust used in crafting and loot."
    },
    "Jungle Fiber": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Jungle Fiber used in crafting and loot."
    },
    "Lava Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Lava Core used in crafting and loot."
    },
    "Life Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Life Core used in crafting and loot."
    },
    "Living Bark": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Living Bark used in crafting and loot."
    },
    "Living Fiber": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Living Fiber used in crafting and loot."
    },
    "Magma Hide": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Magma Hide used in crafting and loot."
    },
    "Mechanism Part": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Mechanism Part used in crafting and loot."
    },
    "Metal Essence": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Metal Essence used in crafting and loot."
    },
    "Metal Scrap": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Metal Scrap used in crafting and loot."
    },
    "Molten Scale": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Molten Scale used in crafting and loot."
    },
    "Muscle Fiber": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Muscle Fiber used in crafting and loot."
    },
    "Mythic Hide": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
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
      image: "Assets/Materials/material_placeholder.png",
      description: "Perfect Core used in crafting and loot."
    },
    "Perfected Leather": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Perfected Leather used in crafting and loot."
    },
    "Petrify Gland": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Petrify Gland used in crafting and loot."
    },
    "Plant Fiber": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Plant Fiber used in crafting and loot."
    },
    "Poison Essence": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Poison Essence used in crafting and loot."
    },
    "Precision Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Precision Core used in crafting and loot."
    },
    "Predator Fang": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Predator Fang used in crafting and loot."
    },
    "Predator Instinct Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Predator Instinct Core used in crafting and loot."
    },
    "Pressure Core": {
      type: "material",
      value: 5,
      image: "Assets/Resources/pressure_core.png",
      description: "Pressure Core used in crafting and loot."
    },
    "Primal Essence": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Primal Essence used in crafting and loot."
    },
    "Primal Fur": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Primal Fur used in crafting and loot."
    },
    "Pure Essence": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Pure Essence used in crafting and loot."
    },
    "Raw Hide": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
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
      image: "Assets/Materials/material_placeholder.png",
      description: "Reflex Core used in crafting and loot."
    },
    "Reinforced Bone": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Reinforced Bone used in crafting and loot."
    },
    "Reinforced Hide": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Reinforced Hide used in crafting and loot."
    },
    "Reinforced Scrap": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Reinforced Scrap used in crafting and loot."
    },
    "Reinforced Stone": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
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
    "Root Fiber": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Root Fiber used in crafting and loot."
    },
    "Rough Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Rough Core used in crafting and loot."
    },
    "Rusted Metal": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
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
      image: "Assets/Materials/material_placeholder.png",
      description: "Sand Blade Fragment used in crafting and loot."
    },
    "Sand Residue": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Sand Residue used in crafting and loot."
    },
    "Scaled Skin": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Scaled Skin used in crafting and loot."
    },
    "Seeds": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Seeds used in crafting and loot."
    },
    "Shadow Dust": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Shadow Dust used in crafting and loot."
    },
    "Shadow Essence": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Shadow Essence used in crafting and loot."
    },
    "Shadow Residue": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Shadow Residue used in crafting and loot."
    },
    "Small Tooth": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Small Tooth used in crafting and loot."
    },
    "Soft Leather": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Soft Leather used in crafting and loot."
    },
    "Solid Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Solid Core used in crafting and loot."
    },
    "Soul Dust": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Soul Dust used in crafting and loot."
    },
    "Soul Residue": {
      type: "material",
      value: 5,
      image: "Assets/Resources/soul_residue.png",
      description: "Soul Residue used in crafting and loot."
    },
    "Spirit Bark": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Spirit Bark used in crafting and loot."
    },
    "Spirit Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
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
      image: "Assets/Materials/material_placeholder.png",
      description: "Spirit Seed used in crafting and loot."
    },
    "Spirit Thread": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Spirit Thread used in crafting and loot."
    },
    "Stable Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Stable Core used in crafting and loot."
    },
    "Stone Claw": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Stone Claw used in crafting and loot."
    },
    "Stone Scale": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Stone Scale used in crafting and loot."
    },
    "Stone Skin": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Stone Skin used in crafting and loot."
    },
    "Strength Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Strength Core used in crafting and loot."
    },
    "Support Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Support Core used in crafting and loot."
    },
    "Talon Fragment": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Talon Fragment used in crafting and loot."
    },
    "Thick Fur": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Thick Fur used in crafting and loot."
    },
    "Thin Fur": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
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
      image: "Assets/Materials/material_placeholder.png",
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
      image: "Assets/Materials/material_placeholder.png",
      description: "Tough Hide used in crafting and loot."
    },
    "Toxic Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
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
      image: "Assets/Materials/material_placeholder.png",
      description: "Treated Leather used in crafting and loot."
    },
    "Trickster Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Trickster Core used in crafting and loot."
    },
    "Vital Growth": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
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
      image: "Assets/Materials/material_placeholder.png",
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
      image: "Assets/Materials/material_placeholder.png",
      description: "Withered Tissue used in crafting and loot."
    },
    "World Seed": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "World Seed used in crafting and loot."
    },
    "Wraith Core": {
      type: "material",
      value: 5,
      image: "Assets/Materials/material_placeholder.png",
      description: "Wraith Core used in crafting and loot."
    },

    "Template Weapon": {
      type: "weapon",
      slot: "weapon",
      equipCategory: "one_handed_sword",
      rarity: "common",
      itemLevel: 1,
      attack: 1,
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
      attack: 1,
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
      attack: 1,
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
      attack: 1,
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
      defense: 1,
      image: "Assets/Equips/_template_hat.png",
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
      defense: 1,
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
      defense: 1,
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
      defense: 1,
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
      defense: 1,
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
      defense: 1,
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
      defense: 1,
      image: "Assets/Equips/template_amulet.png",
      description: "Template debug item. Obtainable via add-item menu only.",
      bonusSkills: [],
      bonusStats: {}
    },
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

  professions: {
    intro:
      "Choose up to 2 professions. Weapon/Armor/Jeweller are crafting paths; Skinner/Extractor/Harvester unlock extra monster gathering drops.",
    maxSelected: 2,
    available: [
      { id: "weapon_smith", label: "Weapon smith", kind: "crafting" },
      { id: "armor_smith", label: "Armor smith", kind: "crafting" },
      { id: "jeweller", label: "Jeweller", kind: "crafting" },
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
    "Cliff Lurker": ["beast", "stone"]
  },

  crafting: {
    intro: "Crafting recipe data is configured for future professions/forge systems. resultItem must match an item id in GAME_CONFIG.items.",
    recipeTiers: [
      {
        id: "early",
        label: "Early Game Recipes",
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
          }
        ]
      },
      {
        id: "low_mid",
        label: "Low-Mid Recipes",
        minLevel: 11,
        maxLevel: 20,
        recipes: [
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
              { item: "Toxic Extract", qty: 6, source: "monster_loot" },
              { item: "Illusion Fragment", qty: 5, source: "monster_loot" },
              { item: "Growth Seed", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "boarhide_chest",
            resultItem: "Boarhide Chest",
            resultLevel: 20,
            ingredients: [
              { item: "Toxic Extract", qty: 6, source: "monster_loot" },
              { item: "Illusion Fragment", qty: 6, source: "monster_loot" },
              { item: "Distorted Core", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "sandstep_boots",
            resultItem: "Sandstep Boots",
            resultLevel: 15,
            ingredients: [
              { item: "Illusion Fragment", qty: 6, source: "monster_loot" },
              { item: "Devourer Tooth", qty: 6, source: "monster_loot" },
              { item: "Razor Claw", qty: 5, source: "monster_loot" },
              { item: "Dense Bone", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "mirage_hood",
            resultItem: "Mirage Hood",
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
              { item: "Toxic Extract", qty: 6, source: "monster_loot" },
              { item: "Illusion Fragment", qty: 5, source: "monster_loot" },
              { item: "Dense Bone", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "bone_charm",
            resultItem: "Bone Charm",
            resultLevel: 18,
            ingredients: [
              { item: "Toxic Extract", qty: 6, source: "monster_loot" },
              { item: "Illusion Fragment", qty: 6, source: "monster_loot" },
              { item: "Tough Hide", qty: 3, source: "gathering_loot" }
            ]
          },
          {
            id: "fang_loop",
            resultItem: "Fang Loop",
            resultLevel: 20,
            ingredients: [
              { item: "Illusion Fragment", qty: 6, source: "monster_loot" },
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
              { item: "Illusion Fragment", qty: 5, source: "monster_loot" },
              { item: "Distorted Core", qty: 3, source: "gathering_loot" },
              { item: "Residue", qty: 2, source: "gathering_loot" }
            ]
          },

        ]
      },
      {
        id: "mid",
        label: "Mid Game Recipes",
        minLevel: 21,
        maxLevel: 30,
        recipes: [
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
            id: "earthcaller_staff",
            resultItem: "Earthcaller Staff",
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
            id: "rockstep_boots",
            resultItem: "Rockstep Boots",
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
            id: "stone_helm",
            resultItem: "Stone Helm",
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
            id: "claw_gloves",
            resultItem: "Claw Gloves",
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
            id: "core_leggings",
            resultItem: "Core Leggings",
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
            id: "earth_loop",
            resultItem: "Earth Loop",
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
            id: "crystal_band",
            resultItem: "Crystal Band",
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
            id: "stonehide_armor",
            resultItem: "Stonehide Armor",
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
            id: "earthbind_amulet",
            resultItem: "Earthbind Amulet",
            resultLevel: 30,
            ingredients: [
              { item: "Petrify Gland", qty: 6, source: "monster_loot" },
              { item: "Stable Core", qty: 5, source: "gathering_loot" },
              { item: "Living Fiber", qty: 4, source: "gathering_loot" },
              { item: "Earth Residue", qty: 3, source: "gathering_loot" },
              { item: "Dense Bone", qty: 3, source: "gathering_loot" },
              { item: "Stone Scale", qty: 2, source: "monster_loot" }
            ]
          },
          {
            id: "earthpulse_amulet",
            resultItem: "Earthpulse Amulet",
            resultLevel: 29,
            ingredients: [
              { item: "Earth Residue", qty: 6, source: "gathering_loot" },
              { item: "Stable Core", qty: 5, source: "gathering_loot" },
              { item: "Cliff Moss", qty: 3, source: "gathering_loot" },
              { item: "Distorted Core", qty: 3, source: "monster_loot" },
              { item: "Living Fiber", qty: 2, source: "gathering_loot" }
            ]
          },
          {
            id: "skitter_ring",
            resultItem: "Skitter Ring",
            resultLevel: 27,
            ingredients: [
              { item: "Claw Fragment", qty: 6, source: "monster_loot" },
              { item: "Dense Bone", qty: 5, source: "gathering_loot" },
              { item: "Residue", qty: 3, source: "gathering_loot" },
              { item: "Sharp Fang", qty: 3, source: "monster_loot" },
              { item: "Tough Hide", qty: 2, source: "gathering_loot" }
            ]
          },

        ]
      },
      {
        id: "mid_high",
        label: "Mid-High Recipes",
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
            resultItem: "Spirit Bark Armor",
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
            id: "jungle_boots",
            resultItem: "Jungle Boots",
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
            id: "vine_gloves",
            resultItem: "Vine Gloves",
            resultLevel: 36,
            ingredients: [
              { item: "Fox Fang", qty: 7, source: "monster_loot" },
              { item: "Forest Fur", qty: 6, source: "monster_loot" },
              { item: "Antler Piece", qty: 5, source: "monster_loot" },
              { item: "Spirit Seed", qty: 5, source: "monster_loot" },
              { item: "Growth Seed", qty: 4, source: "gathering_loot" },
              { item: "Heavy Bone", qty: 4, source: "gathering_loot" }
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
            id: "spirit_amulet",
            resultItem: "Spirit Amulet",
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
            id: "jungle_bracelet",
            resultItem: "Jungle Bracelet",
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
            id: "echo_band",
            resultItem: "Echo Band",
            resultLevel: 39,
            ingredients: [
              { item: "Shadow Residue", qty: 7, source: "monster_loot" },
              { item: "Fox Fang", qty: 6, source: "monster_loot" },
              { item: "Forest Fur", qty: 5, source: "monster_loot" },
              { item: "Antler Piece", qty: 5, source: "monster_loot" },
              { item: "Spirit Seed", qty: 4, source: "monster_loot" },
              { item: "Heavy Bone", qty: 4, source: "gathering_loot" },
              { item: "Jungle Fiber", qty: 4, source: "gathering_loot" }
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
            id: "gorilla_hide_armor",
            resultItem: "Gorilla Hide Armor",
            resultLevel: 40,
            ingredients: [
              { item: "Thick Hide", qty: 9, source: "monster_loot" },
              { item: "Muscle Fiber", qty: 7, source: "monster_loot" },
              { item: "Heavy Bone", qty: 5, source: "gathering_loot" },
              { item: "Jungle Fiber", qty: 4, source: "gathering_loot" },
              { item: "Dense Bone", qty: 4, source: "gathering_loot" },
              { item: "Living Fiber", qty: 3, source: "gathering_loot" },
              { item: "Stable Core", qty: 3, source: "gathering_loot" }
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

        ]
      },
      {
        id: "high_end",
        label: "High-End Recipes",
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
            id: "molten_gloves",
            resultItem: "Molten Gloves",
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
            id: "ember_ring",
            resultItem: "Ember Ring",
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
            id: "soul_loop",
            resultItem: "Soul Loop",
            resultLevel: 51,
            ingredients: [
              { item: "Ember Fragment", qty: 8, source: "monster_loot" },
              { item: "Magma Hide", qty: 7, source: "monster_loot" },
              { item: "Lava Core", qty: 6, source: "monster_loot" },
              { item: "Frozen Shell", qty: 6, source: "monster_loot" },
              { item: "Ice Fang", qty: 5, source: "monster_loot" },
              { item: "Basilisk Eye", qty: 5, source: "monster_loot" },
              { item: "Ancient Seed", qty: 3, source: "gathering_loot" },
              { item: "Living Fiber", qty: 2, source: "gathering_loot" },
              { item: "Ash Residue", qty: 2, source: "gathering_loot" }
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
          },

        ]
      }
    ]
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
