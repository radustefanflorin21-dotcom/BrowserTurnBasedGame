/**
 * Pet instances, feeding, stat scaling, and UI helpers (client + server).
 */
(function (root) {
  const prog = () => root.PET_PROGRESSION;
  const catalog = () => root.PETS_CATALOG;

  function splitInstance(name) {
    const raw = typeof name === "string" ? name : "";
    if (!raw) return { baseName: "", instanceId: "", suffix: "" };
    const sep = raw.lastIndexOf("@@");
    if (sep <= 0) return { baseName: raw, instanceId: "", suffix: "" };
    const suffix = raw.slice(sep + 2);
    if (suffix.startsWith("pet:")) {
      return { baseName: raw.slice(0, sep), instanceId: suffix.slice(4), suffix };
    }
    return { baseName: raw.slice(0, sep), instanceId: "", suffix };
  }

  function isPetInstanceName(name) {
    return !!splitInstance(name).instanceId;
  }

  function makePetInstanceName(baseName, instanceId) {
    const base = String(baseName || "").trim();
    const id = String(instanceId || "").trim();
    if (!base || !id) return "";
    return `${base}@@pet:${id}`;
  }

  function newInstanceId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }

  function ensurePlayerPetState(player) {
    if (!player || typeof player !== "object") return;
    if (!player.petProgress || typeof player.petProgress !== "object") player.petProgress = {};
    if (!player.petFeed || typeof player.petFeed !== "object") {
      player.petFeed = { charges: 2, lastUpdatedMs: Date.now() };
    }
    const P = prog();
    if (P) {
      player.petFeed = P.reconcileFeedCharges(player.petFeed, Date.now());
      if (player.petFeed.pending) delete player.petFeed.pending;
    }
  }

  function getPetProgress(player, instanceName) {
    if (!player || typeof player !== "object") return { level: 1, xp: 0 };
    ensurePlayerPetState(player);
    const { instanceId } = splitInstance(instanceName);
    if (!instanceId) return { level: 1, xp: 0 };
    const rec = player.petProgress[instanceId];
    if (!rec || typeof rec !== "object") return { level: 1, xp: 0 };
    const P = prog();
    if (!P) return { level: 1, xp: 0 };
    const total = P.totalXpForLevel(typeof rec.level === "number" ? rec.level : 1) + (typeof rec.xp === "number" ? rec.xp : 0);
    const parsed = P.levelFromTotalXp(total);
    return { level: parsed.level, xp: parsed.xpIntoLevel };
  }

  function setPetProgressFromLevelXp(player, instanceName, level, xp) {
    ensurePlayerPetState(player);
    const { instanceId } = splitInstance(instanceName);
    if (!instanceId) return;
    const P = prog();
    if (!P) return;
    const lv = P.clampLevel(level);
    const xpInto = Math.max(0, Math.floor(xp || 0));
    player.petProgress[instanceId] = { level: lv, xp: lv >= P.PET_MAX_LEVEL ? 0 : xpInto };
  }

  function grantPetToInventory(player, baseName) {
    const cat = catalog();
    if (!cat || !cat.getPetCatalogEntry(baseName)) return null;
    ensurePlayerPetState(player);
    const id = newInstanceId();
    const instance = makePetInstanceName(baseName, id);
    if (!Array.isArray(player.inventory)) player.inventory = [];
    player.inventory.push(instance);
    player.petProgress[id] = { level: 1, xp: 0 };
    return instance;
  }

  function isPetItemDef(def) {
    return !!(def && def.type === "pet");
  }

  function classifyFood(baseName, petBaseName) {
    const cat = catalog();
    const entry = cat && cat.getPetCatalogEntry(petBaseName);
    if (!entry) return null;
    const name = String(baseName || "").trim();
    if (!name) return null;
    if (Array.isArray(entry.favoriteFood) && entry.favoriteFood.includes(name)) return "favorite";
    const basics =
      cat.getBasicFoodForElement && entry.element
        ? cat.getBasicFoodForElement(entry.element)
        : entry.basicFood;
    if (Array.isArray(basics) && basics.includes(name)) return "basic";
    return null;
  }

  function getPetImage(petBaseName, level) {
    const cat = catalog();
    const entry = cat && cat.getPetCatalogEntry(petBaseName);
    if (!entry || !entry.images) return "Assets/Resources/energy-cell.svg";
    const P = prog();
    const stage = P ? P.getVisualStage(level) : "young";
    return entry.images[stage] || entry.images.young || "Assets/Resources/energy-cell.svg";
  }

  function scaleStatAtLevel(valueAt30, level, statKey) {
    const P = prog();
    const lv = P ? P.clampLevel(level) : 1;
    const v = Number(valueAt30) || 0;
    if (!v) return 0;
    const raw = (v * lv) / 30;
    const key = String(statKey || "").trim().toUpperCase();
    if (key === "HP") return Math.max(0, Math.round(raw / 10) * 10);
    return Math.max(0, Math.floor(raw));
  }

  function getPetBonusStats(petBaseName, level) {
    const cat = catalog();
    const entry = cat && cat.getPetCatalogEntry(petBaseName);
    const out = {};
    if (!entry || !entry.statsAt30 || typeof entry.statsAt30 !== "object") return out;
    Object.entries(entry.statsAt30).forEach(([k, v]) => {
      const scaled = scaleStatAtLevel(v, level, k);
      if (scaled) out[k] = scaled;
    });
    return out;
  }

  function hatchPetFromEgg(player, eggItemName) {
    const eggs = root.PET_EGG_DROPS;
    const cat = catalog();
    if (!eggs || !cat) return { ok: false, message: "Pet system unavailable." };
    const base = String(eggItemName || "").split("@@")[0].trim();
    const element = eggs.EGG_ITEM_TO_ELEMENT[base];
    if (!element) return { ok: false, message: "That is not a pet egg." };
    const petBase = eggs.pickRandomPetForElement(element);
    if (!petBase) return { ok: false, message: "No pets available for this egg." };
    const instance = grantPetToInventory(player, petBase);
    if (!instance) return { ok: false, message: "Could not hatch pet." };
    const entry = cat.getPetCatalogEntry(petBase);
    const display = (entry && entry.displayName) || petBase;
    return { ok: true, petBase, instance, message: `A ${display} hatched from the egg!` };
  }

  function formatDurationMs(ms) {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function getPetDisplayName(petBase) {
    const entry = catalog() && catalog().getPetCatalogEntry(petBase);
    return (entry && entry.displayName) || petBase;
  }

  function pickFeedPhrase(templates) {
    if (!templates || !templates.length) return "";
    return templates[Math.floor(Math.random() * templates.length)];
  }

  function buildPetRefusalMessage(petBase, resourceBase) {
    const pet = getPetDisplayName(petBase);
    return pickFeedPhrase([
      `${pet} sniffs ${resourceBase} and turns away. It doesn't seem to like that.`,
      `${pet} paws at ${resourceBase}, then pushes it aside. It doesn't seem interested.`,
      `${pet} gives ${resourceBase} a wary look and refuses to eat.`,
      `${pet} recoils from ${resourceBase}. It clearly isn't food for this one.`
    ]);
  }

  function buildPetFeedCompleteMessage(petBase, resourceBase, foodType, leveled, level) {
    const pet = getPetDisplayName(petBase);
    if (leveled) {
      return pickFeedPhrase([
        `${pet} finishes ${resourceBase} and seems to grow stronger! Now level ${level}.`,
        `Sated by ${resourceBase}, ${pet} puffs up with new energy — level ${level}!`,
        `${pet} licks the last crumbs of ${resourceBase} and looks noticeably sturdier. Level ${level}!`
      ]);
    }
    if (foodType === "favorite") {
      return pickFeedPhrase([
        `${pet} savors every bite of ${resourceBase} and looks thoroughly pleased.`,
        `${pet} purrs contentedly after devouring ${resourceBase}.`,
        `${pet} curls up, happily stuffed on ${resourceBase}.`
      ]);
    }
    return pickFeedPhrase([
      `${pet} finishes ${resourceBase} with a satisfied rumble.`,
      `${pet} polishes off ${resourceBase} and seems a little stronger.`,
      `${pet} wags its tail after eating ${resourceBase}.`
    ]);
  }

  function buildPetTooltipHtml(instanceName, player) {
    const { baseName } = splitInstance(instanceName);
    const cat = catalog();
    const entry = cat && cat.getPetCatalogEntry(baseName);
    const P = prog();
    if (!entry || !P) return `<p>Pet</p>`;
    ensurePlayerPetState(player);
    const { level, xp } = getPetProgress(player, instanceName);
    const need = P.xpRequiredForLevel(level);
    const stage = P.getVisualStageLabel(P.getVisualStage(level));
    const feed = player.petFeed;
    const charges = feed.charges;
    const nextMs = P.msUntilNextFeedCharge(feed, Date.now());
    const stats = getPetBonusStats(baseName, level);
    const statLines = Object.entries(stats)
      .map(([k, v]) => {
        const pct =
          /%$/.test(k) ||
          /(Damage|Resist|Crit|Accuracy|Evasion|Healing)/i.test(k);
        return `<div class="pet-tip-stat"><span>${k}</span><span>+${v}${pct ? "%" : ""}</span></div>`;
      })
      .join("");
    const fav = (entry.favoriteFood || []).slice(0, 8).join(", ") || "—";
    const basic = (entry.basicFood || []).slice(0, 8).join(", ") || "—";
    const elementLabel = entry.element ? entry.element.charAt(0).toUpperCase() + entry.element.slice(1) : "";
    const maxed = level >= P.PET_MAX_LEVEL;
    return `<div class="pet-tooltip">
      <h4 class="pet-tip-name">${entry.displayName || baseName}</h4>
      <p class="pet-tip-meta">Level ${level}${maxed ? " (max)" : ""} · ${stage}${elementLabel ? ` · ${elementLabel}` : ""}</p>
      <p class="pet-tip-xp">${maxed ? "Max level" : `XP ${xp} / ${need}`}</p>
      <p class="pet-tip-feed">Feed charges: ${charges} / ${P.FEED_CHARGE_CAP}${nextMs > 0 ? ` · Next +1 in ${formatDurationMs(nextMs)}` : ""}</p>
      <div class="pet-tip-stats">${statLines || "<p class=\"pet-tip-muted\">No bonuses yet</p>"}</div>
      <p class="pet-tip-food"><strong>Favorites:</strong> ${fav}</p>
      <p class="pet-tip-food pet-tip-muted"><strong>Also eats:</strong> ${basic}</p>
      <p class="pet-tip-hint">Drag resources onto the equipped pet to feed.</p>
    </div>`;
  }

  function applyPetXp(player, instanceName, xpGain) {
    const P = prog();
    if (!P) return { leveled: false, levelsGained: 0 };
    const cur = getPetProgress(player, instanceName);
    if (cur.level >= P.PET_MAX_LEVEL) return { leveled: false, levelsGained: 0 };
    let total = P.totalXpForLevel(cur.level) + cur.xp + Math.max(0, Math.floor(xpGain || 0));
    const cap = P.totalXpForLevel(P.PET_MAX_LEVEL);
    if (total > cap) total = cap;
    const parsed = P.levelFromTotalXp(total);
    setPetProgressFromLevelXp(player, instanceName, parsed.level, parsed.xpIntoLevel);
    return { leveled: parsed.level > cur.level, levelsGained: parsed.level - cur.level, level: parsed.level };
  }

  /**
   * Feed equipped pet with one resource. Consumes one feed charge and grants XP immediately.
   * @returns {{ ok: boolean, message?: string, completed?: boolean, leveled?: boolean }}
   */
  function addFeedResource(player, petInstanceName, resourceInstanceName, removeFromInventoryFn) {
    const P = prog();
    const cat = catalog();
    if (!P || !cat) return { ok: false, message: "Pet system unavailable." };
    ensurePlayerPetState(player);
    if (!isPetInstanceName(petInstanceName)) return { ok: false, message: "Invalid pet." };

    const { baseName: petBase } = splitInstance(petInstanceName);
    const resourceBase =
      typeof removeFromInventoryFn === "function" && typeof resourceInstanceName === "string"
        ? splitInstance(resourceInstanceName).baseName || resourceInstanceName.split("@@")[0]
        : String(resourceInstanceName || "").split("@@")[0];

    const { level } = getPetProgress(player, petInstanceName);
    if (level >= P.PET_MAX_LEVEL) {
      return { ok: false, message: `${getPetDisplayName(petBase)} is already fully grown and won't eat more.` };
    }

    player.petFeed = P.reconcileFeedCharges(player.petFeed, Date.now());
    const foodType = classifyFood(resourceBase, petBase);
    if (!foodType) return { ok: false, message: buildPetRefusalMessage(petBase, resourceBase) };

    if (player.petFeed.charges <= 0) {
      const wait = P.msUntilNextFeedCharge(player.petFeed, Date.now());
      return { ok: false, message: `No feed charges. Next charge in ${formatDurationMs(wait)}.` };
    }

    if (typeof removeFromInventoryFn === "function") {
      const removed = removeFromInventoryFn(resourceInstanceName);
      if (!removed) return { ok: false, message: "Resource not in inventory." };
    }

    const consumed = P.consumeFeedCharge(player.petFeed, Date.now());
    if (!consumed) return { ok: false, message: "No feed charges available." };
    player.petFeed = consumed;

    const xpGain = foodType === "favorite" ? P.FAVORITE_FOOD_XP : P.BASIC_FOOD_XP;
    const result = applyPetXp(player, petInstanceName, xpGain);

    return {
      ok: true,
      completed: true,
      leveled: result.leveled,
      level: result.level,
      message: buildPetFeedCompleteMessage(petBase, resourceBase, foodType, result.leveled, result.level)
    };
  }

  const api = {
    splitInstance,
    isPetInstanceName,
    makePetInstanceName,
    newInstanceId,
    ensurePlayerPetState,
    getPetProgress,
    setPetProgressFromLevelXp,
    grantPetToInventory,
    isPetItemDef,
    classifyFood,
    getPetImage,
    getPetBonusStats,
    buildPetTooltipHtml,
    applyPetXp,
    addFeedResource,
    hatchPetFromEgg,
    formatDurationMs
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.PET_SYSTEM = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
