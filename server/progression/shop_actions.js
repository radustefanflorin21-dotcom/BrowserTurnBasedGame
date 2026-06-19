/**
 * Server-authoritative NPC vendor purchases.
 */

import { loadGameConfig } from "../load_game_config.js";
import { resolveItemDef } from "./item_helpers.js";

function getVendorsRaw() {
  const cfg = loadGameConfig();
  return cfg?.vendors && typeof cfg.vendors === "object" ? cfg.vendors : {};
}

export function getVendorDef(vendorId) {
  const id = String(vendorId || "").trim();
  if (!id) return null;
  const raw = getVendorsRaw()[id];
  if (!raw || typeof raw !== "object") return null;
  const items = Array.isArray(raw.items)
    ? raw.items
        .map((entry) => {
          const item = entry && typeof entry.item === "string" ? entry.item.trim() : "";
          const price =
            entry && typeof entry.price === "number" && Number.isFinite(entry.price)
              ? Math.max(0, Math.floor(entry.price))
              : null;
          if (!item || price == null) return null;
          if (!resolveItemDef(item)) return null;
          return { item, price };
        })
        .filter(Boolean)
    : [];
  if (!items.length) return null;
  return {
    id,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : id,
    greeting: typeof raw.greeting === "string" ? raw.greeting.trim() : "",
    items
  };
}

/**
 * @param {string|null} vendorId — when set, return only that vendor (or empty if unknown)
 */
export function getVendorCatalog(vendorId = null) {
  const filterId = vendorId != null ? String(vendorId).trim() : "";
  if (filterId) {
    const def = getVendorDef(filterId);
    return def ? [def] : [];
  }
  return Object.keys(getVendorsRaw())
    .map((id) => getVendorDef(id))
    .filter(Boolean);
}

export function applyShopBuy(player, { vendorId, itemName, quantity = 1 }) {
  const vendor = getVendorDef(vendorId);
  if (!vendor) {
    const err = new Error("Unknown vendor.");
    err.status = 404;
    throw err;
  }
  const name = String(itemName || "").trim();
  if (!name) {
    const err = new Error("itemName required.");
    err.status = 400;
    throw err;
  }
  const listing = vendor.items.find((e) => e.item === name);
  if (!listing) {
    const err = new Error("This vendor does not sell that item.");
    err.status = 400;
    throw err;
  }
  const def = resolveItemDef(name);
  if (!def) {
    const err = new Error("Unknown item.");
    err.status = 400;
    throw err;
  }
  const qty = Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)));
  const totalCost = listing.price * qty;
  const gold = typeof player.gold === "number" && Number.isFinite(player.gold) ? Math.max(0, Math.floor(player.gold)) : 0;
  if (gold < totalCost) {
    const err = new Error(`Not enough gold (need ${totalCost}, have ${gold}).`);
    err.status = 400;
    throw err;
  }
  if (!Array.isArray(player.inventory)) player.inventory = [];
  player.gold = gold - totalCost;
  for (let i = 0; i < qty; i++) player.inventory.push(name);
  return {
    vendorId: vendor.id,
    itemName: name,
    quantity: qty,
    unitPrice: listing.price,
    goldSpent: totalCost,
    gold: player.gold
  };
}
