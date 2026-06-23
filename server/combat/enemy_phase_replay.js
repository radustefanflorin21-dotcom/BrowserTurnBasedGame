/** Snapshots and step records for client-side enemy-phase replay. */

function capturePartySnapshot(st) {
  return (st.party || []).map((m) =>
    m ? { uid: m.uid, hp: m.hp, maxHp: m.maxHp, kind: m.kind } : null
  );
}

function captureFoesSnapshot(st) {
  return (st.foes || []).map((f) =>
    f ? { uid: f.uid, hp: f.hp, maxHp: f.maxHp } : null
  );
}

function captureStatusSnapshot(st) {
  return st.status ? JSON.parse(JSON.stringify(st.status)) : null;
}

export function capturePreEnemySnapshot(st) {
  return {
    fightLog: Array.isArray(st.fightLog) ? st.fightLog.slice() : [],
    party: capturePartySnapshot(st),
    foes: captureFoesSnapshot(st),
    playerHp: st.playerHp,
    playerMax: st.playerMax,
    status: captureStatusSnapshot(st)
  };
}

function captureStepSnapshot(st) {
  return {
    party: capturePartySnapshot(st),
    foes: captureFoesSnapshot(st),
    playerHp: st.playerHp,
    status: captureStatusSnapshot(st)
  };
}

/**
 * Records discrete enemy actions during {@link runEnemyPhase} for client replay.
 */
export function createEnemyPhaseStepRecorder(st) {
  const steps = [];
  const preEnemySnapshot = capturePreEnemySnapshot(st);
  let pendingLogs = [];
  let pendingHits = [];

  function flushStep() {
    if (!pendingLogs.length && !pendingHits.length) return;
    steps.push({
      logLines: pendingLogs.slice(),
      hits: pendingHits.map((h) => ({ ...h })),
      ...captureStepSnapshot(st)
    });
    pendingLogs = [];
    pendingHits = [];
  }

  function wrapAppendLog(baseAppend) {
    return (line) => {
      if (line == null || line === "") return;
      const text = String(line);
      baseAppend(text);
      pendingLogs.push(text);
    };
  }

  function recordHit(hit) {
    if (!hit || typeof hit !== "object") return;
    pendingHits.push({ ...hit });
  }

  function finish() {
    flushStep();
    return { steps, preEnemySnapshot };
  }

  return { wrapAppendLog, recordHit, flushStep, finish, steps, preEnemySnapshot };
}
