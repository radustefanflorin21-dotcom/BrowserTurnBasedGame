/**
 * Full online API smoke suite — exercises every REST endpoint group.
 * Run from server/:  npm run smoke
 */
import WebSocket from "ws";

const API = process.env.API_BASE || "http://localhost:3001";
const WS_URL = process.env.WS_BASE || API.replace(/^https:/, "wss:").replace(/^http:/, "ws:") + "/presence";
const RUN_ID = Date.now();
const EMAIL_A = process.env.SMOKE_EMAIL || `smoke-a-${RUN_ID}@test.local`;
const EMAIL_B = process.env.SMOKE_EMAIL_B || `smoke-b-${RUN_ID}@test.local`;
const PASSWORD = process.env.SMOKE_PASSWORD || "smoke123456";
const SLOT_COUNT = 5;

let passed = 0;
let failed = 0;
let skipped = 0;

function ok(name, detail = "") {
  passed++;
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  failed++;
  console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

function skip(name, reason = "") {
  skipped++;
  console.log(`  ○ ${name}${reason ? ` — ${reason}` : " (skipped)"}`);
}

function section(title) {
  console.log(`\n── ${title} ──`);
}

async function api(path, { method = "GET", token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined
  });
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  return { res, data };
}

function makeTestPlayer(name = "Smoke Hero") {
  return {
    name,
    level: 2,
    xp: 0,
    hp: 40,
    maxHp: 100,
    str: 5,
    dex: 5,
    vit: 5,
    int: 5,
    baseAttack: 10,
    charPoints: 5,
    gold: 500,
    classId: "adventurer",
    skillPoints: 2,
    classSkillLevels: {},
    skills: [],
    professions: ["provisioner"],
    professionProgress: { provisioner: { level: 1, xp: 0 } },
    inventory: [
      "Rusty Sword",
      "Residue",
      "Residue",
      "Residue",
      "Residue",
      "Residue",
      "Residue",
      "Residue",
      "Residue",
      "Residue",
      "Residue",
      "Wet Membrane",
      "Wet Membrane",
      "Wet Membrane",
      "Wet Membrane",
      "Wet Membrane",
      "Wet Membrane",
      "Water Essence",
      "Water Essence",
      "Sunken Grotto Key"
    ],
    equipment: {
      weapon: null,
      offhand: null,
      head: null,
      chest: null,
      legs: null,
      feet: null,
      ring1: null,
      ring2: null,
      amulet: null,
      bracelet: null
    },
    portraitGender: "male",
    portraitLayouts: {},
    portraitLayoutLastExport: "",
    theme: "medieval",
    charPointsRetroDone: true,
    allocPoolsBindToLevelV2: true,
    allocPoolsCharV2: true,
    companions: [],
    worldMap: {
      x: 29,
      y: 55,
      cells: {},
      scenePickups: {},
      sceneLayout: {},
      sceneEdits: {},
      portalWorldById: {},
      spawnPressure: { monsters: {} }
    },
    editMode: false
  };
}

function emptyRoster() {
  return { version: 1, slots: Array.from({ length: SLOT_COUNT }, () => null) };
}

async function registerOrLogin(email) {
  const reg = await api("/api/auth/register", {
    method: "POST",
    body: { email, password: PASSWORD }
  });
  if (reg.res.ok && reg.data?.token) return { token: reg.data.token, email: reg.data.email || email };
  const login = await api("/api/auth/login", {
    method: "POST",
    body: { email, password: PASSWORD }
  });
  if (login.res.ok && login.data?.token) return { token: login.data.token, email: login.data.email || email };
  throw new Error(login.data?.error || reg.data?.error || "auth failed");
}

function connectPresence(token, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      reject(new Error("presence WebSocket timeout"));
    }, timeoutMs);

    ws.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "auth", token }));
    });

    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (msg.type === "welcome") {
        clearTimeout(timer);
        resolve({ ws, welcome: msg });
      } else if (msg.type === "error") {
        clearTimeout(timer);
        ws.close();
        reject(new Error(msg.message || "presence auth failed"));
      }
    });
  });
}

function sendPresenceUpdate(ws, patch) {
  ws.send(JSON.stringify({ type: "update", ...patch }));
}

/** WebSocket client with message queue for party / chat / craft tests. */
class PresenceClient {
  constructor(token, label = "") {
    this.token = token;
    this.label = label;
    this.ws = null;
    this.inbox = [];
    this._waiters = [];
  }

  async connect() {
    const { ws, welcome } = await connectPresence(this.token);
    this.ws = ws;
    this.userId = welcome.userId;
    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      this.inbox.push(msg);
      for (const w of this._waiters.slice()) {
        if (w.predicate(msg)) {
          this._waiters = this._waiters.filter((x) => x !== w);
          clearTimeout(w.timer);
          w.resolve(msg);
        }
      }
    });
    return welcome;
  }

  send(payload) {
    this.ws.send(JSON.stringify(payload));
  }

  updatePresence(patch) {
    this.send({ type: "update", ...patch });
  }

  waitFor(predicate, timeoutMs = 8000) {
    const hit = this.inbox.find(predicate);
    if (hit) return Promise.resolve(hit);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._waiters = this._waiters.filter((w) => w.timer !== timer);
        reject(new Error(`WS wait timeout (${this.label || "client"})`));
      }, timeoutMs);
      this._waiters.push({ predicate, resolve, reject, timer });
    });
  }

  close() {
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
  }
}

function makeGatheringPlayer(name = "Gather Hero") {
  const p = makeTestPlayer(name);
  p.professions = ["harvester"];
  p.professionProgress = { harvester: { level: 5, xp: 0 } };
  p.level = 10;
  p.skillPoints = 10;
  p.str = 18;
  p.vit = 12;
  p.hp = 200;
  p.maxHp = 200;
  return p;
}

async function abandonActiveCombat(token) {
  for (let slot = 0; slot < SLOT_COUNT; slot++) {
    const resume = await api("/api/combat/resume", {
      method: "POST",
      token,
      body: { slotIndex: slot }
    });
    const sessionId = resume.data?.sessionId;
    if (resume.res.ok && sessionId) {
      await api("/api/combat/action", {
        method: "POST",
        token,
        body: { sessionId, action: { type: "forfeit" } }
      });
      return true;
    }
  }
  return false;
}

async function runCoopCombatUntilFinished(hostToken, joinerToken, hostUserId, joinerUserId, sessionId, state, maxTurns = 100) {
  let readyHost = await api("/api/combat/action", {
    method: "POST",
    token: hostToken,
    body: { sessionId, action: { type: "ready" } }
  });
  if (!readyHost.res.ok) return { error: readyHost.data?.error || "host ready failed" };

  let currentState = readyHost.data?.state || state;
  let finished = !!readyHost.data?.finished;
  let result = readyHost.data?.result;
  let turns = 0;

  while (!finished && turns < maxTurns) {
    turns++;
    if (currentState?.phase === "player") {
      const activeUid = currentState.activePartyUid;
      const activeMember = (currentState.party || []).find((m) => m && m.uid === activeUid);
      const actorToken =
        activeMember && activeMember.controllerUserId != null
          ? Number(activeMember.controllerUserId) === Number(joinerUserId)
            ? joinerToken
            : hostToken
          : hostToken;
      const foe = (currentState.foes || []).find((f) => f && f.hp > 0);
      if (!foe) break;
      const actionRes = await api("/api/combat/action", {
        method: "POST",
        token: actorToken,
        body: { sessionId, action: { type: "attack", targetUid: foe.uid } }
      });
      if (!actionRes.res.ok) return { error: actionRes.data?.error, turns };
      currentState = actionRes.data?.state;
      finished = !!actionRes.data?.finished;
      result = actionRes.data?.result;
    } else if (currentState?.phase === "enemy") {
      await new Promise((r) => setTimeout(r, 50));
      const poll = await api(`/api/combat/${sessionId}`, { token: hostToken });
      currentState = poll.data?.state || currentState;
      if (currentState?.phase === "player") continue;
      const passRes = await api("/api/combat/action", {
        method: "POST",
        token: hostToken,
        body: { sessionId, action: { type: "pass" } }
      });
      if (passRes.res.ok) {
        currentState = passRes.data?.state || currentState;
        finished = !!passRes.data?.finished;
        result = passRes.data?.result;
      }
    } else {
      break;
    }
  }
  return { finished, result, turns, state: currentState };
}

async function fightUntilGatherXp(token, slotIndex, maxAttempts = 6) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await abandonActiveCombat(token);
    const start = await api("/api/combat/start", {
      method: "POST",
      token,
      body: {
        slotIndex,
        encounter: {
          units: [
            { name: "Tide Hopper", level: 2 },
            { name: "Tide Hopper", level: 2 },
            { name: "Tide Hopper", level: 2 },
            { name: "Tide Hopper", level: 2 },
            { name: "Tide Hopper", level: 2 },
            { name: "Tide Hopper", level: 2 }
          ]
        },
        region: { name: "Test Coast", enemyScale: 1 }
      }
    });
    if (!start.res.ok) return { error: start.data?.error, attempt };
    const fight = await runCombatUntilFinished(token, start.data.sessionId, 120);
    if (!fight.finished) return { error: fight.error || "fight incomplete", attempt };
    let harvestXp = fight.roster?.slots?.[slotIndex]?.professionProgress?.harvester?.xp ?? 0;
    const gatherEvents = (fight.result?.memberRewards || []).flatMap((m) => m.gatherEvents || []);
    if (harvestXp <= 0 && gatherEvents.length === 0) {
      const rosterSnap = await api("/api/roster", { token });
      harvestXp = rosterSnap.data?.roster?.slots?.[slotIndex]?.professionProgress?.harvester?.xp ?? 0;
    }
    if (harvestXp > 0 || gatherEvents.length > 0) {
      return { harvestXp, gatherEvents, attempt, victory: fight.result };
    }
  }
  return { harvestXp: 0, gatherEvents: [], attempt: maxAttempts };
}

async function runCombatUntilFinished(token, sessionId, maxTurns = 80) {
  let ready = await api("/api/combat/action", {
    method: "POST",
    token,
    body: { sessionId, action: { type: "ready" } }
  });
  if (!ready.res.ok) {
    return { error: ready.data?.error || "ready failed", ready };
  }

  let state = ready.data?.state;
  let finished = !!ready.data?.finished;
  let result = ready.data?.result;
  let roster = ready.data?.roster;
  let turns = 0;

  while (!finished && turns < maxTurns) {
    turns++;
    if (state?.phase === "player") {
      const foe = (state.foes || []).find((f) => f && f.hp > 0);
      if (!foe) break;
      const actionRes = await api("/api/combat/action", {
        method: "POST",
        token,
        body: {
          sessionId,
          action: { type: "attack", targetUid: foe.uid }
        }
      });
      if (!actionRes.res.ok) return { error: actionRes.data?.error, turns, actionRes };
      state = actionRes.data?.state;
      finished = !!actionRes.data?.finished;
      result = actionRes.data?.result;
      if (actionRes.data?.roster) roster = actionRes.data.roster;
    } else if (state?.phase === "enemy" || state?.phase === "prep") {
      const passRes = await api("/api/combat/action", {
        method: "POST",
        token,
        body: { sessionId, action: { type: "pass" } }
      });
      if (!passRes.res.ok && passRes.res.status !== 400) {
        return { error: passRes.data?.error, turns, passRes };
      }
      state = passRes.data?.state || state;
      finished = !!passRes.data?.finished;
      result = passRes.data?.result;
      if (passRes.data?.roster) roster = passRes.data.roster;
    } else {
      break;
    }
  }

  return { finished, result, turns, state, roster };
}

async function main() {
  console.log(`Full API smoke → ${API}`);
  console.log(`Accounts: ${EMAIL_A}, ${EMAIL_B}`);

  section("Infrastructure");
  try {
    const health = await api("/api/health");
    if (health.res.ok && health.data?.ok) ok("GET /api/health");
    else fail("GET /api/health", health.res.status);
  } catch (err) {
    fail("GET /api/health", err.message);
    console.error("\nStart the server: cd server && npm start");
    process.exit(1);
  }

  const world = await api("/api/world");
  if (world.res.ok && Array.isArray(world.data?.shards) && world.data.shards.length) {
    ok("GET /api/world", world.data.shards[0].label || "shard");
  } else fail("GET /api/world");

  const presenceStats = await api("/api/presence/stats");
  if (presenceStats.res.ok) ok("GET /api/presence/stats", `${presenceStats.data?.connected ?? 0} online`);

  const unauth = await api("/api/roster");
  if (unauth.res.status === 401) ok("Auth required for roster");
  else fail("Auth required for roster", `got ${unauth.res.status}`);

  const badLogin = await api("/api/auth/login", {
    method: "POST",
    body: { email: EMAIL_A, password: "wrong-password" }
  });
  if (badLogin.res.status === 401) ok("Login rejects bad password");
  else fail("Login rejects bad password", badLogin.res.status);

  section("Auth & accounts");
  const userA = await registerOrLogin(EMAIL_A);
  ok("Register/login user A", userA.email);

  const userB = await registerOrLogin(EMAIL_B);
  ok("Register/login user B", userB.email);

  const meA = await api("/api/auth/me", { token: userA.token });
  if (meA.res.ok && meA.data?.email) ok("GET /api/auth/me", meA.data.email);
  else fail("GET /api/auth/me");

  section("Roster");
  const rosterGet = await api("/api/roster", { token: userA.token });
  if (!rosterGet.res.ok) {
    fail("GET /api/roster", rosterGet.data?.error);
    process.exit(1);
  }
  let revision = rosterGet.data?.revision ?? 0;
  ok("GET /api/roster", `revision ${revision}`);

  const conflict = await api("/api/roster", {
    method: "PUT",
    token: userA.token,
    body: { roster: emptyRoster(), baseRevision: revision + 999 }
  });
  if (conflict.res.status === 409 && conflict.data?.roster) ok("PUT /api/roster revision conflict");
  else fail("PUT /api/roster revision conflict", conflict.res.status);

  const rosterPut = await api("/api/roster", {
    method: "PUT",
    token: userA.token,
    body: {
      roster: {
        version: 1,
        slots: [makeTestPlayer(), makeGatheringPlayer("Gather Hero"), null, null, null]
      },
      baseRevision: revision
    }
  });
  if (rosterPut.res.ok && rosterPut.data?.roster?.slots?.[0]?.name === "Smoke Hero") {
    ok("PUT /api/roster create characters");
    revision = rosterPut.data.revision ?? revision;
  } else fail("PUT /api/roster create characters", rosterPut.data?.error);

  const rosterPutB = await api("/api/roster", {
    method: "PUT",
    token: userB.token,
    body: {
      roster: {
        version: 1,
        slots: [makeTestPlayer("Buyer Hero"), null, null, null, null]
      },
      baseRevision: 0
    }
  });
  if (rosterPutB.res.ok) ok("PUT /api/roster user B");
  else fail("PUT /api/roster user B", rosterPutB.data?.error);

  const slotIndex = 0;
  const gatherSlotIndex = 1;

  section("MMO features & economy");
  const features = await api("/api/mmo/features", { token: userA.token });
  if (features.res.ok && features.data?.features?.market) ok("GET /api/mmo/features");
  else fail("GET /api/mmo/features");
  if (features.data?.features?.trade?.status === "live") ok("trade feature live (WebSocket)");
  else fail("trade feature status", features.data?.features?.trade?.status);

  const arena = await api("/api/arena/queue", { method: "POST", token: userA.token, body: {} });
  if (arena.res.status === 501) ok("POST /api/arena/queue (planned stub)");
  else fail("POST /api/arena/queue", arena.res.status);

  const trade = await api("/api/trade/offer", { method: "POST", token: userA.token, body: {} });
  if (trade.res.status === 501) ok("POST /api/trade/offer (REST stub; use WebSocket)");
  else fail("POST /api/trade/offer", trade.res.status);

  const alliance = await api("/api/alliance/create", { method: "POST", token: userA.token, body: {} });
  if (alliance.res.status === 501) ok("POST /api/alliance/create (planned stub)");
  else fail("POST /api/alliance/create", alliance.res.status);

  section("Player progression");
  const heal = await api("/api/player/heal", {
    method: "POST",
    token: userA.token,
    body: { slotIndex }
  });
  const healedHp = heal.data?.roster?.slots?.[slotIndex]?.hp;
  const healedMax = heal.data?.roster?.slots?.[slotIndex]?.maxHp;
  if (heal.res.ok && healedHp === healedMax && healedHp > 40) ok("POST /api/player/heal", `${healedHp}/${healedMax}`);
  else fail("POST /api/player/heal", heal.data?.error || `${healedHp}/${healedMax}`);

  const spend = await api("/api/player/spend-stat", {
    method: "POST",
    token: userA.token,
    body: { slotIndex, statKey: "str", amount: 1 }
  });
  const strAfter = spend.data?.roster?.slots?.[slotIndex]?.str;
  if (spend.res.ok && strAfter === 6) ok("POST /api/player/spend-stat", "STR 6");
  else fail("POST /api/player/spend-stat", spend.data?.error || `str=${strAfter}`);

  const skill = await api("/api/player/upgrade-skill", {
    method: "POST",
    token: userA.token,
    body: { slotIndex, skillName: "Shield Bash" }
  });
  const shieldRank = skill.data?.roster?.slots?.[slotIndex]?.classSkillLevels?.["Shield Bash"];
  if (skill.res.ok && shieldRank === 1) ok("POST /api/player/upgrade-skill", "Shield Bash rank 1");
  else fail("POST /api/player/upgrade-skill", skill.data?.error || `rank=${shieldRank}`);

  const craft = await api("/api/player/craft", {
    method: "POST",
    token: userA.token,
    body: { slotIndex, recipeId: "minor_healing_draught", quantity: 1, crafterTarget: "hero" }
  });
  const invAfterCraft = craft.data?.roster?.slots?.[slotIndex]?.inventory || [];
  if (craft.res.ok && invAfterCraft.some((i) => String(i).includes("Minor Healing Draught"))) {
    ok("POST /api/player/craft", "Minor Healing Draught");
  } else fail("POST /api/player/craft", craft.data?.error);

  const equip = await api("/api/player/equip", {
    method: "POST",
    token: userA.token,
    body: { slotIndex, itemName: "Rusty Sword", preferredSlot: "weapon" }
  });
  const weapon = equip.data?.roster?.slots?.[slotIndex]?.equipment?.weapon;
  if (equip.res.ok && weapon === "Rusty Sword") ok("POST /api/player/equip", "Rusty Sword");
  else fail("POST /api/player/equip", equip.data?.error || weapon);

  const unequip = await api("/api/player/unequip", {
    method: "POST",
    token: userA.token,
    body: { slotIndex, equipSlot: "weapon" }
  });
  const weaponAfter = unequip.data?.roster?.slots?.[slotIndex]?.equipment?.weapon;
  if (unequip.res.ok && !weaponAfter) ok("POST /api/player/unequip");
  else fail("POST /api/player/unequip", unequip.data?.error);

  section("World");
  const move = await api("/api/world/move", {
    method: "POST",
    token: userA.token,
    body: { slotIndex, x: 37, y: 55, reason: "step" }
  });
  if (move.res.ok && move.data?.roster?.slots?.[slotIndex]?.worldMap?.x === 37) {
    ok("POST /api/world/move", "(37, 55)");
  } else fail("POST /api/world/move", move.data?.error);

  const pickupBad = await api("/api/world/pickup", {
    method: "POST",
    token: userA.token,
    body: { slotIndex, x: 37, y: 55, elementId: "fake_pickup", itemName: "Residue" }
  });
  if (pickupBad.res.status === 400) ok("POST /api/world/pickup rejects unknown pickup");
  else fail("POST /api/world/pickup gate", pickupBad.res.status);

  const pickupGood = await api("/api/world/pickup", {
    method: "POST",
    token: userA.token,
    body: { slotIndex, x: 37, y: 55, elementId: "shore_salt_crust", itemName: "Residue" }
  });
  const invAfterPickup = pickupGood.data?.roster?.slots?.[slotIndex]?.inventory || [];
  if (pickupGood.res.ok && invAfterPickup.includes("Residue")) {
    ok("POST /api/world/pickup", "shore_salt_crust → Residue");
  } else {
    fail("POST /api/world/pickup", pickupGood.data?.error || "item missing");
  }

  section("WebSocket — party, chat, craft commission");
  let clientA = null;
  let clientB = null;
  try {
    clientA = new PresenceClient(userA.token, "A");
    clientB = new PresenceClient(userB.token, "B");
    await clientA.connect();
    await clientB.connect();
    ok("Dual WebSocket presence", `users ${clientA.userId}, ${clientB.userId}`);

    const adventure = { page: "adventure", slotIndex: 0, x: 37, y: 55 };
    clientA.updatePresence({ ...adventure, name: "Smoke Hero" });
    clientB.updatePresence({ ...adventure, name: "Buyer Hero", slotIndex: 0 });
    await new Promise((r) => setTimeout(r, 250));

    clientA.send({ type: "party_invite", targetUserId: clientB.userId, targetName: "Buyer Hero" });
    const partyResult = await clientA.waitFor((m) => m.type === "party_result");
    if (partyResult.ok) ok("WS party_invite");
    else fail("WS party_invite", partyResult.message);

    const partyInvite = await clientB.waitFor((m) => m.type === "party_invite");
    if (partyInvite.fromUserId === clientA.userId) ok("WS party_invite received");
    else fail("WS party_invite received");

    clientB.send({ type: "party_accept" });
    const partyAccept = await clientB.waitFor((m) => m.type === "party_result" && m.ok === true);
    if (partyAccept.ok) ok("WS party_accept");
    else fail("WS party_accept", partyAccept.message);

    const partyState = await clientA.waitFor((m) => m.type === "party_state" && m.party?.members?.length >= 2);
    if (partyState.party?.members?.length >= 2) ok("WS party_state", `${partyState.party.members.length} members`);
    else fail("WS party_state");

    const chatText = `smoke-${RUN_ID}`;
    clientA.send({ type: "chat", channel: "local", text: chatText });
    const chatMsg = await clientB.waitFor((m) => m.type === "chat" && m.text === chatText);
    if (chatMsg.channel === "local") ok("WS local chat");
    else fail("WS local chat");

    clientA.send({ type: "chat", channel: "world", text: `world-${chatText}` });
    const worldChat = await clientB.waitFor((m) => m.type === "chat" && m.channel === "world");
    if (worldChat.text?.includes(chatText)) ok("WS world chat");
    else fail("WS world chat");

    await abandonActiveCombat(userA.token);
    await abandonActiveCombat(userB.token);

    clientA.send({
      type: "craft_invite",
      targetUserId: clientB.userId,
      requesterSlotIndex: slotIndex,
      recipeId: "minor_healing_draught",
      quantity: 1,
      goldOffer: 10
    });
    const craftSend = await clientA.waitFor((m) => m.type === "craft_result");
    if (craftSend.ok) ok("WS craft_invite");
    else fail("WS craft_invite", craftSend.message);

    try {
      await clientB.waitFor((m) => m.type === "craft_invite", 12000);
      clientB.send({ type: "craft_accept", crafterTarget: "hero" });
      const craftDone = await clientB.waitFor(
        (m) => m.type === "craft_result" && m.ok === true,
        12000
      );
      if (craftDone.ok) ok("WS craft_accept commission");
      else fail("WS craft_accept", craftDone.message);
    } catch (err) {
      fail("WS craft commission", err.message);
    }

    try {
      await abandonActiveCombat(userA.token);
      await abandonActiveCombat(userB.token);
      const coopStart = await api("/api/combat/start", {
        method: "POST",
        token: userA.token,
        body: {
          slotIndex,
          encounter: { units: [{ name: "Saltwind Skimmer", level: 1 }] },
          region: { name: "Coop Test", enemyScale: 1 }
        }
      });
      const coopSessionId = coopStart.data?.sessionId;
      if (!coopStart.res.ok || !coopSessionId) {
        fail("Co-op combat prep", coopStart.data?.error);
      } else {
        const coopJoin = await api("/api/combat/join", {
          method: "POST",
          token: userB.token,
          body: { sessionId: coopSessionId, slotIndex: 0 }
        });
        const partCount = coopJoin.data?.state?.party?.filter((m) => m?.kind === "hero")?.length || 0;
        if (coopJoin.res.ok && partCount >= 2) ok("POST /api/combat/join co-op", `${partCount} heroes`);
        else fail("POST /api/combat/join co-op", coopJoin.data?.error);

        const coopFight = await runCoopCombatUntilFinished(
          userA.token,
          userB.token,
          clientA.userId,
          clientB.userId,
          coopSessionId,
          coopJoin.data?.state
        );
        if (coopFight.finished && coopFight.result?.victory) {
          ok("Co-op fight to victory", `${coopFight.turns} turns`);
        } else {
          fail("Co-op fight to victory", coopFight.error || "no victory");
        }
      }
    } catch (err) {
      fail("Co-op combat", err.message);
    }
  } catch (err) {
    fail("WebSocket social suite", err.message);
  } finally {
    clientA?.close();
    clientB?.close();
  }

  section("Dungeon");
  let dungeonWs = null;
  try {
    dungeonWs = new PresenceClient(userA.token, "A-dungeon");
    await dungeonWs.connect();
    dungeonWs.updatePresence({
      page: "adventure",
      slotIndex,
      name: "Smoke Hero",
      x: 37,
      y: 55
    });
    await new Promise((r) => setTimeout(r, 200));
  } catch (err) {
    fail("Dungeon presence reconnect", err.message);
  }

  const enterNoPresence = await api("/api/dungeon/enter", {
    method: "POST",
    token: userB.token,
    body: { dungeonId: "sunken_grotto", slotIndex: 0 }
  });
  if (enterNoPresence.res.status === 400) ok("POST /api/dungeon/enter rejects wrong tile");
  else fail("POST /api/dungeon/enter gate", enterNoPresence.res.status);

  if (dungeonWs) {
    const nearby = await api("/api/presence/nearby?x=37&y=55", { token: userA.token });
    if (nearby.res.ok && Array.isArray(nearby.data?.players)) ok("GET /api/presence/nearby");
    else fail("GET /api/presence/nearby");

    const enter = await api("/api/dungeon/enter", {
      method: "POST",
      token: userA.token,
      body: { dungeonId: "sunken_grotto", slotIndex }
    });
    if (enter.res.ok && enter.data?.dungeonRun?.id === "sunken_grotto") {
      ok("POST /api/dungeon/enter", "sunken_grotto");
    } else {
      fail("POST /api/dungeon/enter", enter.data?.error);
    }

    const leaveBlocked = await api("/api/dungeon/leave", {
      method: "POST",
      token: userA.token,
      body: { dungeonId: "sunken_grotto", slotIndex }
    });
    if (leaveBlocked.res.status === 400) ok("POST /api/dungeon/leave requires epilogue");
    else fail("POST /api/dungeon/leave gate", leaveBlocked.res.status);

    const leaveDefeat = await api("/api/dungeon/leave", {
      method: "POST",
      token: userA.token,
      body: { dungeonId: "sunken_grotto", slotIndex, afterDefeat: true }
    });
    if (leaveDefeat.res.ok && !leaveDefeat.data?.roster?.slots?.[slotIndex]?.worldMap?.dungeonRun) {
      ok("POST /api/dungeon/leave afterDefeat");
    } else fail("POST /api/dungeon/leave afterDefeat", leaveDefeat.data?.error);
  } else {
    skip("Dungeon enter/leave with presence", "no WebSocket");
  }

  dungeonWs?.close();

  section("Market & mail");
  const browse = await api("/api/market/listings", { token: userA.token });
  if (browse.res.ok && Array.isArray(browse.data?.listings)) ok("GET /api/market/listings");
  else fail("GET /api/market/listings");

  const myListingsEmpty = await api("/api/market/my-listings?slotIndex=0", { token: userA.token });
  if (myListingsEmpty.res.ok) ok("GET /api/market/my-listings");
  else fail("GET /api/market/my-listings");

  const list = await api("/api/market/list", {
    method: "POST",
    token: userA.token,
    body: { slotIndex, itemName: "Minor Healing Draught", quantity: 1, price: 25 }
  });
  const listingId = list.data?.result?.listingId;
  if (list.res.ok && listingId) ok("POST /api/market/list", `listing #${listingId}`);
  else fail("POST /api/market/list", list.data?.error);

  if (listingId) {
    const buy = await api("/api/market/buy", {
      method: "POST",
      token: userB.token,
      body: { slotIndex: 0, listingId }
    });
    if (buy.res.ok) ok("POST /api/market/buy", "user B purchased");
    else fail("POST /api/market/buy", buy.data?.error);
  }

  const list2 = await api("/api/market/list", {
    method: "POST",
    token: userA.token,
    body: { slotIndex, itemName: "Rusty Sword", quantity: 1, price: 30 }
  });
  let listingId2 = list2.data?.result?.listingId;
  if (!listingId2) {
    const listResidue = await api("/api/market/list", {
      method: "POST",
      token: userA.token,
      body: { slotIndex, itemName: "Residue", quantity: 3, price: 5 }
    });
    listingId2 = listResidue.data?.result?.listingId;
  }
  if (listingId2) {
    const cancel = await api("/api/market/cancel", {
      method: "POST",
      token: userA.token,
      body: { slotIndex, listingId: listingId2 }
    });
    if (cancel.res.ok) ok("POST /api/market/cancel");
    else fail("POST /api/market/cancel", cancel.data?.error);
  } else {
    skip("POST /api/market/cancel", "no listing to cancel");
  }

  const mail = await api("/api/mail?limit=20", { token: userA.token });
  if (mail.res.ok && Array.isArray(mail.data?.mail)) {
    ok("GET /api/mail", `${mail.data.mail.length} messages`);
  } else fail("GET /api/mail");

  const mailRead = await api("/api/mail/read", {
    method: "POST",
    token: userA.token,
    body: { all: true }
  });
  if (mailRead.res.ok && mailRead.data?.unreadCount === 0) ok("POST /api/mail/read");
  else fail("POST /api/mail/read");

  section("Gathering profession XP");
  await abandonActiveCombat(userA.token);
  const gather = await fightUntilGatherXp(userA.token, gatherSlotIndex, 8);
  if (gather.harvestXp > 0 || gather.gatherEvents?.length > 0) {
    ok(
      "Harvester XP from combat",
      `xp=${gather.harvestXp}, events=${gather.gatherEvents?.length || 0}, attempt ${gather.attempt}`
    );
  } else {
    fail("Harvester XP from combat", gather.error || "no gather XP after retries");
  }

  section("Combat (solo)");
  await abandonActiveCombat(userA.token);
  await abandonActiveCombat(userB.token);
  const resumeEmpty = await api("/api/combat/resume", {
    method: "POST",
    token: userA.token,
    body: { slotIndex }
  });
  if (resumeEmpty.res.ok && resumeEmpty.data?.resumed === false) ok("POST /api/combat/resume (none active)");
  else fail("POST /api/combat/resume", resumeEmpty.res.status);

  const partySession = await api("/api/combat/party-session", { token: userA.token });
  if (partySession.res.ok) ok("GET /api/combat/party-session");

  const combatStart = await api("/api/combat/start", {
    method: "POST",
    token: userA.token,
    body: {
      slotIndex,
      encounter: { units: [{ name: "Saltwind Skimmer", level: 1 }] },
      region: { name: "Test Coast", enemyScale: 1 }
    }
  });
  const sessionId = combatStart.data?.sessionId;
  if (combatStart.res.ok && sessionId) ok("POST /api/combat/start", sessionId.slice(0, 12));
  else {
    fail("POST /api/combat/start", combatStart.data?.error);
    process.exit(failed > 0 ? 1 : 0);
  }

  const sessionGet = await api(`/api/combat/${sessionId}`, { token: userA.token });
  if (sessionGet.res.ok && sessionGet.data?.state) ok("GET /api/combat/:sessionId");
  else fail("GET /api/combat/:sessionId");

  const joinBad = await api("/api/combat/join", {
    method: "POST",
    token: userB.token,
    body: { sessionId: "invalid_session", slotIndex: 0 }
  });
  if (joinBad.res.status === 404 || joinBad.res.status === 400) ok("POST /api/combat/join rejects invalid session");
  else fail("POST /api/combat/join gate", joinBad.res.status);

  const fight = await runCombatUntilFinished(userA.token, sessionId);
  if (fight.finished && fight.result?.victory) {
    ok("POST /api/combat/action fight to victory", `${fight.turns} turns, gold +${fight.result.gold ?? 0}`);
  } else {
    fail("Combat victory", fight.error || `finished=${fight.finished} victory=${fight.result?.victory}`);
  }

  const blockedHeal = await api("/api/player/heal", {
    method: "POST",
    token: userA.token,
    body: { slotIndex }
  });
  if (blockedHeal.res.status === 409) ok("Progression blocked during combat");
  else if (blockedHeal.res.ok) ok("Progression after combat ended");
  else skip("Combat lock check", blockedHeal.data?.error);

  section("Economy audit");
  const history = await api("/api/economy/history?limit=10", { token: userA.token });
  if (history.res.ok && Array.isArray(history.data?.events) && history.data.events.length > 0) {
    ok("GET /api/economy/history", `${history.data.events.length} events`);
  } else fail("GET /api/economy/history");

  console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
