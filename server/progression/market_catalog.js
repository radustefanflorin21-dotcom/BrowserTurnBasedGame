/**
 * Market listing metadata derived from item definitions.
 */

import {
  getItemBaseName,
  getItemEquipCategory,
  isEquippableItemDef,
  resolveItemDef
} from "./item_helpers.js";

export const MARKET_MAX_LISTINGS = 20;
export const MARKET_LISTING_DAYS = 30;
export const MARKET_LISTING_FEE_RATE = 0.025;
export const MARKET_CANCEL_FEE_RATE = 0.01;
export const MARKET_STACK_SIZES = [1, 10, 100];
export const AUCTION_MANAGER_NAME = "Auction Manager";

export function calcListingFee(price) {
  const p = Math.max(0, Math.floor(Number(price) || 0));
  return Math.max(1, Math.ceil(p * MARKET_LISTING_FEE_RATE));
}

export function calcCancelFee(price) {
  const p = Math.max(0, Math.floor(Number(price) || 0));
  return Math.max(1, Math.ceil(p * MARKET_CANCEL_FEE_RATE));
}

export function isMarketStackableItem(def) {
  if (!def || typeof def !== "object") return false;
  if (isEquippableItemDef(def)) return false;
  const t = String(def.type || "").trim().toLowerCase();
  return t === "consumable" || t === "resource";
}

export function getMarketCategory(def) {
  if (!def) return "resource";
  if (isEquippableItemDef(def)) return "equip";
  const t = String(def.type || "").trim().toLowerCase();
  if (t === "consumable") return "consumable";
  if (t === "resource") return "resource";
  return "resource";
}

export function getMarketSubcategory(def) {
  if (!def) return "other";
  if (isEquippableItemDef(def)) {
    const cat = getItemEquipCategory(def);
    return cat || String(def.type || "equip").trim().toLowerCase() || "other";
  }
  const t = String(def.type || "").trim().toLowerCase();
  if (t === "consumable") {
    const effect = typeof def.effect === "string" ? def.effect.trim().toLowerCase() : "";
    return effect || "other";
  }
  if (t === "resource") {
    const cat = typeof def.category === "string" ? def.category.trim().toLowerCase() : "";
    return cat || "other";
  }
  return "other";
}

export function buildMarketSearchText(itemName) {
  const raw = typeof itemName === "string" ? itemName.trim() : "";
  const base = getItemBaseName(raw);
  const sep = raw.lastIndexOf("@@");
  const rarity = sep > 0 ? raw.slice(sep + 2).trim().toLowerCase() : "";
  const tokens = new Set();
  if (base) {
    tokens.add(base.toLowerCase());
    base
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .forEach((w) => tokens.add(w));
  }
  if (rarity) tokens.add(rarity);
  return [...tokens].join(" ");
}

export function listingMatchesSearch(listing, query) {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  if (!q) return true;
  const hay = String(listing.search_text || listing.searchText || "").toLowerCase();
  let displayRaw = String(listing.itemDisplayName || listing.item_display_name || "").trim();
  const stackMatch = displayRaw.match(/^(\d+)×\s*(.+)$/i);
  if (stackMatch) displayRaw = stackMatch[2];
  const baseOnly = getItemBaseName(displayRaw).toLowerCase();
  const combined = `${hay} ${baseOnly}`.trim();
  if (combined.includes(q)) return true;
  const parts = q.split(/\s+/).filter(Boolean);
  return parts.every((part) => combined.includes(part));
}

export function getMarketItemMeta(itemName) {
  const def = resolveItemDef(itemName);
  if (!def) return null;
  return {
    def,
    category: getMarketCategory(def),
    subcategory: getMarketSubcategory(def),
    stackable: isMarketStackableItem(def),
    searchText: buildMarketSearchText(itemName),
    displayName: getItemBaseName(itemName) || itemName
  };
}
