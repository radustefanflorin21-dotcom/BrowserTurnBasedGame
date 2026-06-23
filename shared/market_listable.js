/**
 * Market sell eligibility (client + server).
 */
(function (root) {
  function collectEquippedNames(player) {
    const equipped = new Set();
    const eq = player?.equipment;
    if (eq && typeof eq === "object") {
      Object.values(eq).forEach((v) => {
        if (typeof v === "string" && v.trim()) equipped.add(v.trim());
      });
    }
    if (Array.isArray(player?.companions)) {
      player.companions.forEach((c) => {
        if (!c?.equipment) return;
        Object.values(c.equipment).forEach((v) => {
          if (typeof v === "string" && v.trim()) equipped.add(v.trim());
        });
      });
    }
    return equipped;
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
    const equipped = collectEquippedNames(player);
    const groups = new Map();

    inv.forEach((entry) => {
      if (!entry || equipped.has(entry)) return;
      const meta = getMarketItemMeta(entry);
      if (!meta) return;
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
    getMarketListableInventory
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.MarketListable = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
