/**
 * World shard identity — one game server process hosts one shared overworld instance.
 * Later: multiple shards; clients pick shard at login via WORLD_ID / server list API.
 */
export const WORLD_SHARD_ID = String(process.env.WORLD_ID || "default").trim() || "default";
export const WORLD_SHARD_LABEL = String(process.env.WORLD_LABEL || "Main World").trim() || "Main World";

export function getWorldShardInfo() {
  return { worldId: WORLD_SHARD_ID, worldLabel: WORLD_SHARD_LABEL };
}
