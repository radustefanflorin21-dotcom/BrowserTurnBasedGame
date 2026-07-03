import { requireAuth } from "../auth.js";
import {
  joinQueue,
  leaveQueue,
  getQueueEntry,
  respondToMatch,
  getArenaHubPayload
} from "./queue.js";
import { getArenaMatchHistory } from "./arena_db.js";

export function registerArenaRoutes(app) {
  app.get("/api/arena/hub", requireAuth, (req, res) => {
    try {
      const slotIndex = Number(req.query?.slotIndex ?? 0);
      res.json(getArenaHubPayload(req.user.id, slotIndex));
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to load arena hub." });
    }
  });

  app.get("/api/arena/queue", requireAuth, (req, res) => {
    const entry = getQueueEntry(req.user.id);
    res.json({ inQueue: !!entry, entry });
  });

  app.post("/api/arena/queue", requireAuth, (req, res) => {
    try {
      const { modeId, slotIndex, action } = req.body || {};
      if (action === "leave") {
        res.json(leaveQueue(req.user.id));
        return;
      }
      const result = joinQueue(req.user.id, {
        modeId: modeId || "ranked_1v1",
        slotIndex: Number(slotIndex)
      });
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Queue failed." });
    }
  });

  app.post("/api/arena/match/respond", requireAuth, (req, res) => {
    try {
      const { matchId, accept } = req.body || {};
      const result = respondToMatch(req.user.id, { matchId, accept: accept !== false });
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Match response failed." });
    }
  });

  app.get("/api/arena/history", requireAuth, (req, res) => {
    const slotIndex = Number(req.query?.slotIndex ?? 0);
    const limit = Number(req.query?.limit ?? 10);
    res.json({ history: getArenaMatchHistory(req.user.id, slotIndex, limit) });
  });
}
