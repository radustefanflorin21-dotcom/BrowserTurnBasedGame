/**
 * Interleaved turn queue (ally/enemy alternate) using fight-start initiative order.
 */

import { createRequire } from "node:module";
import { expandTurnQueueWithSummons } from "./summons.js";

const require = createRequire(import.meta.url);
const CombatInitiative = require("../../shared/initiative.js");

export function getLivingAllies(party) {
  return (party || []).filter((m) => m && m.hp > 0);
}

export function getLivingFoes(foes) {
  return (foes || []).filter((f) => f && f.hp > 0);
}

function buildLegacyInterleavedTurnQueue(party, foes) {
  const allies = getLivingAllies(party);
  const enemies = getLivingFoes(foes);
  const queue = [];
  const maxLen = Math.max(allies.length, enemies.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < allies.length) queue.push({ side: "ally", uid: allies[i].uid });
    if (i < enemies.length) queue.push({ side: "foe", uid: enemies[i].uid });
  }
  return queue;
}

export function buildInterleavedTurnQueue(st) {
  const party = st?.party;
  const foes = st?.foes;
  let base;
  if (Array.isArray(st?.turnOrderAllies) && Array.isArray(st?.turnOrderFoes)) {
    base = CombatInitiative.buildInterleavedTurnQueueFromOrder(
      party,
      foes,
      st.turnOrderAllies,
      st.turnOrderFoes,
      st.alliesStartFirst !== false
    );
  } else {
    base = buildLegacyInterleavedTurnQueue(party, foes);
  }
  return expandTurnQueueWithSummons(st, base);
}

export function initTurnOrder(st) {
  st.turnQueue = buildInterleavedTurnQueue(st);
  st.turnQueueIndex = 0;
  if (!st.combatRoundFlags || typeof st.combatRoundFlags !== "object") {
    st.combatRoundFlags = { enemyPhaseOpened: false };
  } else {
    st.combatRoundFlags.enemyPhaseOpened = false;
  }
}

export function resetPartyActedForRound(st) {
  (st.party || []).forEach((m) => {
    if (m) m.acted = false;
  });
}

export function findAllyMember(st, uid) {
  const n = Number(uid);
  if (!Number.isFinite(n)) return null;
  return (st.party || []).find((m) => m && m.uid === n && m.hp > 0) || null;
}

export function findLivingFoe(st, uid) {
  const n = Number(uid);
  if (!Number.isFinite(n)) return null;
  return (st.foes || []).find((f) => f && f.uid === n && f.hp > 0) || null;
}

/** First ally slot in the current queue (may not be index 0 if enemies start). */
export function firstQueuedAllyMember(st) {
  const queue = Array.isArray(st.turnQueue) ? st.turnQueue : [];
  for (const slot of queue) {
    if (slot?.side !== "ally") continue;
    const member = findAllyMember(st, slot.uid);
    if (member) return member;
  }
  return null;
}

/** First slot in the turn queue (ally or foe). */
export function firstQueuedSlot(st) {
  const queue = Array.isArray(st.turnQueue) ? st.turnQueue : [];
  return queue.length ? queue[0] : null;
}
