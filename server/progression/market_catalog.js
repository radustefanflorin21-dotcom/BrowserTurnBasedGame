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
  const base = getItemBaseName(itemName);
  const display = typeof itemName === "string" ? itemName.trim() : "";
  return `${base} ${display}`.trim().toLowerCase();
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
    displayName: itemName
  };
}

export function listingMatchesSearch(listing, query) {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  if (!q) return true;
  const parts = q.split(/\s+/).filter(Boolean);
  const hay = String(listing.search_text || listing.searchText || "").toLowerCase();
  return parts.every((part) => hay.includes(part));
}
