/**
 * Combat summon helpers (turn queue, summoner linkage).
 */
(function (root) {
  function isCombatSummon(foe) {
    return !!(foe && foe.combat && typeof foe.combat.summonerUid === "number");
  }

  function getLivingSummonsForSummoner(st, summonerUid) {
    return (st.foes || []).filter(
      (f) => f && f.hp > 0 && f.combat && f.combat.summonerUid === summonerUid
    );
  }

  function expandTurnQueueWithSummons(st, queue) {
    const rootFoeUids = new Set(Array.isArray(st?.turnOrderFoes) ? st.turnOrderFoes : []);
    const expanded = [];
    for (const slot of queue || []) {
      if (!slot) continue;
      expanded.push(slot);
      if (slot.side !== "foe" || !rootFoeUids.has(slot.uid)) continue;
      getLivingSummonsForSummoner(st, slot.uid).forEach((s) => {
        expanded.push({ side: "foe", uid: s.uid });
      });
    }
    return expanded;
  }

  function insertSummonIntoTurnOrder(st, summonUid, summonerUid) {
    const queue = Array.isArray(st.turnQueue) ? st.turnQueue.slice() : [];
    if (!queue.length) return;
    const cur = typeof st.turnQueueIndex === "number" ? st.turnQueueIndex : 0;
    let insertAt = cur;
    while (insertAt < queue.length) {
      const slot = queue[insertAt];
      if (slot?.side !== "foe") break;
      const f = (st.foes || []).find((x) => x && x.uid === slot.uid);
      if (f && f.combat && f.combat.summonerUid === summonerUid) insertAt++;
      else break;
    }
    queue.splice(insertAt, 0, { side: "foe", uid: summonUid });
    st.turnQueue = queue;
  }

  function despawnSummonsWithDeadSummoners(st, logFn) {
    if (!st || !Array.isArray(st.foes)) return;
    const deadSummoners = new Set();
    for (const f of st.foes) {
      if (!f || f.hp > 0 || typeof f.uid !== "number") continue;
      deadSummoners.add(f.uid);
    }
    if (!deadSummoners.size) return;
    for (const f of st.foes) {
      if (!f || f.hp <= 0 || !f.combat || typeof f.combat.summonerUid !== "number") continue;
      if (!deadSummoners.has(f.combat.summonerUid)) continue;
      f.hp = 0;
      if (typeof logFn === "function") logFn(`${f.name} collapses as its summoner falls.`);
      st.turnQueue = (st.turnQueue || []).filter((slot) => !(slot?.side === "foe" && slot.uid === f.uid));
    }
  }

  const api = Object.freeze({
    isCombatSummon,
    getLivingSummonsForSummoner,
    expandTurnQueueWithSummons,
    insertSummonIntoTurnOrder,
    despawnSummonsWithDeadSummoners
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.CombatSummons = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
