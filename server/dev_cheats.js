/** Dev-only cheat gates (dungeon key skip, room skip, etc.). Disabled when DEV_CHEATS=0. */

export function isLocalDevRequest(req) {
  const ip = String(req.ip || req.socket?.remoteAddress || "");
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1" ||
    ip.endsWith("127.0.0.1")
  );
}

function isDevCheatFlagged(req) {
  return req.body?.devCheat === true || req.body?.skipDungeonKey === true;
}

/** Client dev-cheat requests (dungeon key skip, room skip, etc.). Set DEV_CHEATS=0 on production VPS. */
export function allowDevCheat(req) {
  if (process.env.DEV_CHEATS === "0" || process.env.DEV_CHEATS === "false") return false;
  return isDevCheatFlagged(req);
}

/** @deprecated alias — use allowDevCheat */
export function allowDungeonKeySkip(req) {
  return allowDevCheat(req);
}
