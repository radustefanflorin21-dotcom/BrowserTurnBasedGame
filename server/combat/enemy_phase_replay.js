/** Snapshots and step records for client-side enemy-phase replay. */

function capturePartySnapshot(st) {
  return (st.party || []).map((m) =>
    m
      ? {
          uid: m.uid,
          hp: m.hp,
          maxHp: m.maxHp,
          kind: m.kind,
          gridX: typeof m.gridX === "number" ? m.gridX : undefined,
          gridY: typeof m.gridY === "number" ? m.gridY : undefined
        }
      : null
  );
}

function captureFoesSnapshot(st) {
  return (st.foes || []).map((f) =>
    f
      ? {
          uid: f.uid,
          hp: f.hp,
          maxHp: f.maxHp,
          gridX: typeof f.gridX === "number" ? f.gridX : undefined,
          gridY: typeof f.gridY === "number" ? f.gridY : undefined
        }
      : null
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
  let pendingHeals = [];
  let pendingMeta = null;

  function flushStep(forceSnapshot, extraMeta = null) {
    if (!forceSnapshot && !pendingLogs.length && !pendingHits.length && !pendingHeals.length) return;
    if (extraMeta) pendingMeta = extraMeta;
    steps.push({
      actorFoeUid: typeof st.activeFoeUid === "number" ? st.activeFoeUid : undefined,
      logLines: pendingLogs.slice(),
      hits: pendingHits.map((h) => ({ ...h })),
      heals: pendingHeals.map((h) => ({ ...h })),
      ...captureStepSnapshot(st),
      tacticalMoves: pendingMeta || undefined
    });
    pendingLogs = [];
    pendingHits = [];
    pendingHeals = [];
    pendingMeta = null;
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

  function recordHeal(heal) {
    if (!heal || typeof heal !== "object") return;
    const amount = Math.max(0, Math.floor(Number(heal.amount) || 0));
    if (amount <= 0) return;
    if (heal.foeUid != null) {
      pendingHeals.push({ foeUid: heal.foeUid, amount });
    } else if (heal.memberUid != null) {
      pendingHeals.push({ memberUid: heal.memberUid, amount });
    }
  }

  function finish() {
    flushStep();
    return { steps, preEnemySnapshot };
  }

  return { wrapAppendLog, recordHit, recordHeal, flushStep, finish, steps, preEnemySnapshot };
}
