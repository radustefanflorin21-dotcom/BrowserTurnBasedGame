import { requireAuth } from "./auth.js";
import { applyEquipItem, applyUnequipItem } from "./progression/equip_actions.js";
import { applyCraftRecipe } from "./progression/craft_actions.js";
import { applySpendCharacteristicPoints } from "./progression/stat_actions.js";
import { applyUpgradeClassSkill } from "./progression/skill_actions.js";
import {
  actionRosterResponse,
  loadPlayerForSlot,
  savePlayerForSlot
} from "./progression/roster_ops.js";

function parseBodyTarget(body) {
  const target = body?.target === "companion" ? "companion" : "hero";
  const companionSlotIndex =
    target === "companion" && body?.companionSlotIndex != null ? Number(body.companionSlotIndex) : null;
  return { target, companionSlotIndex };
}

export function registerPlayerRoutes(app) {
  app.post("/api/player/equip", requireAuth, (req, res) => {
    try {
      const slotIndex = Number(req.body?.slotIndex);
      const { target, companionSlotIndex } = parseBodyTarget(req.body || {});
      const { roster, player } = loadPlayerForSlot(req.user.id, slotIndex);
      const result = applyEquipItem(player, {
        itemName: req.body?.itemName,
        preferredSlot: req.body?.preferredSlot || null,
        target,
        companionSlotIndex
      });
      savePlayerForSlot(req.user.id, roster, slotIndex, player);
      res.json({ ...actionRosterResponse(roster), result });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Equip failed." });
    }
  });

  app.post("/api/player/unequip", requireAuth, (req, res) => {
    try {
      const slotIndex = Number(req.body?.slotIndex);
      const { target, companionSlotIndex } = parseBodyTarget(req.body || {});
      const { roster, player } = loadPlayerForSlot(req.user.id, slotIndex);
      const result = applyUnequipItem(player, {
        equipSlot: req.body?.equipSlot,
        target,
        companionSlotIndex
      });
      savePlayerForSlot(req.user.id, roster, slotIndex, player);
      res.json({ ...actionRosterResponse(roster), result });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Unequip failed." });
    }
  });

  app.post("/api/player/spend-stat", requireAuth, (req, res) => {
    try {
      const slotIndex = Number(req.body?.slotIndex);
      const { target, companionSlotIndex } = parseBodyTarget(req.body || {});
      const { roster, player } = loadPlayerForSlot(req.user.id, slotIndex);
      const result = applySpendCharacteristicPoints(player, {
        statKey: req.body?.statKey,
        amount: req.body?.amount,
        target,
        companionSlotIndex
      });
      savePlayerForSlot(req.user.id, roster, slotIndex, player);
      res.json({ ...actionRosterResponse(roster), result });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Stat spend failed." });
    }
  });

  app.post("/api/player/upgrade-skill", requireAuth, (req, res) => {
    try {
      const slotIndex = Number(req.body?.slotIndex);
      const { target, companionSlotIndex } = parseBodyTarget(req.body || {});
      const { roster, player } = loadPlayerForSlot(req.user.id, slotIndex);
      const result = applyUpgradeClassSkill(player, {
        skillName: req.body?.skillName,
        target,
        companionSlotIndex
      });
      savePlayerForSlot(req.user.id, roster, slotIndex, player);
      res.json({ ...actionRosterResponse(roster), result });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Skill upgrade failed." });
    }
  });

  app.post("/api/player/craft", requireAuth, (req, res) => {
    try {
      const slotIndex = Number(req.body?.slotIndex);
      const crafterTarget = req.body?.crafterTarget === "companion" ? "companion" : "hero";
      const companionSlotIndex =
        crafterTarget === "companion" && req.body?.companionSlotIndex != null
          ? Number(req.body.companionSlotIndex)
          : null;
      const { roster, player } = loadPlayerForSlot(req.user.id, slotIndex);
      const result = applyCraftRecipe(player, {
        recipeId: req.body?.recipeId,
        crafterTarget,
        companionSlotIndex
      });
      savePlayerForSlot(req.user.id, roster, slotIndex, player);
      res.json({ ...actionRosterResponse(roster), result });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Craft failed." });
    }
  });
}
