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
   * Enemy drops: xp always applies on victory. gold: either a number (fixed) or { min, max } for a random
   * integer in that range per defeated enemy. items: each entry is either a string (item name, 100% drop) or
   * { name, dropRate } with dropRate in 0–100 (% per kill).
   * Enemy art supports legacy `image`, state images (`images: { idle, walk, attack }`),
   * or sprite strips (`sprites: { idle|walk|attack: { sheet, frames, fps, loop?, cols?, rows? } }`).
   * For atlas layouts (e.g. 10 frames in 2 rows), set `cols` and `rows` (example: cols: 5, rows: 2).
   */
  enemies: [
    {
      name: "Burrow Hare",
      hp: 40,
      attack: 6,
      image: "Assets/Monsters/burrow_hare.png",
      possibleLevels: [1, 2, 3, 4, 5],
      possibleMoods: ["cautious"],
      drops: {
        gold: { min: 1, max: 10 },
        xp: 25,
        items: [{ name: "Rusty Sword", dropRate: 35 }]
      }
    },
    {
      name: "Plains Raptor",
      hp: 60,
      attack: 8,
      image: "Assets/Monsters/plains_raptor.png",
      possibleLevels: [4, 5, 6, 7, 8],
      possibleMoods: ["focused"],
      drops: {
        gold: { min: 2, max: 12 },
        xp: 35,
        items: [{ name: "Rusty Sword", dropRate: 35 }]
      }
    },
    {
      name: "Grass Snake",
      hp: 40,
      attack: 12,
      image: "Assets/Monsters/grass_snake.png",
      possibleLevels: [7, 8, 9, 10, 11],
      possibleMoods: ["focused"],
      drops: {
        gold: { min: 5, max: 15 },
        xp: 50,
        items: [{ name: "Rusty Sword", dropRate: 35 }]
      }
    },
    {
      name: "Tusk Boar",
      hp: 120,
      attack: 10,
      image: "Assets/Monsters/tusk_boar.png",
      possibleLevels: [10, 11, 13, 14, 15],
      possibleMoods: ["steady"],
      drops: {
        gold: { min: 8, max: 15 },
        xp: 70,
        items: [{ name: "Rusty Sword", dropRate: 35 }]
      }
    },
    {
      name: "Field Wolf",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/field_wolf.png",
      possibleLevels: [15, 16, 17, 19, 20],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Greenleaf Squirrel",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/greenleaf_squirrel.png",
      possibleLevels: [15, 16, 17, 19, 20],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Greenleaf Parrot",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/greenleaf_parrot.png",
      possibleLevels: [15, 16, 17, 19, 20],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Greenleaf Fox",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/greenleaf_fox.png",
      possibleLevels: [15, 16, 17, 19, 20],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Greenleaf Stag",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/forest_stag.png",
      possibleLevels: [15, 16, 17, 19, 20],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Gorilla",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/greenleaf_gorilla.png",
      possibleLevels: [15, 16, 17, 19, 20],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Stone Marmot",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/stone_marmot.png",
      possibleLevels: [15, 16, 17, 19, 20],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Rock Lynx",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/rock_lynx.png",
      possibleLevels: [15, 16, 17, 19, 20],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Rock Ibex",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/rock_ibex.png",
      possibleLevels: [15, 16, 17, 19, 20],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Rock Serpent",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/rock_serpent.png",
      possibleLevels: [15, 16, 17, 19, 20],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },
    {
      name: "Rock Lizzard",
      hp: 30,
      attack: 5,
      image: "Assets/Monsters/rock_lizzard.png",
      possibleLevels: [15, 16, 17, 19, 20],
      possibleMoods: ["berserk"],
      drops: {
        gold: { min: 10, max: 20 },
        xp: 100,
        items: [{ name: "Rusty Sword", dropRate: 55 }]
      }
    },

  ],

  items: {
    "Rusty Sword": {
      type: "weapon",
      slot: "weapon",
      attack: 3,
      image: "Assets/Equips/rusty-sword.svg",
      description: "A notched blade. Better than fists in a brawl.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Iron Sword": {
      type: "weapon",
      slot: "weapon",
      attack: 6,
      image: "Assets/Equips/iron-sword.svg",
      description: "Well-balanced steel. Favored by city guards.",
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
    "Iron Helm": {
      type: "armor",
      slot: "head",
      defense: 1,
      image: "Assets/Equips/iron-helm.svg",
      description: "Protects the skull from glancing blows.",
      bonusSkills: [],
      bonusStats: {}
    },
    "Wooden Shield": {
      type: "armor",
      slot: "offhand",
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
    "Iron Greaves": {
      type: "armor",
      slot: "legs",
      defense: 2,
      image: "Assets/Equips/iron-greaves.svg",
      description: "Metal guards for shins and knees.",
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
      bonusStats: { AGI: 1 }
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

  /** Short blurbs for overview tooltips; combat math lives in game.js */
  statHelp: {
    level:
      "Your overall tier. Each level grants 5 characteristic points, +2 base attack, and refills HP. You gain a level every 100 XP.",
    hp: "Hit points: when this reaches 0 in combat, you are defeated. Max HP grows with level and Vitality.",
    xp: "Experience toward the next level. At 100 XP you level up, earn characteristic points, gain base attack, and HP refills.",
    charPoints:
      "Earned each time you level (5 per level). Spend 1 point per click on Strength, Agility, or Vitality (max 50 each).",
    str: "Strength adds to melee attack damage (half your Strength, rounded down, plus weapon and skills). Spend characteristic points to raise it.",
    agi: "Agility reduces damage taken from enemies: each 4 Agility subtracts 1 from incoming hit damage (before armor). Spend characteristic points to raise it.",
    vit: "Vitality increases max HP (5 HP per point). Spending a point on Vitality also increases current HP by the same amount (up to your new max).",
    armor: "Total armor from equipped gear. Each point reduces enemy damage by 1 (combined with Agility’s reduction).",
    damage: "Approximate damage range per attack: your attack stat varies slightly around the middle value shown."
  },

  skills: [
    {
      name: "Power Strike",
      bonus: 5,
      combatMultiplier: 1.55,
      image: "Assets/Skills/power-strike.svg",
      description: "A committed melee swing. Passive: +5 attack. In combat, use as a skill for a high damage multiplier."
    },
    {
      name: "Heavy Blow",
      bonus: 3,
      combatMultiplier: 1.35,
      image: "Assets/Skills/heavy-blow.svg",
      description: "A slower, crushing hit. Passive: +3 attack. Combat skill with solid bonus damage."
    },
    {
      name: "Precise Shot",
      bonus: 2,
      combatMultiplier: 1.28,
      image: "Assets/Skills/precise-shot.svg",
      description: "Aimed strike exploiting weak points. Passive: +2 attack. Lighter multiplier, reliable in long fights."
    },
    {
      name: "Arcane Strike",
      bonus: 4,
      combatMultiplier: 1.42,
      image: "Assets/Skills/arcane-strike.svg",
      description: "Infused attack blending force and focus. Passive: +4 attack. Strong combat skill multiplier."
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
   * Each passable biome lists possibleEnemies; mobs roll 1–8 units from that pool (see game.js).
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
    mobPreviewVersion: 6,
    /** Cooldown after clearing a mob before it respawns on this map (ms). */
    mobRespawnMs: 60000,
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
     */
    cityPortals: [
      {
        name: "Maidenfrost",
        x: 17,
        y: 10,
        bg: "Assets/Biomes/Maidenfrost/1.png",
        theme: "portal-theme-frost",
        label: "Frost Waygate"
      },
      {
        name: "Widow\u2019s Ash",
        x: 42,
        y: 13,
        bg: "Assets/Biomes/Widow\u2019s Ash/1.png",
        theme: "portal-theme-ash",
        label: "Ash Gate"
      },
      {
        name: "Iceveil",
        x: 6,
        y: 34,
        bg: "Assets/Biomes/Iceveil/1.png",
        theme: "portal-theme-ice",
        label: "Ice Threshold"
      },
      {
        name: "Dolorhame",
        x: 36,
        y: 37,
        bg: "Assets/Biomes/Dolorhame/1.png",
        theme: "portal-theme-dune",
        label: "Dune Arch"
      },
      {
        name: "Breathless Vale",
        x: 33,
        y: 61,
        bg: "Assets/Biomes/Breathless Vale/1.png",
        theme: "portal-theme-vale",
        label: "Vale Portal"
      },
      {
        name: "Greenhollow",
        x: 5,
        y: 63,
        bg: "Assets/Biomes/Greenhollow/1.png",
        theme: "portal-theme-hollow",
        label: "Hollow Gate"
      },
      {
        name: "Blazewound",
        x: 43,
        y: 83,
        bg: "Assets/Biomes/Blazewound/1.png",
        theme: "portal-theme-blaze",
        label: "Molten Door"
      },
      {
        name: "Windmere",
        x: 17,
        y: 85,
        bg: "Assets/Biomes/Windmere/1.png",
        theme: "portal-theme-wind",
        label: "Wind Arch"
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
        mobDifficulty: { easy: 5, medium: 15, hard: 25 },
        possibleEnemies: ["Bandit", "Wolf"]
      },
      {
        name: "Heart of Gaia",
        passable: true,
        color: "#1F4F1F",
        enemyScale: 1.1,
        mobDifficulty: { easy: 8, medium: 22, hard: 38 },
        possibleEnemies: ["Greenleaf Squirrel", "Greenleaf Parrot", "Greenleaf Fox", "Greenleaf Stag", "Gorilla"]
      },
      {
        name: "Skin of Gaia",
        passable: true,
        color: "#6DA544",
        enemyScale: 1.1,
        mobDifficulty: { easy: 10, medium: 50, hard: 100 },
        possibleEnemies: ["Burrow Hare", "Plains Raptor", "Grass Snake", "Tusk Boar", "Field Wolf"]
      },
      {
        name: "Hatred of the World",
        passable: true,
        color: "#A63A1F",
        enemyScale: 1.25,
        mobDifficulty: { easy: 12, medium: 28, hard: 45 },
        possibleEnemies: ["Bandit", "Drone"]
      },
      {
        name: "The held breath",
        passable: true,
        color: "#6E6A64",
        enemyScale: 1.15,
        mobDifficulty: { easy: 10, medium: 35, hard: 55 },
        possibleEnemies: ["Stone Marmot", "Rock Lynx", "Rock Ibex", "Rock Serpent", "Rock Lizzard"]
      },
      {
        name: "Aftermath of War",
        passable: true,
        color: "#4B4B4F",
        enemyScale: 1.2,
        mobDifficulty: { easy: 15, medium: 40, hard: 60 },
        possibleEnemies: ["Bandit", "Drone", "Wolf"]
      },
      {
        name: "The misery of life",
        passable: true,
        color: "#D2A26B",
        enemyScale: 1.1,
        mobDifficulty: { easy: 8, medium: 25, hard: 42 },
        possibleEnemies: ["Bandit", "Wolf"]
      },
      {
        name: "The apathy of the World",
        passable: true,
        color: "#8FB7D1",
        enemyScale: 1.3,
        mobDifficulty: { easy: 18, medium: 45, hard: 70 },
        possibleEnemies: ["Drone", "Bandit", "Wolf"]
      },
      {
        name: "Innocence of North",
        passable: true,
        color: "#E8EEF2",
        enemyScale: 1,
        mobDifficulty: { easy: 6, medium: 18, hard: 35 },
        possibleEnemies: ["Wolf", "Bandit", "Drone"]
      },
      {
        name: "Paradise North",
        passable: true,
        color: "#E6C48A",
        enemyScale: 1,
        mobDifficulty: { easy: 5, medium: 15, hard: 25 },
        possibleEnemies: ["Bandit", "Wolf"]
      }
    ]
  },

  regions: [
    {
      name: "Dark Forest",
      background: "linear-gradient(180deg,#1a2a1a 0%,#0d180d 100%)",
      enemyScale: 1,
      mobDifficulty: { easy: 5, medium: 15, hard: 25 },
      possibleEnemies: ["Bandit", "Wolf"]
    },
    {
      name: "Rust Wastes",
      background: "linear-gradient(180deg,#2a1a0d 0%,#1a0f08 100%)",
      enemyScale: 1.35,
      mobDifficulty: { easy: 12, medium: 35, hard: 55 },
      possibleEnemies: ["Bandit", "Wolf"]
    },
    {
      name: "Orbital Fringe",
      background: "linear-gradient(180deg,#0a1628 0%,#050a12 100%)",
      enemyScale: 1.6,
      mobDifficulty: { easy: 20, medium: 55, hard: 90 },
      possibleEnemies: ["Drone", "Bandit"]
    }
  ]
};
