/**
 * Pet and egg item defs merged into GAME_CONFIG after config.js loads.
 */
(function () {
  if (typeof GAME_CONFIG === "undefined" || !GAME_CONFIG) return;
  if (!GAME_CONFIG.items || typeof GAME_CONFIG.items !== "object") GAME_CONFIG.items = {};

  const petImage = (slug) => `Assets/Pets/${slug}_young.png`;

  const pets = [
    ["Ember Salamander", "ember_salamander", "An INT-focused salamander hatched from a Fire Egg."],
    ["Cinder Moth", "cinder_moth", "A mage-leaning moth companion from a Fire Egg."],
    ["Flameglass Viper", "flameglass_viper", "A controller viper from a Fire Egg."],
    ["Rift Emberling", "rift_emberling", "A support-leaning ember spirit from a Fire Egg."],
    ["Ironroot Raptor", "ironroot_raptor", "A STR raptor hatched from an Earth Egg."],
    ["Granite Boar", "granite_boar", "A bruiser boar from an Earth Egg."],
    ["Rustjaw Hound", "rustjaw_hound", "A physical pressure hound from an Earth Egg."],
    ["Stoneback Auroch", "stoneback_auroch", "A defensive auroch from an Earth Egg."],
    ["Mossheart Stag", "mossheart_stag", "A VIT stag hatched from a Nature Egg."],
    ["Barkscale Tortoise", "barkscale_tortoise", "A tank tortoise from a Nature Egg."],
    ["Verdant Lynx", "verdant_lynx", "A survival lynx from a Nature Egg."],
    ["Heartbloom Wisp", "heartbloom_wisp", "A support wisp from a Nature Egg."],
    ["Tideglass Otter", "tideglass_otter", "A DEX otter hatched from a Water Egg."],
    ["Frost Mink", "frost_mink", "An assassin mink from a Water Egg."],
    ["Ripplewing Heron", "ripplewing_heron", "A skirmisher heron from a Water Egg."],
    ["Glassfin Serpent", "glassfin_serpent", "A controller serpent from a Water Egg."]
  ];

  pets.forEach(([name, slug, desc]) => {
    GAME_CONFIG.items[name] = {
      type: "pet",
      slot: "pet",
      equipCategory: "pet",
      itemLevel: 1,
      image: petImage(slug),
      description: desc,
      bonusSkills: [],
      bonusStats: {}
    };
  });

  const eggs = [
    ["Fire Egg", "fire", "Hatches a random Fire-element pet. Double-click to use."],
    ["Earth Egg", "earth", "Hatches a random Earth-element pet. Double-click to use."],
    ["Nature Egg", "nature", "Hatches a random Nature-element pet. Double-click to use."],
    ["Water Egg", "water", "Hatches a random Water-element pet. Double-click to use."]
  ];

  eggs.forEach(([name, element, desc]) => {
    GAME_CONFIG.items[name] = {
      type: "consumable",
      effect: "hatch_pet_egg",
      eggElement: element,
      image: "Assets/Resources/energy-cell.svg",
      description: desc,
      bonusSkills: [],
      bonusStats: {},
      useHint: "Double-click to hatch a random pet."
    };
  });

  delete GAME_CONFIG.items["Frost Cub"];
})();
