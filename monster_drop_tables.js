/**
 * Per-monster loot: material drop chances (% per material pass). Equipment is craft-only.
 * Merged into GAME_CONFIG after config.js loads. Victory loot uses game.js helpers.
 */
(function () {
  if (typeof GAME_CONFIG === "undefined" || !GAME_CONFIG) return;

  const coastalTide = {
    materials: [
      { name: "Abyss Flesh", dropRate: 32.5 },
      { name: "Dark Residue", dropRate: 20 },
      { name: "Abyss Core", dropRate: 6 },
      { name: "Deepwater Essence", dropRate: 2.5 },
      { name: "Abyss Residue", dropRate: 18 }
    ]
  };

  GAME_CONFIG.lootDropSettings = {
    materialPassesMin: 1,
    materialPassesMax: 2,
    defaultGoldByRarity: {
      common: { min: 10, max: 20 },
      rare: { min: 14, max: 28 },
      epic: { min: 20, max: 40 },
      myth: { min: 30, max: 55 },
      ancient: { min: 42, max: 75 }
    }
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
      materials: [
        { name: "Hardened Shell", dropRate: 32 },
        { name: "Salt Flesh", dropRate: 20 },
        { name: "Crust Fragment", dropRate: 20 },
        { name: "Defensive Core", dropRate: 7.5 },
        { name: "Ocean Essence", dropRate: 2.5 }
      ]
    },
    "Saltwind Skimmer": {
      materials: [
        { name: "Sharp Fin", dropRate: 34 },
        { name: "Wind Scale", dropRate: 22 },
        { name: "Razor Edge Fragment", dropRate: 9 },
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
      materials: [
        { name: "Tide Fragment", dropRate: 32.5 },
        { name: "Pressure Core", dropRate: 20 },
        { name: "Crushing Essence", dropRate: 6 },
        { name: "Abyssal Essence", dropRate: 2.5 }
      ]
    },
    "Cliff Lurker": {
      materials: [
        { name: "Stone Fragment", dropRate: 30 },
        { name: "Rough Core", dropRate: 22 },
        { name: "Bone Fragment", dropRate: 18 },
        { name: "Cliff Moss", dropRate: 12 }
      ]
    },
    "Tidebound Crusher": {
      materials: [
        { name: "Crushed Anchor Shard", dropRate: 35 },
        { name: "Salt-Encrusted Plate", dropRate: 30 },
        { name: "Pressure Core", dropRate: 18 },
        { name: "Barnacle Cluster", dropRate: 12 },
        { name: "Wet Membrane", dropRate: 12 },
        { name: "Ripple Core", dropRate: 10 },
        { name: "Fluid Sac", dropRate: 9 },
        { name: "Tide Fragment", dropRate: 8 }
      ]
    },
    "Stormfang Ravager": {
      materials: [
        { name: "Stormfang Claw", dropRate: 26 },
        { name: "Charged Scale", dropRate: 20 },
        { name: "Stormhide Strip", dropRate: 18 },
        { name: "Static Fang Core", dropRate: 14 },
        { name: "Sharp Fin", dropRate: 12 },
        { name: "Wind Scale", dropRate: 10 },
        { name: "Pressure Core", dropRate: 8 },
        { name: "Abyss Residue", dropRate: 6 }
      ]
    },
    "Abyssal Tempest Caller": {
      materials: [
        { name: "Tempest Thread", dropRate: 26 },
        { name: "Storm Sigil Fragment", dropRate: 20 },
        { name: "Charged Brine Core", dropRate: 16 },
        { name: "Drowned Spark Residue", dropRate: 12 },
        { name: "Abyssal Thread", dropRate: 12 },
        { name: "Echo Residue", dropRate: 10 },
        { name: "Distorted Core", dropRate: 8 },
        { name: "Drowned Sigil Fragment", dropRate: 6 }
      ]
    },
    "The Stormwake Leviathan": {
      materials: [
        { name: "Leviathan Stormcore", dropRate: 22 },
        { name: "Abyssal Lightning Scale", dropRate: 22 },
        { name: "Stormwake Tendril", dropRate: 18 },
        { name: "Eye of the Maelstrom", dropRate: 12 },
        { name: "Wind Scale", dropRate: 8 },
        { name: "Pressure Core", dropRate: 7 },
        { name: "Abyss Residue", dropRate: 6 },
        { name: "Distorted Core", dropRate: 5 }
      ]
    },
    "Drowned Channeler": {
      materials: [
        { name: "Abyssal Thread", dropRate: 34 },
        { name: "Echo Residue", dropRate: 25 },
        { name: "Distorted Core", dropRate: 20 },
        { name: "Drowned Sigil Fragment", dropRate: 10 },
        { name: "Sharp Fin", dropRate: 12 },
        { name: "Wind Scale", dropRate: 10 },
        { name: "Pressure Core", dropRate: 9 },
        { name: "Abyss Residue", dropRate: 8 }
      ]
    },
    "Tidemother Aberration": {
      materials: [
        { name: "Tidemother Core", dropRate: 40 },
        { name: "Abyss Residue", dropRate: 25 },
        { name: "Echo Heart", dropRate: 18 },
        { name: "Corrupted Brine Flesh", dropRate: 12 },
        { name: "Wet Membrane", dropRate: 10 },
        { name: "Ripple Core", dropRate: 9 },
        { name: "Fluid Sac", dropRate: 8 },
        { name: "Distorted Core", dropRate: 7 }
      ]
    },
    "Burrow Hare": {
      materials: [
        { name: "Soft Fur", dropRate: 35 },
        { name: "Digging Claw", dropRate: 22.5 },
        { name: "Reflex Core", dropRate: 7.5 },
        { name: "Earth Essence", dropRate: 2.5 }
      ]
    },
    "Dust Carver": {
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
      materials: [
        { name: "Thick Hide", dropRate: 40 },
        { name: "Boar Tusk", dropRate: 22.5 },
        { name: "Endurance Core", dropRate: 9 },
        { name: "Nature Essence", dropRate: 3 }
      ]
    },
    "Field Wolf": {
      materials: [
        { name: "Wolf Fang", dropRate: 37.5 },
        { name: "Fur Pelt", dropRate: 20 },
        { name: "Predator Instinct Core", dropRate: 9 },
        { name: "Blood Essence", dropRate: 3 }
      ]
    },
    "Bramblehorn Matriarch": {
      materials: [
        { name: "Bramblehorn Shard", dropRate: 26 },
        { name: "Living Bramble Fiber", dropRate: 20 },
        { name: "Gaia Sap Antler", dropRate: 14 },
        { name: "Rootmend Core", dropRate: 9 }
      ]
    },
    "Fangroot Alpha": {
      materials: [
        { name: "Fangroot Claw", dropRate: 26 },
        { name: "Alpha Fang", dropRate: 20 },
        { name: "Bloodroot Hide", dropRate: 14 },
        { name: "Predator Sap", dropRate: 9 }
      ]
    },
    "Gaiahide Behemoth": {
      materials: [
        { name: "Gaiahide Plate", dropRate: 22 },
        { name: "Behemoth Rootbone", dropRate: 20 },
        { name: "Rootquake Core", dropRate: 16 },
        { name: "Ancient Gaia Sap", dropRate: 12 },
        { name: "Heartburrow Horn", dropRate: 8 }
      ]
    },
    "Petrified Coilwarden": {
      materials: [
        { name: "Petrified Scale", dropRate: 70 },
        { name: "Venomstone Fang", dropRate: 55 },
        { name: "Mineral Venom Sac", dropRate: 35 },
        { name: "Coilwarden Core", dropRate: 15 }
      ]
    },
    "Granitehorn Breaker": {
      materials: [
        { name: "Granite Horn Fragment", dropRate: 70 },
        { name: "Breaker Hide Plate", dropRate: 55 },
        { name: "Faultline Hoof", dropRate: 35 },
        { name: "Hornbreaker Core", dropRate: 15 }
      ]
    },
    "The Held Colossus": {
      materials: [
        { name: "Colossus Plate Shard", dropRate: 100 },
        { name: "Stillstone Fragment", dropRate: 75 },
        { name: "Faultvein Core", dropRate: 45 },
        { name: "Pressurecore Heart", dropRate: 25 },
        { name: "Mountainbound Soulstone", dropRate: 8 }
      ]
    },
    "Pinebound Fawn": {
      materials: [
        { name: "Soft Pine Fur", dropRate: 70 },
        { name: "Frost Berry", dropRate: 55 },
        { name: "Gentle Antler Chip", dropRate: 35 },
        { name: "Grace Core", dropRate: 15 }
      ]
    },
    "Frozen Pinecone": {
      materials: [
        { name: "Frozen Needle", dropRate: 70 },
        { name: "Ice Sap Shell", dropRate: 55 },
        { name: "Frostbite Seed", dropRate: 35 },
        { name: "Control Core", dropRate: 15 }
      ]
    },
    "Ice-Tusked Boar": {
      materials: [
        { name: "Ice Tusk Fragment", dropRate: 70 },
        { name: "Frosthide Plate", dropRate: 55 },
        { name: "Cold Rage Core", dropRate: 35 },
        { name: "Endurance Core", dropRate: 15 }
      ]
    },
    "Whitebark Matron": {
      materials: [
        { name: "Whitebark Antler", dropRate: 70 },
        { name: "Matron Rootcloth", dropRate: 55 },
        { name: "Frozen Mend Core", dropRate: 35 },
        { name: "Whitebark Heartseed", dropRate: 15 }
      ]
    },
    "Frosthorn Bulwark": {
      materials: [
        { name: "Frosthorn Fragment", dropRate: 70 },
        { name: "Bulwark Icehide", dropRate: 55 },
        { name: "Frozen Tusk Core", dropRate: 35 },
        { name: "Frosthorn Soulplate", dropRate: 15 }
      ]
    },
    "The Sleeping Child of Winter": {
      materials: [
        { name: "Frost Veil Scrap", dropRate: 100 },
        { name: "Sleeping Root Fragment", dropRate: 75 },
        { name: "Innocent Winter Core", dropRate: 45 },
        { name: "Frozen Heartseed", dropRate: 25 },
        { name: "Lullaby Soulcore", dropRate: 8 }
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
      materials: [
        { name: "Devourer Tooth", dropRate: 35 },
        { name: "Sand Core", dropRate: 20 },
        { name: "Hunger Core", dropRate: 7.5 },
        { name: "Earth Essence", dropRate: 2.5 }
      ]
    },
    "Mirage Lurker": {
      materials: [
        { name: "Mirage Dust", dropRate: 32.5 },
        { name: "Illusion Thread", dropRate: 20 },
        { name: "Trickster Core", dropRate: 6 },
        { name: "Illusion Essence", dropRate: 2.5 }
      ]
    },
    "Thornback Graveguard": {
      materials: [
        { name: "Thornback Carapace", dropRate: 70 },
        { name: "Grave Thorn", dropRate: 55 },
        { name: "Bleached Shell Plate", dropRate: 35 },
        { name: "Buried Bone Core", dropRate: 15 }
      ]
    },
    "Mirage Maw": {
      materials: [
        { name: "Mirage Jawbone", dropRate: 70 },
        { name: "Haze-Torn Skin", dropRate: 55 },
        { name: "Thirsting Eye", dropRate: 35 },
        { name: "Splintered Illusion Core", dropRate: 15 }
      ]
    },
    "The Dune Mourner": {
      materials: [
        { name: "Mourner’s Veilcloth", dropRate: 100 },
        { name: "Hollow Rib Fragment", dropRate: 75 },
        { name: "Drought Essence", dropRate: 45 },
        { name: "Black Sand Heart", dropRate: 25 },
        { name: "Mawbound Soulcore", dropRate: 8 }
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
      materials: [
        { name: "Hardened Stone", dropRate: 40 },
        { name: "Dense Fur", dropRate: 20 },
        { name: "Bulwark Core", dropRate: 9 },
        { name: "Earth Essence", dropRate: 2.5 }
      ]
    },
    "Rock Lynx": {
      materials: [
        { name: "Sharp Fang", dropRate: 35 },
        { name: "Stone Claw", dropRate: 20 },
        { name: "Hunter Core", dropRate: 7.5 },
        { name: "Earth Essence", dropRate: 2.5 }
      ]
    },
    "Rock Ibex": {
      materials: [
        { name: "Ibex Horn", dropRate: 37.5 },
        { name: "Muscle Fiber", dropRate: 20 },
        { name: "Strength Core", dropRate: 7.5 },
        { name: "Earth Essence", dropRate: 2.5 }
      ]
    },
    "Rock Serpent": {
      materials: [
        { name: "Stone Scale", dropRate: 35 },
        { name: "Petrify Gland", dropRate: 22.5 },
        { name: "Control Core", dropRate: 7.5 },
        { name: "Earth Essence", dropRate: 2.5 }
      ]
    },
    "Rock Lizard": {
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
    "Canopy Screecher": {
      materials: [
        { name: "Screech Feather", dropRate: 37.5 },
        { name: "Echo Beak", dropRate: 20 },
        { name: "Resonance Core", dropRate: 7.5 },
        { name: "Nature Essence", dropRate: 3 }
      ]
    },
    "Greenleaf Fox": {
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
      materials: [
        { name: "Antler Piece", dropRate: 37.5 },
        { name: "Bark Fragment", dropRate: 20 },
        { name: "Support Core", dropRate: 7.5 },
        { name: "Nature Essence", dropRate: 3 }
      ]
    },
    "Ash Horror": {
      materials: [
        { name: "Ash Residue", dropRate: 70 },
        { name: "Smothered Cinder", dropRate: 55 },
        { name: "Decay Fragment", dropRate: 35 },
        { name: "Ash Horror Core", dropRate: 15 }
      ]
    },
    "Cinder Husk": {
      materials: [
        { name: "Ashen Cloth", dropRate: 70 },
        { name: "Cinder Husk Plate", dropRate: 55 },
        { name: "Grave Fortitude Core", dropRate: 35 },
        { name: "Husk Core", dropRate: 15 }
      ]
    },
    "Ash Skulker": {
      materials: [
        { name: "Shadow Dust", dropRate: 70 },
        { name: "Skulker Fang", dropRate: 55 },
        { name: "Smokehide Strip", dropRate: 35 },
        { name: "Ambush Core", dropRate: 15 }
      ]
    },
    "Faded War Wraith": {
      materials: [
        { name: "Soul Fragment", dropRate: 70 },
        { name: "Faded Banner Thread", dropRate: 55 },
        { name: "Shadow Residue", dropRate: 35 },
        { name: "Wraith Core", dropRate: 15 },
        { name: "Shadow Essence", dropRate: 8 }
      ]
    },
    "Remnant of Rust": {
      materials: [
        { name: "Rusted Metal", dropRate: 70 },
        { name: "Corroded Gear", dropRate: 55 },
        { name: "Control Core", dropRate: 35 },
        { name: "Metal Essence", dropRate: 15 }
      ]
    },
    "Rustbound Marshal": {
      materials: [
        { name: "Marshal Rustplate", dropRate: 70 },
        { name: "Corroded Chainlink", dropRate: 55 },
        { name: "Command Core", dropRate: 35 },
        { name: "Rustbound Heart", dropRate: 15 }
      ]
    },
    "Bannerless Wraithlord": {
      materials: [
        { name: "Torn Warbanner", dropRate: 70 },
        { name: "Wraith Ashcloth", dropRate: 55 },
        { name: "Haunting Sigil", dropRate: 35 },
        { name: "Bannerless Soulcore", dropRate: 15 }
      ]
    },
    "The Last Warmaster": {
      materials: [
        { name: "Warmaster Plate Shard", dropRate: 100 },
        { name: "Broken Command Blade", dropRate: 75 },
        { name: "Last Order Core", dropRate: 45 },
        { name: "Wargrave Ember", dropRate: 25 },
        { name: "Eternal Battle Soul", dropRate: 8 }
      ]
    },
    "Verdant Bloomseer": {
      materials: [
        { name: "Bloomseer Petal", dropRate: 70 },
        { name: "Pollen-Sap Thread", dropRate: 55 },
        { name: "Verdant Mend Core", dropRate: 35 },
        { name: "Bloomseer Heartseed", dropRate: 15 }
      ]
    },
    "Primordial Silverback": {
      materials: [
        { name: "Silverback Barkplate Scrap", dropRate: 70 },
        { name: "Rootknuckle Bone", dropRate: 55 },
        { name: "Primal Vine Core", dropRate: 35 },
        { name: "Silverback Titan Heart", dropRate: 15 }
      ]
    },
    "The Heartbloom Ancient": {
      materials: [
        { name: "Ancient Heartbloom Petal", dropRate: 100 },
        { name: "Gaia Rootheart Fragment", dropRate: 75 },
        { name: "Living Canopy Core", dropRate: 45 },
        { name: "Heartbloom Sapstone", dropRate: 25 },
        { name: "Gaia Soulseed", dropRate: 8 }
      ]
    },
    "Inferno Oracle": {
      materials: [
        { name: "Oracle Ember Eye", dropRate: 70 },
        { name: "Cinderveil Thread", dropRate: 55 },
        { name: "Burning Prophecy Core", dropRate: 35 },
        { name: "Oracle Flameheart", dropRate: 15 }
      ]
    },
    "Ashmaw Titan": {
      materials: [
        { name: "Titan Obsidian Plate", dropRate: 70 },
        { name: "Ashmaw Jawbone", dropRate: 55 },
        { name: "Molten Titan Core", dropRate: 35 },
        { name: "Ashmaw Heartplate", dropRate: 15 }
      ]
    },
    "The Riftforge Tyrant": {
      materials: [
        { name: "Tyrant Blackplate", dropRate: 100 },
        { name: "Broken Riftblade", dropRate: 75 },
        { name: "Tyrant Forge Core", dropRate: 45 },
        { name: "Hatred Emberstone", dropRate: 25 },
        { name: "Worldhate Soulcore", dropRate: 8 }
      ]
    },
    "Hollowglass Siren": {
      materials: [
        { name: "Hollowglass Shard", dropRate: 70 },
        { name: "Soundless Veil Thread", dropRate: 55 },
        { name: "Siren Silence Core", dropRate: 35 },
        { name: "Frozen Echo Heart", dropRate: 15 }
      ]
    },
    "Rimebound Undertaker": {
      materials: [
        { name: "Rimebound Ironbone", dropRate: 70 },
        { name: "Undertaker Frosthide", dropRate: 55 },
        { name: "Funeral Chainlink", dropRate: 35 },
        { name: "Gravecold Core", dropRate: 15 }
      ]
    },
    "The Stillness Below": {
      materials: [
        { name: "Stillness Leviathan Scale", dropRate: 100 },
        { name: "Abyssal Iceheart Fragment", dropRate: 75 },
        { name: "Frozen Void Core", dropRate: 45 },
        { name: "Absolute Rime Crystal", dropRate: 25 },
        { name: "Apathy Soulcore", dropRate: 8 }
      ]
    },
    "Icy Mink": {
      materials: [
        { name: "Mink Frostfur", dropRate: 37.5 },
        { name: "Quick Ice Claw", dropRate: 20 },
        { name: "Agility Core", dropRate: 7.5 },
        { name: "Ice Essence", dropRate: 2.5 }
      ]
    },
    "Icy Serpent": {
      materials: [
        { name: "Icefang Needle", dropRate: 37.5 },
        { name: "Serpent Frostscale", dropRate: 20 },
        { name: "Venom Core", dropRate: 7.5 },
        { name: "Ice Essence", dropRate: 2.5 }
      ]
    },
    "Ash Lizard": {
      materials: [
        { name: "Ash Scale", dropRate: 37.5 },
        { name: "Burnt Hide", dropRate: 20 },
        { name: "Fire Core", dropRate: 9 },
        { name: "Flame Essence", dropRate: 3 }
      ]
    },
    "Cinder Stalker": {
      materials: [
        { name: "Burning Fang", dropRate: 35 },
        { name: "Ember Fragment", dropRate: 20 },
        { name: "Assassin Core", dropRate: 7.5 },
        { name: "Fire Essence", dropRate: 2.5 }
      ]
    },
    "Ember Scuttler": {
      materials: [
        { name: "Ember Core", dropRate: 37.5 },
        { name: "Heat Shell", dropRate: 20 },
        { name: "Control Core", dropRate: 7.5 },
        { name: "Fire Essence", dropRate: 2.5 }
      ]
    },
    "Magma Boar": {
      materials: [
        { name: "Magma Hide", dropRate: 40 },
        { name: "Lava Core", dropRate: 22.5 },
        { name: "Endurance Core", dropRate: 9 },
        { name: "Fire Essence", dropRate: 3 }
      ]
    },
    "Lava Basilisk": {
      materials: [
        { name: "Basilisk Eye", dropRate: 35 },
        { name: "Molten Scale", dropRate: 20 },
        { name: "Control Core", dropRate: 7.5 },
        { name: "Fire Essence", dropRate: 3 }
      ]
    },
    "Glacier Turtoise": {
      materials: [
        { name: "Frozen Shell", dropRate: 37.5 },
        { name: "Ice Plate", dropRate: 20 },
        { name: "Defense Core", dropRate: 7.5 },
        { name: "Ice Essence", dropRate: 2.5 }
      ]
    },
    "Frozen Stalker": {
      materials: [
        { name: "Ice Fang", dropRate: 37.5 },
        { name: "Frost Claw", dropRate: 20 },
        { name: "Assassin Core", dropRate: 7.5 },
        { name: "Ice Essence", dropRate: 2.5 }
      ]
    },
    "Frost Skitter": {
      materials: [
        { name: "Frost Thread", dropRate: 37.5 },
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
    "Canopy Screecher": [
      { name: "Canopy Feather", dropRate: 18, condition: "harvester" },
      { name: "Bright Seeds", dropRate: 12, condition: "harvester" }
    ],
    "Jungle Stag": [
      { name: "Growth Seed", dropRate: 13, condition: "harvester" },
      { name: "Spirit Seed", dropRate: 9, condition: "harvester" },
      { name: "Antler Piece", dropRate: 12, condition: "extractor" }
    ],
    "Barkhide Spriggan": [
      { name: "Ancient Seed", dropRate: 70 },
      { name: "Living Fiber", dropRate: 55 },
      { name: "Barkskin Shard", dropRate: 35 },
      { name: "Nature Core", dropRate: 15 }
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

    "Glacier Turtoise": [{ name: "Frozen Shell", dropRate: 10, condition: "skinner" }, { name: "Ice Plate", dropRate: 8, condition: "extractor" }],
    "Glacier Tortoise": [{ name: "Frozen Shell", dropRate: 10, condition: "skinner" }, { name: "Ice Plate", dropRate: 8, condition: "extractor" }],
    "Frozen Stalker": [{ name: "Frost Claw", dropRate: 10, condition: "skinner" }, { name: "Ice Fang", dropRate: 7, condition: "extractor" }],
    "Frost Skitter": [
      { name: "Chill Residue", dropRate: 10, condition: "harvester" },
      { name: "Frost Thread", dropRate: 8, condition: "harvester" }
    ],
    "Icy Mink": [
      { name: "Mink Frostfur", dropRate: 12, condition: "skinner" },
      { name: "Quick Ice Claw", dropRate: 8, condition: "extractor" }
    ],
    "Icy Serpent": [
      { name: "Serpent Frostscale", dropRate: 10, condition: "skinner" },
      { name: "Frost Venom Sac", dropRate: 6, condition: "extractor" }
    ],

    "Faded War Wraith": [
      { name: "Shadow Residue", dropRate: 9, condition: "harvester" },
      { name: "Spirit Core", dropRate: 8, condition: "extractor" }
    ],

    "Winter Guardian": [
      { name: "Guardian Iceplate", dropRate: 70 },
      { name: "Frozen Bark Core", dropRate: 55 },
      { name: "Winter Ward Fragment", dropRate: 35 },
      { name: "Titan Core", dropRate: 15 }
    ],
    "Wavebreaker Idol": [{ name: "Titan Core", dropRate: 7, condition: "extractor" }]
  };

  Object.keys(resourceDropTable).forEach((monsterName) => {
    const additions = resourceDropTable[monsterName];
    if (!GAME_CONFIG.monsterDropTables[monsterName]) {
      GAME_CONFIG.monsterDropTables[monsterName] = { materials: [] };
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

  const defaultGoldByRarity =
    GAME_CONFIG.lootDropSettings &&
    typeof GAME_CONFIG.lootDropSettings.defaultGoldByRarity === "object" &&
    GAME_CONFIG.lootDropSettings.defaultGoldByRarity
      ? GAME_CONFIG.lootDropSettings.defaultGoldByRarity
      : {};
  const enemies = Array.isArray(GAME_CONFIG.enemies) ? GAME_CONFIG.enemies : [];
  enemies.forEach((enemy) => {
    if (!enemy || typeof enemy.name !== "string") return;
    if (!GAME_CONFIG.monsterDropTables[enemy.name]) {
      GAME_CONFIG.monsterDropTables[enemy.name] = { materials: [] };
    }
    const table = GAME_CONFIG.monsterDropTables[enemy.name];
    if (!Array.isArray(table.materials)) table.materials = [];
    if (table.gold != null) return;
    const rarity =
      typeof enemy.spawnRarity === "string" && enemy.spawnRarity.trim()
        ? enemy.spawnRarity.trim().toLowerCase()
        : "common";
    table.gold = defaultGoldByRarity[rarity] || defaultGoldByRarity.common || { min: 10, max: 20 };
  });
})();
