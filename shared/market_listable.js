/**
 * Market sell eligibility (client + server).
 */
(function (root) {
  function collectEquippedNames(player) {
    return new Set(collectEquippedCounts(player).keys());
  }

  /** Instance string -> how many copies are worn (hero + companions). */
  function collectEquippedCounts(player) {
    const counts = new Map();
    const add = (v) => {
      if (typeof v !== "string") return;
      const s = v.trim();
      if (!s) return;
      counts.set(s, (counts.get(s) || 0) + 1);
    };
    const eq = player?.equipment;
    if (eq && typeof eq === "object") {
      Object.values(eq).forEach(add);
    }
    if (Array.isArray(player?.companions)) {
      player.companions.forEach((c) => {
        if (!c?.equipment) return;
        Object.values(c.equipment).forEach(add);
      });
    }
    return counts;
  }

  function reserveEquippedCopy(entry, equippedCounts, reservedEquipped) {
    const s = typeof entry === "string" ? entry.trim() : "";
    if (!s) return false;
    const eq = equippedCounts.get(s) || 0;
    const used = reservedEquipped.get(s) || 0;
    if (used >= eq) return false;
    reservedEquipped.set(s, used + 1);
    return true;
  }

  /**
   * @param {object} player
   * @param {object} deps - { getItemBaseName, getMarketItemMeta, stackSizes }
   */
  function getMarketListableInventory(player, deps) {
    const getItemBaseName = deps?.getItemBaseName;
    const getMarketItemMeta = deps?.getMarketItemMeta;
    const stackSizes = Array.isArray(deps?.stackSizes) ? deps.stackSizes : [1, 10, 100];
    if (typeof getItemBaseName !== "function" || typeof getMarketItemMeta !== "function") return [];

    const inv = Array.isArray(player?.inventory) ? player.inventory : [];
    const equippedCounts = collectEquippedCounts(player);
    const reservedEquipped = new Map();
    const groups = new Map();

    inv.forEach((entry) => {
      if (!entry) return;
      const meta = getMarketItemMeta(entry);
      if (!meta) return;
      if (!meta.stackable && reserveEquippedCopy(entry, equippedCounts, reservedEquipped)) return;
      const key = meta.stackable ? getItemBaseName(entry) : entry;
      const g = groups.get(key) || {
        itemName: entry,
        baseName: getItemBaseName(entry),
        displayName: meta.displayName,
        category: meta.category,
        subcategory: meta.subcategory,
        stackable: meta.stackable,
        count: 0,
        stackOptions: meta.stackable
          ? stackSizes.map((n) => ({ qty: n, available: false }))
          : [{ qty: 1, available: true }]
      };
      g.count += 1;
      groups.set(key, g);
    });

    return [...groups.values()].map((g) => {
      if (g.stackable) {
        g.stackOptions = stackSizes.map((n) => ({ qty: n, available: g.count >= n }));
      } else {
        g.stackOptions = [{ qty: 1, available: g.count >= 1 }];
      }
      return g;
    });
  }

  const api = Object.freeze({
    collectEquippedNames,
    collectEquippedCounts,
    getMarketListableInventory
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.MarketListable = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
