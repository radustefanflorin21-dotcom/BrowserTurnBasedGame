import { requireAuth } from "./auth.js";
import { updatePresence } from "./presence/hub.js";
import { applyScenePickup, applyWorldMove } from "./progression/world_actions.js";
import { logEconomyEvent } from "./economy/audit.js";
import {
  actionRosterResponse,
  loadPlayerForSlot,
  savePlayerForSlot
} from "./progression/roster_ops.js";

export function registerWorldRoutes(app) {
  app.post("/api/world/move", requireAuth, (req, res) => {
    try {
      const slotIndex = Number(req.body?.slotIndex);
      const { roster, player, slotIndex: idx } = loadPlayerForSlot(req.user.id, slotIndex);
      const result = applyWorldMove(player, {
        x: req.body?.x,
        y: req.body?.y,
        reason: req.body?.reason || "step"
      });
      logEconomyEvent(req.user.id, { kind: "world_move", slotIndex: idx, meta: result });
      const { roster: saved, revision } = savePlayerForSlot(req.user.id, roster, idx, player);
      updatePresence(req.user.id, {
        x: result.x,
        y: result.y,
        page: "adventure"
      });
      res.json(actionRosterResponse(saved, revision, { result }));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Move failed." });
    }
  });

  app.post("/api/world/pickup", requireAuth, (req, res) => {
    try {
      const slotIndex = Number(req.body?.slotIndex);
      const { roster, player, slotIndex: idx } = loadPlayerForSlot(req.user.id, slotIndex);
      const result = applyScenePickup(player, {
        x: req.body?.x,
        y: req.body?.y,
        elementId: req.body?.elementId,
        itemName: req.body?.itemName
      });
      logEconomyEvent(req.user.id, { kind: "pickup", slotIndex: idx, meta: result });
      const { roster: saved, revision } = savePlayerForSlot(req.user.id, roster, idx, player);
      res.json(actionRosterResponse(saved, revision, { result }));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Pickup failed." });
    }
  });
}
