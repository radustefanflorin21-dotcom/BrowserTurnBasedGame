/**
 * Interleaved turn queue: ally[0], foe[0], ally[1], foe[1], … then any remaining fighters.
 */

export function getLivingAllies(party) {
  return (party || []).filter((m) => m && m.hp > 0);
}

export function getLivingFoes(foes) {
  return (foes || []).filter((f) => f && f.hp > 0);
}

export function buildInterleavedTurnQueue(party, foes) {
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

export function initTurnOrder(st) {
  st.turnQueue = buildInterleavedTurnQueue(st.party, st.foes);
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

/** First ally slot in the current queue (fight start). */
export function firstQueuedAllyMember(st) {
  const queue = Array.isArray(st.turnQueue) ? st.turnQueue : [];
  for (const slot of queue) {
    if (slot?.side !== "ally") continue;
    const member = findAllyMember(st, slot.uid);
    if (member) return member;
  }
  return null;
}
