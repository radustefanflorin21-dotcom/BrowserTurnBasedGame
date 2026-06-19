import { requireAuth } from "./auth.js";
import { logEconomyEvent } from "./economy/audit.js";
import {
  applyMarketBuy,
  applyMarketCancel,
  applyMarketList,
  getMarketBrowseListings,
  getMarketFilterOptions,
  getMarketListableInventory,
  getMyMarketListings,
  processExpiredListingsForUser
} from "./progression/market_actions.js";
import { MARKET_MAX_LISTINGS } from "./progression/market_catalog.js";
import {
  getPlayerMail,
  getUnreadMailCount,
  markAllMailRead,
  markMailRead
} from "./progression/player_mail.js";
import {
  actionRosterResponse,
  loadPlayerForSlot,
  savePlayerForSlot
} from "./progression/roster_ops.js";

export function registerMarketRoutes(app) {
  app.get("/api/market/listings", requireAuth, (req, res) => {
    try {
      const listings = getMarketBrowseListings(
        {
          search: req.query?.search,
          category: req.query?.category,
          subcategory: req.query?.subcategory
        },
        req.user.id
      );
      const filters = getMarketFilterOptions();
      res.json({ listings, filters, maxListings: MARKET_MAX_LISTINGS });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Failed to load listings." });
    }
  });

  app.get("/api/market/my-listings", requireAuth, (req, res) => {
    try {
      const slotIndex = Number(req.query?.slotIndex);
      const { player, slotIndex: idx } = loadPlayerForSlot(req.user.id, slotIndex);
      const listings = getMyMarketListings(req.user.id, idx);
      const listable = getMarketListableInventory(player);
      res.json({
        listings: listings.map((l) => ({
          id: l.id,
          itemDisplayName: l.itemDisplayName,
          quantity: l.quantity,
          price: l.price,
          category: l.category,
          subcategory: l.subcategory,
          expiresAt: l.expiresAt
        })),
        listable,
        maxListings: MARKET_MAX_LISTINGS,
        activeCount: listings.length
      });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Failed to load your listings." });
    }
  });

  app.post("/api/market/list", requireAuth, (req, res) => {
    try {
      const slotIndex = Number(req.body?.slotIndex);
      const { roster, player, slotIndex: idx } = loadPlayerForSlot(req.user.id, slotIndex);
      const result = applyMarketList(req.user.id, player, idx, {
        itemName: req.body?.itemName,
        quantity: req.body?.quantity,
        price: req.body?.price
      });
      roster.slots[idx] = player;
      logEconomyEvent(req.user.id, { kind: "market_list", slotIndex: idx, meta: result });
      const { roster: saved, revision } = savePlayerForSlot(req.user.id, roster, idx, player);
      res.json(actionRosterResponse(saved, revision, { result }));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Could not create listing." });
    }
  });

  app.post("/api/market/buy", requireAuth, (req, res) => {
    try {
      const slotIndex = Number(req.body?.slotIndex);
      const listingId = Number(req.body?.listingId);
      const { roster, player, slotIndex: idx } = loadPlayerForSlot(req.user.id, slotIndex);
      const result = applyMarketBuy(req.user.id, player, idx, listingId);
      roster.slots[idx] = player;
      logEconomyEvent(req.user.id, { kind: "market_buy", slotIndex: idx, meta: result });
      const { roster: saved, revision } = savePlayerForSlot(req.user.id, roster, idx, player);
      res.json(actionRosterResponse(saved, revision, { result, unreadMail: getUnreadMailCount(req.user.id) }));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Purchase failed." });
    }
  });

  app.post("/api/market/cancel", requireAuth, (req, res) => {
    try {
      const slotIndex = Number(req.body?.slotIndex);
      const listingId = Number(req.body?.listingId);
      const { roster, player, slotIndex: idx } = loadPlayerForSlot(req.user.id, slotIndex);
      const result = applyMarketCancel(req.user.id, player, idx, listingId);
      roster.slots[idx] = player;
      logEconomyEvent(req.user.id, { kind: "market_cancel", slotIndex: idx, meta: result });
      const { roster: saved, revision } = savePlayerForSlot(req.user.id, roster, idx, player);
      res.json(actionRosterResponse(saved, revision, { result }));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Could not cancel listing." });
    }
  });

  app.get("/api/mail", requireAuth, (req, res) => {
    try {
      processExpiredListingsForUser(req.user.id);
      const limit = Number(req.query?.limit);
      const mail = getPlayerMail(req.user.id, Number.isFinite(limit) ? limit : 50);
      res.json({ mail, unreadCount: getUnreadMailCount(req.user.id) });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Failed to load mail." });
    }
  });

  app.post("/api/mail/read", requireAuth, (req, res) => {
    try {
      if (req.body?.all === true) {
        markAllMailRead(req.user.id);
      } else {
        markMailRead(req.user.id, req.body?.mailId);
      }
      res.json({ ok: true, unreadCount: getUnreadMailCount(req.user.id) });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Failed to update mail." });
    }
  });
}
