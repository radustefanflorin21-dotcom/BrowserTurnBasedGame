import { requireAuth } from "../auth.js";
import { getNearbyForViewer, getPresenceStats } from "./hub.js";

export function registerPresenceRoutes(app) {
  app.get("/api/presence/nearby", requireAuth, (req, res) => {
    const x = Number(req.query.x);
    const y = Number(req.query.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      res.status(400).json({ error: "Query params x and y are required." });
      return;
    }
    const players = getNearbyForViewer(req.user.id, Math.floor(x), Math.floor(y));
    res.json({ players });
  });

  app.get("/api/presence/stats", (_req, res) => {
    res.json(getPresenceStats());
  });
}
