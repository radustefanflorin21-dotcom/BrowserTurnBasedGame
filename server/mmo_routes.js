import { requireAuth } from "./auth.js";
import { getEconomyEventsForUser } from "./economy/audit.js";

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
  trade: {
    status: "live",
    title: "Trade",
    message: "Request trade from players on your map tile. Both players must confirm."
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

export function registerMmoRoutes(app) {
  app.get("/api/mmo/features", requireAuth, (_req, res) => {
    res.json({ features: MMO_FEATURES });
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
}
