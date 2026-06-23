import { requireAuth } from "./auth.js";
import { applyEquipItem, applyUnequipItem } from "./progression/equip_actions.js";
import { applyCraftRecipe } from "./progression/craft_actions.js";
import { applyEnhance } from "./progression/enhance_actions.js";
import { applyUseConsumable } from "./progression/consumable_actions.js";
import { applyOutOfCombatFullHeal } from "./progression/heal_actions.js";
import { applySpendCharacteristicPoints } from "./progression/stat_actions.js";
import { applyUpgradeClassSkill } from "./progression/skill_actions.js";
import { logEconomyEvent } from "./economy/audit.js";
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

function finishAction(req, res, slotIndex, roster, player, result, kind) {
  logEconomyEvent(req.user.id, { kind, slotIndex, meta: result });
  const { roster: saved, revision } = savePlayerForSlot(req.user.id, roster, slotIndex, player);
  res.json(actionRosterResponse(saved, revision, { result }));
}

export function registerPlayerRoutes(app) {
  app.post("/api/player/equip", requireAuth, (req, res) => {
    try {
      const slotIndex = Number(req.body?.slotIndex);
      const { target, companionSlotIndex } = parseBodyTarget(req.body || {});
      const { roster, player, slotIndex: idx } = loadPlayerForSlot(req.user.id, slotIndex);
      const result = applyEquipItem(player, {
        itemName: req.body?.itemName,
        preferredSlot: req.body?.preferredSlot || null,
        target,
        companionSlotIndex
      });
      roster.slots[idx] = player;
      finishAction(req, res, idx, roster, player, result, "equip");
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Equip failed." });
    }
  });

  app.post("/api/player/unequip", requireAuth, (req, res) => {
    try {
      const slotIndex = Number(req.body?.slotIndex);
      const { target, companionSlotIndex } = parseBodyTarget(req.body || {});
      const { roster, player, slotIndex: idx } = loadPlayerForSlot(req.user.id, slotIndex);
      const result = applyUnequipItem(player, {
        equipSlot: req.body?.equipSlot,
        target,
        companionSlotIndex
      });
      roster.slots[idx] = player;
      finishAction(req, res, idx, roster, player, result, "unequip");
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Unequip failed." });
    }
  });

  app.post("/api/player/spend-stat", requireAuth, (req, res) => {
    try {
      const slotIndex = Number(req.body?.slotIndex);
      const { target, companionSlotIndex } = parseBodyTarget(req.body || {});
      const { roster, player, slotIndex: idx } = loadPlayerForSlot(req.user.id, slotIndex);
      const result = applySpendCharacteristicPoints(player, {
        statKey: req.body?.statKey,
        amount: req.body?.amount,
        target,
        companionSlotIndex
      });
      roster.slots[idx] = player;
      finishAction(req, res, idx, roster, player, result, "spend_stat");
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Stat spend failed." });
    }
  });

  app.post("/api/player/upgrade-skill", requireAuth, (req, res) => {
    try {
      const slotIndex = Number(req.body?.slotIndex);
      const { target, companionSlotIndex } = parseBodyTarget(req.body || {});
      const { roster, player, slotIndex: idx } = loadPlayerForSlot(req.user.id, slotIndex);
      const result = applyUpgradeClassSkill(player, {
        skillName: req.body?.skillName,
        target,
        companionSlotIndex
      });
      roster.slots[idx] = player;
      finishAction(req, res, idx, roster, player, result, "upgrade_skill");
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
      const { roster, player, slotIndex: idx } = loadPlayerForSlot(req.user.id, slotIndex);
      const result = applyCraftRecipe(player, {
        recipeId: req.body?.recipeId,
        crafterTarget,
        companionSlotIndex,
        quantity: req.body?.quantity
      });
      roster.slots[idx] = player;
      finishAction(req, res, idx, roster, player, result, "craft");
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Craft failed." });
    }
  });

  app.post("/api/player/enhance", requireAuth, (req, res) => {
    try {
      const slotIndex = Number(req.body?.slotIndex);
      const crafterTarget = req.body?.crafterTarget === "companion" ? "companion" : "hero";
      const companionSlotIndex =
        crafterTarget === "companion" && req.body?.companionSlotIndex != null
          ? Number(req.body.companionSlotIndex)
          : null;
      const { roster, player, slotIndex: idx } = loadPlayerForSlot(req.user.id, slotIndex);
      const result = applyEnhance(player, {
        itemInstanceName: req.body?.itemInstanceName,
        runeBaseName: req.body?.runeBaseName,
        professionId: req.body?.professionId,
        crafterTarget,
        companionSlotIndex
      });
      roster.slots[idx] = player;
      finishAction(req, res, idx, roster, player, result, "enhance");
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Enhance failed." });
    }
  });

  app.post("/api/player/heal", requireAuth, (req, res) => {
    try {
      const slotIndex = Number(req.body?.slotIndex);
      const { roster, player, slotIndex: idx } = loadPlayerForSlot(req.user.id, slotIndex);
      const result = applyOutOfCombatFullHeal(player);
      roster.slots[idx] = player;
      finishAction(req, res, idx, roster, player, result, "heal");
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Heal failed." });
    }
  });

  app.post("/api/player/use-consumable", requireAuth, (req, res) => {
    try {
      const slotIndex = Number(req.body?.slotIndex);
      const { roster, player, slotIndex: idx } = loadPlayerForSlot(req.user.id, slotIndex);
      const result = applyUseConsumable(player, { itemName: req.body?.itemName });
      roster.slots[idx] = player;
      finishAction(req, res, idx, roster, player, result, "use_consumable");
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Could not use item." });
    }
  });
}
