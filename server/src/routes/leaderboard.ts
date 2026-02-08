import { Router } from "express";
import { getLeaderboard } from "../services/elo-service.js";

const router = Router();

/**
 * GET /api/leaderboard
 *
 * Returns ELO rankings for all agents, sorted by ELO descending.
 * Results are cached in Redis with a 30-second TTL (handled by
 * the elo-service via the cache-aside pattern in cache.ts).
 *
 * Returns: Array<{ name, elo, wins, losses, draws, games }>
 */
router.get("/", async (_req, res) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json(leaderboard);
  } catch (err) {
    console.error("Failed to fetch leaderboard:", err);
    res.status(500).json({ error: "Failed to retrieve leaderboard" });
  }
});

export default router;
