import { requireAuth } from "./auth.js";
import { getEconomyEventsForUser } from "./economy/audit.js";
import { logEconomyEvent } from "./economy/audit.js";
import { getVendorCatalog, applyShopBuy } from "./progression/shop_actions.js";
import {
  actionRosterResponse,
  loadPlayerForSlot,
  savePlayerForSlot
} from "./progression/roster_ops.js";

const MMO_FEATURES = Object.freeze({
  arena: {
    status: "planned",
    title: "Arena",
    message: "PvP matchmaking and ranked fights will be server-authoritative. Not available yet."
  },
  alliance: {
    status: "planned",
    title: "Alliance",
    message: "Guild roster, permissions, and shared storage are in development."
  },
  market: {
    status: "live",
    title: "Market",
    message: "Buy and sell items with other players. Listings expire after 30 days."
  },
  shop: {
    status: "live",
    title: "Vendors",
    message: "NPC vendors sell supplies for gold. Talk to merchants in harbor scenes."
  },
  trade: {
    status: "planned",
    title: "Trade",
    message: "Direct player trade will use a two-phase server escrow session."
  }
});

function notImplemented(feature, res) {
  const def = MMO_FEATURES[feature] || { title: feature, message: "Not available." };
  res.status(501).json({
    error: def.message,
    feature,
    status: def.status
  });
}

function shopFeaturePayload() {
  const vendors = getVendorCatalog();
  return {
    ...MMO_FEATURES.shop,
    vendors: vendors.map((v) => ({ id: v.id, name: v.name, itemCount: v.items.length }))
  };
}

export function registerMmoRoutes(app) {
  app.get("/api/mmo/features", requireAuth, (_req, res) => {
    res.json({
      features: {
        ...MMO_FEATURES,
        shop: shopFeaturePayload()
      }
    });
  });

  app.get("/api/economy/history", requireAuth, (req, res) => {
    const limit = Number(req.query?.limit);
    const events = getEconomyEventsForUser(req.user.id, Number.isFinite(limit) ? limit : 50);
    res.json({ events });
  });

  app.post("/api/arena/queue", requireAuth, (_req, res) => {
    notImplemented("arena", res);
  });

  app.post("/api/trade/offer", requireAuth, (_req, res) => {
    notImplemented("trade", res);
  });

  app.post("/api/alliance/create", requireAuth, (_req, res) => {
    notImplemented("alliance", res);
  });

  app.get("/api/shop/catalog", requireAuth, (req, res) => {
    const vendorId = typeof req.query?.vendorId === "string" ? req.query.vendorId.trim() : "";
    const vendors = getVendorCatalog(vendorId || null);
    res.json({
      status: MMO_FEATURES.shop.status,
      message: MMO_FEATURES.shop.message,
      vendors
    });
  });

  app.post("/api/shop/buy", requireAuth, (req, res) => {
    try {
      const slotIndex = Number(req.body?.slotIndex);
      const { roster, player, slotIndex: idx } = loadPlayerForSlot(req.user.id, slotIndex);
      const result = applyShopBuy(player, {
        vendorId: req.body?.vendorId,
        itemName: req.body?.itemName,
        quantity: req.body?.quantity
      });
      roster.slots[idx] = player;
      logEconomyEvent(req.user.id, { kind: "shop_buy", slotIndex: idx, meta: result });
      const { roster: saved, revision } = savePlayerForSlot(req.user.id, roster, idx, player);
      res.json(actionRosterResponse(saved, revision, { result }));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Purchase failed." });
    }
  });
}
