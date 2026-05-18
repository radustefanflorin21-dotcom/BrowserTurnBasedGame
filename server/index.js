import http from "node:http";
import express from "express";
import cors from "cors";
import { registerAuthRoutes } from "./auth.js";
import { registerRosterRoutes } from "./roster.js";
import { registerCombatRoutes } from "./combat_routes.js";
import { registerPresenceRoutes } from "./presence/routes.js";
import { attachPresenceWebSocket } from "./presence/ws.js";
import { loadGameConfig } from "./load_game_config.js";
import { loadWorldMapData } from "./load_world_map.js";
import { dbPath } from "./db.js";
import { getPresenceStats } from "./presence/hub.js";
import { getWorldShardInfo } from "./world/shard.js";

const PORT = Number(process.env.PORT) || 3001;
const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true
  })
);
app.use(express.json({ limit: "2mb" }));

loadGameConfig();
loadWorldMapData();

app.get("/api/health", (_req, res) => {
  const presence = getPresenceStats();
  res.json({
    ok: true,
    phase: 4,
    phaseStatus: "shared_presence_chat",
    database: dbPath,
    presenceOnline: presence.connected,
    ...getWorldShardInfo()
  });
});

/** Shard list for login / server picker (single shard today; extend for multi-server). */
app.get("/api/world", (_req, res) => {
  const shard = getWorldShardInfo();
  res.json({
    shards: [{ id: shard.worldId, label: shard.worldLabel, online: true }]
  });
});

registerAuthRoutes(app);
registerRosterRoutes(app);
registerCombatRoutes(app);
registerPresenceRoutes(app);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

const httpServer = http.createServer(app);
attachPresenceWebSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Browser RPG API listening on http://localhost:${PORT}`);
  console.log(`Presence WebSocket: ws://localhost:${PORT}/presence`);
  console.log(`SQLite database: ${dbPath}`);
});
