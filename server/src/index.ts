import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { config } from "./config.js";
import { pool, query } from "./db/client.js";
import { redis, redisSub, redisPub } from "./db/redis.js";
import { sessionMiddleware } from "./middleware/session.js";
import { engineClient } from "./services/engine-client.js";
import { getOrInitRating } from "./services/elo-service.js";

// Route imports
import agentsRouter from "./routes/agents.js";
import matchesRouter from "./routes/matches.js";
import gamesRouter from "./routes/games.js";
import leaderboardRouter from "./routes/leaderboard.js";
import tournamentRouter from "./routes/tournament.js";
import bettingRouter from "./routes/betting.js";
import walletRouter from "./routes/wallet.js";

// WebSocket
import { setupWebSocket } from "./ws/game-socket.js";

// ---------------------------------------------------------------------------
// Derive __dirname for ESM
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Express application
// ---------------------------------------------------------------------------
const app = express();

// -- Middleware ---------------------------------------------------------------
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(sessionMiddleware);

// -- Routes ------------------------------------------------------------------
app.use("/api/agents", agentsRouter);
app.use("/api/match", matchesRouter);
app.use("/api/games", gamesRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/tournament", tournamentRouter);
app.use("/api", bettingRouter); // mounts /api/markets/:game_id, /api/bets, /api/bets/mine
app.use("/api/wallet", walletRouter);

// -- Health check ------------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// HTTP server + WebSocket
// ---------------------------------------------------------------------------
const server = http.createServer(app);
setupWebSocket(server);

// ---------------------------------------------------------------------------
// Initialization helpers
// ---------------------------------------------------------------------------

/**
 * Run the database migration by reading and executing the SQL file.
 */
async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname, "db", "migrations");
  const sqlFile = path.join(migrationsDir, "001_init.sql");

  try {
    const sql = fs.readFileSync(sqlFile, "utf-8");
    await query(sql);
    console.log("Database migration completed successfully");
  } catch (err: unknown) {
    // If the tables already exist, that's fine (CREATE TABLE without IF NOT EXISTS
    // will throw "already exists" errors). Check for that specific case.
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("already exists")) {
      console.log("Database tables already exist, skipping migration");
    } else {
      throw err;
    }
  }
}

/**
 * Register all agents from the engine in the ratings table so they
 * appear on the leaderboard even before their first game.
 */
async function registerAgents(): Promise<void> {
  try {
    const agents = await engineClient.getAgents();

    for (const agent of agents) {
      await getOrInitRating(agent.name);
    }

    console.log(
      `Registered ${agents.length} agent(s): ${agents.map((a) => a.name).join(", ")}`,
    );
  } catch (err) {
    console.warn(
      "Could not register agents from engine (engine may not be running yet):",
      err instanceof Error ? err.message : err,
    );
  }
}

// ---------------------------------------------------------------------------
// Start-up
// ---------------------------------------------------------------------------
async function start(): Promise<void> {
  // 1. Redis connects automatically (lazyConnect: false in db/redis.ts).
  console.log("Redis clients initialising...");

  // 2. Run database migrations.
  await runMigrations();

  // 3. Register agents from the engine.
  await registerAgents();

  // 4. Start listening.
  server.listen(config.PORT, () => {
    console.log(`Chess Arena server listening on port ${config.PORT}`);
    console.log(`  HTTP:  http://localhost:${config.PORT}`);
    console.log(`  WS:    ws://localhost:${config.PORT}/ws/game/:id`);
    console.log(`  Health: http://localhost:${config.PORT}/health`);
  });
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received — shutting down gracefully...`);

  // Stop accepting new connections.
  server.close(() => {
    console.log("HTTP server closed");
  });

  // Close Redis connections.
  try {
    await redis.quit();
    await redisSub.quit();
    await redisPub.quit();
    console.log("Redis connections closed");
  } catch (err) {
    console.error("Error closing Redis:", err);
  }

  // Close the Postgres pool.
  try {
    await pool.end();
    console.log("PostgreSQL pool closed");
  } catch (err) {
    console.error("Error closing PostgreSQL pool:", err);
  }

  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ---------------------------------------------------------------------------
// Launch
// ---------------------------------------------------------------------------
start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
