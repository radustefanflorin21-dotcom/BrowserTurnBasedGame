/**
 * Normalize roster player snapshot before building combat party (server-side).
 */

import { createRequire } from "node:module";
import { loadGameConfig } from "../load_game_config.js";

const require = createRequire(import.meta.url);
const SkillBar = require("../../shared/skill_bar.js");

function getSkillBarDeps() {
  loadGameConfig();
  const catalog =
    typeof global.SKILL_CATALOG === "object" && global.SKILL_CATALOG ? global.SKILL_CATALOG : {};
  const skillOrder = Array.isArray(global.UNIFIED_SKILL_ORDER)
    ? global.UNIFIED_SKILL_ORDER
    : Object.keys(catalog);
  return { catalog, skillOrder };
}

export function isCompanionEnabledForCombat(comp, _slotIdx) {
  if (!comp || typeof comp !== "object") return false;
  return comp.enabled === true;
}

export function preparePlayerForCombat(player) {
  if (!player || typeof player !== "object") return player;
  if (!Array.isArray(player.companions)) player.companions = [];
  const { catalog, skillOrder } = getSkillBarDeps();
  SkillBar.prepareActorForCombat(player, catalog, skillOrder);
  player.companions.forEach((comp, idx) => {
    if (comp && isCompanionEnabledForCombat(comp, idx)) {
      SkillBar.prepareActorForCombat(comp, catalog, skillOrder);
    }
  });
  return player;
}

export function applySkillBarPayloadToPlayer(player, payload) {
  if (!player || !payload || typeof payload !== "object") return player;
  const { catalog, skillOrder } = getSkillBarDeps();
  if (payload.skillBarSlots) {
    SkillBar.applySkillBarPayload(player, { skillBarSlots: payload.skillBarSlots });
  }
  if (Array.isArray(payload.companionSkillBars) && Array.isArray(player.companions)) {
    payload.companionSkillBars.forEach((bar, idx) => {
      const comp = player.companions[idx];
      if (comp && bar) SkillBar.applySkillBarPayload(comp, bar);
    });
  }
  return preparePlayerForCombat(player);
}
