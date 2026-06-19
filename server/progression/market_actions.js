/**
 * Server-authoritative player market (listings, buy, cancel, expiry).
 */

import { db } from "../db.js";
import {
  getItemBaseName,
  resolveItemDef
} from "./item_helpers.js";
import {
  MARKET_MAX_LISTINGS,
  MARKET_LISTING_DAYS,
  MARKET_STACK_SIZES,
  calcCancelFee,
  calcListingFee,
  getMarketItemMeta,
  listingMatchesSearch
} from "./market_catalog.js";
import {
  formatBoughtMail,
  formatExpiredMail,
  formatSoldMail,
  insertPlayerMail
} from "./player_mail.js";
import { loadPlayerForSlot, parseRoster, savePlayerForSlot } from "./roster_ops.js";

function listingExpiresSqlOffset() {
  return `+${MARKET_LISTING_DAYS} days`;
}

function rowToListing(row) {
  if (!row) return null;
  let items = [];
  try {
    items = JSON.parse(row.items_json);
  } catch {
    items = [];
  }
  if (!Array.isArray(items)) items = [];
  return {
    id: row.id,
    sellerUserId: row.seller_user_id,
    sellerSlotIndex: row.seller_slot_index,
    sellerName: row.seller_name,
    itemDisplayName: row.item_display_name,
    items,
    quantity: row.quantity,
    price: row.price,
    category: row.category,
    subcategory: row.subcategory,
    searchText: row.search_text,
    createdAt: row.created_at,
    expiresAt: row.expires_at
  };
}

function getListingById(listingId) {
  const id = Number(listingId);
  if (!Number.isFinite(id)) return null;
  const row = db
    .prepare(`SELECT * FROM market_listings WHERE id = ? AND expires_at > datetime('now')`)
    .get(id);
  return rowToListing(row);
}

function countActiveListings(userId, slotIndex) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM market_listings
       WHERE seller_user_id = ? AND seller_slot_index = ? AND expires_at > datetime('now')`
    )
    .get(userId, slotIndex);
  return row && typeof row.c === "number" ? row.c : 0;
}

function collectStackFromInventory(inventory, itemName, quantity) {
  const inv = Array.isArray(inventory) ? inventory : [];
  const meta = getMarketItemMeta(itemName);
  if (!meta) {
    const err = new Error("Unknown item.");
    err.status = 400;
    throw err;
  }
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  if (meta.stackable) {
    if (!MARKET_STACK_SIZES.includes(qty)) {
      const err = new Error("Invalid stack size.");
      err.status = 400;
      throw err;
    }
    const base = getItemBaseName(itemName);
    const picked = [];
    const remaining = inv.slice();
    for (let i = remaining.length - 1; i >= 0 && picked.length < qty; i--) {
      if (getItemBaseName(remaining[i]) === base) {
        picked.push(remaining[i]);
        remaining.splice(i, 1);
      }
    }
    if (picked.length < qty) {
      const err = new Error(`You need at least ${qty} of that item.`);
      err.status = 400;
      throw err;
    }
    return { picked: picked.reverse(), inventory: remaining, meta };
  }
  if (qty !== 1) {
    const err = new Error("This item can only be sold one at a time.");
    err.status = 400;
    throw err;
  }
  const idx = inv.indexOf(itemName);
  if (idx === -1) {
    const err = new Error("Item not in inventory.");
    err.status = 400;
    throw err;
  }
  const remaining = inv.slice();
  const picked = [remaining[idx]];
  remaining.splice(idx, 1);
  return { picked, inventory: remaining, meta };
}

function addItemsToInventory(inventory, items) {
  const inv = Array.isArray(inventory) ? inventory.slice() : [];
  (Array.isArray(items) ? items : []).forEach((it) => {
    if (typeof it === "string" && it.trim()) inv.push(it);
  });
  return inv;
}

function creditSellerFromListing(listing) {
  const { roster, player, slotIndex } = loadPlayerForSlot(listing.sellerUserId, listing.sellerSlotIndex);
  player.gold = (typeof player.gold === "number" ? Math.floor(player.gold) : 0) + listing.price;
  return savePlayerForSlot(listing.sellerUserId, roster, slotIndex, player);
}

function returnListingToSeller(listing) {
  const { roster, player, slotIndex } = loadPlayerForSlot(listing.sellerUserId, listing.sellerSlotIndex);
  player.inventory = addItemsToInventory(player.inventory, listing.items);
  savePlayerForSlot(listing.sellerUserId, roster, slotIndex, player);
  insertPlayerMail(listing.sellerUserId, formatExpiredMail(listing.itemDisplayName));
}

function deleteListingRow(listingId) {
  db.prepare(`DELETE FROM market_listings WHERE id = ?`).run(listingId);
}

export function processExpiredListingsForUser(userId, slotIndex = null) {
  const uid = Number(userId);
  let rows;
  if (slotIndex != null && Number.isFinite(Number(slotIndex))) {
    rows = db
      .prepare(
        `SELECT * FROM market_listings
         WHERE seller_user_id = ? AND seller_slot_index = ? AND expires_at <= datetime('now')`
      )
      .all(uid, Math.floor(slotIndex));
  } else {
    rows = db
      .prepare(`SELECT * FROM market_listings WHERE seller_user_id = ? AND expires_at <= datetime('now')`)
      .all(uid);
  }
  rows.forEach((row) => {
    const listing = rowToListing(row);
    if (!listing) return;
    try {
      returnListingToSeller(listing);
    } catch (err) {
      console.error("market expiry return failed:", err);
    }
    deleteListingRow(listing.id);
  });
}

export function processAllExpiredListings() {
  const rows = db.prepare(`SELECT * FROM market_listings WHERE expires_at <= datetime('now')`).all();
  rows.forEach((row) => {
    const listing = rowToListing(row);
    if (!listing) return;
    try {
      returnListingToSeller(listing);
    } catch (err) {
      console.error("market expiry return failed:", err);
    }
    deleteListingRow(listing.id);
  });
}

export function getMarketBrowseListings(query = {}, viewerUserId = null) {
  processAllExpiredListings();
  const category = typeof query.category === "string" ? query.category.trim().toLowerCase() : "";
  const subcategory = typeof query.subcategory === "string" ? query.subcategory.trim().toLowerCase() : "";
  const search = typeof query.search === "string" ? query.search.trim() : "";
  const rows = db
    .prepare(
      `SELECT * FROM market_listings WHERE expires_at > datetime('now') ORDER BY created_at DESC LIMIT 500`
    )
    .all();
  return rows
    .map(rowToListing)
    .filter((listing) => {
      if (!listing) return false;
      if (category && listing.category !== category) return false;
      if (subcategory && listing.subcategory !== subcategory) return false;
      if (!listingMatchesSearch(listing, search)) return false;
      return true;
    })
    .map((listing) => ({
      id: listing.id,
      itemDisplayName: listing.itemDisplayName,
      tooltipItemName:
        Array.isArray(listing.items) && listing.items[0] ? listing.items[0] : listing.itemDisplayName,
      quantity: listing.quantity,
      price: listing.price,
      category: listing.category,
      subcategory: listing.subcategory,
      expiresAt: listing.expiresAt,
      isOwn: viewerUserId != null && listing.sellerUserId === viewerUserId
    }));
}

export function getMyMarketListings(userId, slotIndex) {
  processExpiredListingsForUser(userId, slotIndex);
  const rows = db
    .prepare(
      `SELECT * FROM market_listings
       WHERE seller_user_id = ? AND seller_slot_index = ? AND expires_at > datetime('now')
       ORDER BY created_at DESC`
    )
    .all(userId, slotIndex);
  return rows.map(rowToListing).filter(Boolean);
}

export function getMarketListableInventory(player) {
  const inv = Array.isArray(player?.inventory) ? player.inventory : [];
  const equipped = new Set();
  const eq = player?.equipment;
  if (eq && typeof eq === "object") {
    Object.values(eq).forEach((v) => {
      if (typeof v === "string" && v.trim()) equipped.add(v);
    });
  }
  if (Array.isArray(player?.companions)) {
    player.companions.forEach((c) => {
      if (!c?.equipment) return;
      Object.values(c.equipment).forEach((v) => {
        if (typeof v === "string" && v.trim()) equipped.add(v);
      });
    });
  }
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
      stackOptions: meta.stackable ? MARKET_STACK_SIZES.map((n) => ({ qty: n, available: false })) : [{ qty: 1, available: true }]
    };
    g.count += 1;
    groups.set(key, g);
  });
  return [...groups.values()].map((g) => {
    if (g.stackable) {
      g.stackOptions = MARKET_STACK_SIZES.map((n) => ({ qty: n, available: g.count >= n }));
    } else {
      g.stackOptions = [{ qty: 1, available: g.count >= 1 }];
    }
    return g;
  });
}

export function applyMarketList(userId, player, slotIndex, { itemName, quantity, price }) {
  const name = typeof itemName === "string" ? itemName.trim() : "";
  const listPrice = Math.max(1, Math.floor(Number(price) || 0));
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  if (!name) {
    const err = new Error("itemName required.");
    err.status = 400;
    throw err;
  }

  processExpiredListingsForUser(userId, slotIndex);
  if (countActiveListings(userId, slotIndex) >= MARKET_MAX_LISTINGS) {
    const err = new Error(`You can have at most ${MARKET_MAX_LISTINGS} active listings.`);
    err.status = 400;
    throw err;
  }

  const fee = calcListingFee(listPrice);
  const gold = typeof player.gold === "number" ? Math.floor(player.gold) : 0;
  if (gold < fee) {
    const err = new Error(`Listing fee is ${fee} gold (you have ${gold}).`);
    err.status = 400;
    throw err;
  }

  const { picked, inventory, meta } = collectStackFromInventory(player.inventory, name, qty);
  player.inventory = inventory;
  player.gold = gold - fee;

  const sellerName =
    typeof player.name === "string" && player.name.trim() ? player.name.trim() : "Hero";
  const displayLabel =
    qty > 1 ? `${qty}× ${getItemBaseName(picked[0] || name)}` : picked[0] || name;

  const info = db
    .prepare(
      `INSERT INTO market_listings (
        seller_user_id, seller_slot_index, seller_name, item_display_name,
        items_json, quantity, price, category, subcategory, search_text,
        created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now', ?))`
    )
    .run(
      userId,
      slotIndex,
      sellerName,
      displayLabel,
      JSON.stringify(picked),
      qty,
      listPrice,
      meta.category,
      meta.subcategory,
      meta.searchText,
      listingExpiresSqlOffset()
    );

  return {
    listingId: info.lastInsertRowid,
    itemDisplayName: displayLabel,
    quantity: qty,
    price: listPrice,
    listingFee: fee,
    gold: player.gold
  };
}

export function applyMarketCancel(userId, player, slotIndex, listingId) {
  processExpiredListingsForUser(userId, slotIndex);
  const listing = getListingById(listingId);
  if (!listing) {
    const err = new Error("Listing not found.");
    err.status = 404;
    throw err;
  }
  if (listing.sellerUserId !== userId || listing.sellerSlotIndex !== slotIndex) {
    const err = new Error("That is not your listing.");
    err.status = 403;
    throw err;
  }

  const fee = calcCancelFee(listing.price);
  const gold = typeof player.gold === "number" ? Math.floor(player.gold) : 0;
  if (gold < fee) {
    const err = new Error(`Cancel fee is ${fee} gold (you have ${gold}).`);
    err.status = 400;
    throw err;
  }

  player.gold = gold - fee;
  player.inventory = addItemsToInventory(player.inventory, listing.items);
  deleteListingRow(listing.id);

  return {
    listingId: listing.id,
    cancelFee: fee,
    gold: player.gold,
    itemDisplayName: listing.itemDisplayName
  };
}

export function applyMarketBuy(buyerUserId, buyerPlayer, buyerSlotIndex, listingId) {
  processAllExpiredListings();
  const listing = getListingById(listingId);
  if (!listing) {
    const err = new Error("Listing not found or expired.");
    err.status = 404;
    throw err;
  }
  if (listing.sellerUserId === buyerUserId) {
    const err = new Error("You cannot buy your own listing.");
    err.status = 400;
    throw err;
  }

  const buyerGold = typeof buyerPlayer.gold === "number" ? Math.floor(buyerPlayer.gold) : 0;
  if (buyerGold < listing.price) {
    const err = new Error(`Not enough gold (need ${listing.price}, have ${buyerGold}).`);
    err.status = 400;
    throw err;
  }

  buyerPlayer.gold = buyerGold - listing.price;
  buyerPlayer.inventory = addItemsToInventory(buyerPlayer.inventory, listing.items);
  deleteListingRow(listing.id);

  creditSellerFromListing(listing);
  insertPlayerMail(listing.sellerUserId, formatSoldMail(listing.itemDisplayName, listing.price));
  insertPlayerMail(buyerUserId, formatBoughtMail(listing.itemDisplayName, listing.price));

  return {
    listingId: listing.id,
    itemDisplayName: listing.itemDisplayName,
    quantity: listing.quantity,
    price: listing.price,
    gold: buyerPlayer.gold
  };
}

export function getMarketFilterOptions() {
  processAllExpiredListings();
  const rows = db
    .prepare(
      `SELECT DISTINCT category, subcategory FROM market_listings WHERE expires_at > datetime('now')`
    )
    .all();
  const categories = new Set();
  const subcategoriesByCategory = {};
  rows.forEach((row) => {
    if (!row?.category) return;
    categories.add(row.category);
    if (!subcategoriesByCategory[row.category]) subcategoriesByCategory[row.category] = new Set();
    if (row.subcategory) subcategoriesByCategory[row.category].add(row.subcategory);
  });
  const out = {};
  Object.keys(subcategoriesByCategory).forEach((cat) => {
    out[cat] = [...subcategoriesByCategory[cat]].sort();
  });
  return {
    categories: [...categories].sort(),
    subcategoriesByCategory: out
  };
}
