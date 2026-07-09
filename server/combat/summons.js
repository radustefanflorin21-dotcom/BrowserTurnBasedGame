import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const CombatSummons = require("../../shared/combat_summons.js");

export const isCombatSummon = CombatSummons.isCombatSummon;
export const getLivingSummonsForSummoner = CombatSummons.getLivingSummonsForSummoner;
export const expandTurnQueueWithSummons = CombatSummons.expandTurnQueueWithSummons;
export const insertSummonIntoTurnOrder = CombatSummons.insertSummonIntoTurnOrder;
export const despawnSummonsWithDeadSummoners = CombatSummons.despawnSummonsWithDeadSummoners;
