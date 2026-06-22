/**
 * Online commission crafting: requester invites crafter, gold reserved on accept, craft atomically.
 */

import { getRosterJson } from "../db.js";
import {
  assertSlotNotInCombat,
  parseRoster,
  validateSlotIndex
} from "../progression/roster_ops.js";
import {
  executeCraftBatch,
  getCraftRecipeById,
  getCraftingProfessionIdForRecipe,
  resolveCrafter
} from "../progression/craft_actions.js";
import { upsertSnapshot } from "../progression/store.js";
import { saveRosterDocument } from "../progression/roster_save.js";
import { byUserId, displayLabel, sendJsonToUser } from "./hub.js";

const INVITE_TTL_MS = 180_000;

/** @type {Map<number, object>} crafterUserId -> pending invite */
const pendingCraftInvites = new Map();

function loadPlayerClone(userId, slotIndex) {
  const idx = validateSlotIndex(slotIndex);
  assertSlotNotInCombat(userId, idx);
  const roster = parseRoster(getRosterJson(userId));
  const player = roster.slots[idx];
  if (!player) {
    const err = new Error("No character in that slot.");
    err.status = 400;
    throw err;
  }
  return { roster, player: JSON.parse(JSON.stringify(player)), slotIndex: idx };
}

function saveUserRoster(userId, roster, slotIndex, player) {
  roster.slots[slotIndex] = player;
  upsertSnapshot(userId, slotIndex, player, null);
  return saveRosterDocument(userId, roster);
}

function normalizeGoldOffer(raw) {
  const n = Math.floor(Number(raw) || 0);
  return Math.max(0, Math.min(999_999_999, n));
}

function normalizeQuantity(raw) {
  return Math.max(1, Math.min(999, Math.floor(Number(raw) || 1)));
}

export function sendCraftInvite(fromUserId, payload) {
  const fromEntry = byUserId.get(fromUserId);
  if (!fromEntry) return { ok: false, message: "You are not connected." };

  const targetUserId = Number(payload?.targetUserId);
  if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
    return { ok: false, message: "Invalid player." };
  }
  if (targetUserId === fromUserId) return { ok: false, message: "You cannot commission yourself." };

  const targetEntry = byUserId.get(targetUserId);
  if (!targetEntry) return { ok: false, message: "That player is not online." };

  const recipeId = String(payload?.recipeId || "").trim();
  const recipe = getCraftRecipeById(recipeId);
  if (!recipe) return { ok: false, message: "Unknown recipe." };

  const requesterSlotIndex = validateSlotIndex(Number(payload?.requesterSlotIndex ?? fromEntry.slotIndex));
  const quantity = normalizeQuantity(payload?.quantity);
  const goldOffer = normalizeGoldOffer(payload?.goldOffer);
  const professionId = getCraftingProfessionIdForRecipe(recipe);

  let requesterLoad;
  try {
    requesterLoad = loadPlayerClone(fromUserId, requesterSlotIndex);
  } catch (err) {
    return { ok: false, message: err.message || "Could not load your character." };
  }

  const requesterGold = typeof requesterLoad.player.gold === "number" ? Math.max(0, Math.floor(requesterLoad.player.gold)) : 0;
  if (goldOffer > requesterGold) {
    return { ok: false, message: `Not enough gold (have ${requesterGold}, offered ${goldOffer}).` };
  }

  pendingCraftInvites.set(targetUserId, {
    fromUserId,
    fromName: displayLabel(fromEntry),
    requesterSlotIndex,
    recipeId,
    recipeName: recipe.resultItem,
    quantity,
    goldOffer,
    professionId,
    t: Date.now()
  });

  sendJsonToUser(targetUserId, {
    type: "craft_invite",
    fromUserId,
    fromName: displayLabel(fromEntry),
    recipeId,
    recipeName: recipe.resultItem,
    quantity,
    goldOffer,
    professionId
  });

  return { ok: true, message: `Craft invite sent to ${displayLabel(targetEntry)}.` };
}

export function acceptCraftInvite(crafterUserId, payload) {
  const invite = pendingCraftInvites.get(crafterUserId);
  if (!invite || Date.now() - invite.t > INVITE_TTL_MS) {
    pendingCraftInvites.delete(crafterUserId);
    return { ok: false, message: "No pending craft invite." };
  }
  pendingCraftInvites.delete(crafterUserId);

  const crafterEntry = byUserId.get(crafterUserId);
  if (!crafterEntry) return { ok: false, message: "You are not connected." };

  const recipe = getCraftRecipeById(invite.recipeId);
  if (!recipe) return { ok: false, message: "Recipe no longer exists." };

  const crafterTarget = payload?.crafterTarget === "companion" ? "companion" : "hero";
  const companionSlotIndex =
    crafterTarget === "companion" && payload?.companionSlotIndex != null
      ? Number(payload.companionSlotIndex)
      : null;

  let requesterLoad;
  let crafterLoad;
  try {
    requesterLoad = loadPlayerClone(invite.fromUserId, invite.requesterSlotIndex);
    crafterLoad = loadPlayerClone(crafterUserId, crafterEntry.slotIndex);
  } catch (err) {
    return { ok: false, message: err.message || "Could not load characters." };
  }

  const requesterGold =
    typeof requesterLoad.player.gold === "number" ? Math.max(0, Math.floor(requesterLoad.player.gold)) : 0;
  if (invite.goldOffer > requesterGold) {
    sendJsonToUser(invite.fromUserId, {
      type: "craft_result",
      ok: false,
      message: "Commission failed: requester no longer has enough gold."
    });
    return { ok: false, message: "Requester no longer has enough gold." };
  }

  let crafterActor;
  try {
    crafterActor = resolveCrafter(crafterLoad.player, { crafterTarget, companionSlotIndex });
  } catch (err) {
    return { ok: false, message: err.message || "Invalid crafter." };
  }

  let craftResult;
  try {
    craftResult = executeCraftBatch({
      recipe,
      quantity: invite.quantity,
      inventoryOwner: requesterLoad.player,
      resultOwner: requesterLoad.player,
      crafter: crafterActor
    });
  } catch (err) {
    sendJsonToUser(invite.fromUserId, {
      type: "craft_result",
      ok: false,
      message: err.message || "Commission craft failed."
    });
    return { ok: false, message: err.message || "Commission craft failed." };
  }

  requesterLoad.player.gold = requesterGold - invite.goldOffer;
  if (typeof crafterLoad.player.gold !== "number" || !Number.isFinite(crafterLoad.player.gold)) {
    crafterLoad.player.gold = 0;
  }
  crafterLoad.player.gold += invite.goldOffer;

  const requesterSave = saveUserRoster(
    invite.fromUserId,
    requesterLoad.roster,
    requesterLoad.slotIndex,
    requesterLoad.player
  );
  const crafterSave = saveUserRoster(
    crafterUserId,
    crafterLoad.roster,
    crafterLoad.slotIndex,
    crafterLoad.player
  );

  const successPayload = {
    type: "craft_commission_complete",
    ok: true,
    recipeName: invite.recipeName,
    quantity: invite.quantity,
    goldOffer: invite.goldOffer,
    xpGained: craftResult.xpGained,
    professionLevel: craftResult.professionLevel,
    fromName: invite.fromName
  };

  sendJsonToUser(crafterUserId, {
    ...successPayload,
    role: "crafter",
    roster: crafterSave.roster,
    revision: crafterSave.revision
  });

  sendJsonToUser(invite.fromUserId, {
    ...successPayload,
    role: "requester",
    roster: requesterSave.roster,
    revision: requesterSave.revision,
    crafterName: displayLabel(crafterEntry)
  });

  return {
    ok: true,
    message: `Crafted ${invite.quantity}× ${invite.recipeName} for ${invite.fromName}.`,
    roster: crafterSave.roster,
    revision: crafterSave.revision,
    result: craftResult
  };
}

export function declineCraftInvite(crafterUserId) {
  pendingCraftInvites.delete(crafterUserId);
}

export function clearCraftInvitesForUser(userId) {
  pendingCraftInvites.delete(userId);
  for (const [crafterId, invite] of pendingCraftInvites) {
    if (invite.fromUserId === userId) pendingCraftInvites.delete(crafterId);
  }
}
