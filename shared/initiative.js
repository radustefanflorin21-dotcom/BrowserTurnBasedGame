/**
 * Combat initiative (fight-start snapshot) + interleaved turn queue.
 */
(function (root) {
  function computeInitiativeScore(stats) {
    const s = stats && typeof stats === "object" ? stats : {};
    const n = (k) => (typeof s[k] === "number" && Number.isFinite(s[k]) ? s[k] : 0);
    return (
      n("str") * 0.7 +
      n("dex") * 1.25 +
      n("vit") * 0.45 +
      n("int") * 0.9 +
      n("hp") / 40 +
      n("critPct") * 6 +
      n("evasionPct") * 7 +
      n("accuracyPct") * 5 +
      n("physDmgPct") * 4 +
      n("magicDmgPct") * 4 +
      n("physResPct") * 3 +
      n("magicResPct") * 3 +
      n("healingPct") * 3 +
      n("statusResistPct") * 3 +
      n("stamina") * 12
    );
  }

  function compareInitiativeEntries(a, b, rng) {
    const ai = Number(a?.initiative) || 0;
    const bi = Number(b?.initiative) || 0;
    if (bi !== ai) return bi - ai;
    const ad = Number(a?.dex) || 0;
    const bd = Number(b?.dex) || 0;
    if (bd !== ad) return bd - ad;
    const aAcc = Number(a?.accuracyPct) || 0;
    const bAcc = Number(b?.accuracyPct) || 0;
    if (bAcc !== aAcc) return bAcc - aAcc;
    const aSt = Number(a?.stamina) || 0;
    const bSt = Number(b?.stamina) || 0;
    if (bSt !== aSt) return bSt - aSt;
    if (rng && typeof rng.next === "function") return rng.next() < 0.5 ? -1 : 1;
    return Math.random() < 0.5 ? -1 : 1;
  }

  function sortInitiativeEntries(entries, rng) {
    return (Array.isArray(entries) ? entries.slice() : []).sort((a, b) => compareInitiativeEntries(a, b, rng));
  }

  /**
   * @param {number[]} orderAllies - uids high→low initiative at fight start
   * @param {number[]} orderFoes
   * @param {boolean} alliesStartFirst
   */
  function buildInterleavedTurnQueueFromOrder(party, foes, orderAllies, orderFoes, alliesStartFirst) {
    const allyByUid = new Map();
    (party || []).forEach((m) => {
      if (m && typeof m.uid === "number") allyByUid.set(m.uid, m);
    });
    const foeByUid = new Map();
    (foes || []).forEach((f) => {
      if (f && typeof f.uid === "number") foeByUid.set(f.uid, f);
    });
    const allies = (Array.isArray(orderAllies) ? orderAllies : [])
      .map((uid) => allyByUid.get(uid))
      .filter((m) => m && m.hp > 0);
    const enemies = (Array.isArray(orderFoes) ? orderFoes : [])
      .map((uid) => foeByUid.get(uid))
      .filter((f) => f && f.hp > 0);
    const queue = [];
    const maxLen = Math.max(allies.length, enemies.length);
    const alliesFirst = alliesStartFirst !== false;
    for (let i = 0; i < maxLen; i++) {
      if (alliesFirst) {
        if (i < allies.length) queue.push({ side: "ally", uid: allies[i].uid });
        if (i < enemies.length) queue.push({ side: "foe", uid: enemies[i].uid });
      } else {
        if (i < enemies.length) queue.push({ side: "foe", uid: enemies[i].uid });
        if (i < allies.length) queue.push({ side: "ally", uid: allies[i].uid });
      }
    }
    return queue;
  }

  const api = Object.freeze({
    computeInitiativeScore,
    compareInitiativeEntries,
    sortInitiativeEntries,
    buildInterleavedTurnQueueFromOrder
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.CombatInitiative = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
