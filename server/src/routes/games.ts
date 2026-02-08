import { Router } from "express";
import { query } from "../db/client.js";
import type { GameSummary, GameDetail } from "../types/index.js";

const router = Router();

/**
 * GET /api/games
 *
 * List completed games, paginated by ?limit and ?offset, ordered by
 * created_at DESC (most recent first).
 *
 * Query params:
 *   limit  - max rows to return (default 20, max 100)
 *   offset - number of rows to skip (default 0)
 *
 * Returns: { games: GameSummary[], total: number }
 */
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(
      Math.max(1, parseInt(req.query["limit"] as string, 10) || 20),
      100,
    );
    const offset = Math.max(
      0,
      parseInt(req.query["offset"] as string, 10) || 0,
    );

    const [gamesResult, countResult] = await Promise.all([
      query<GameSummary>(
        `SELECT id, white, black, result, move_count, created_at::text
           FROM games
          WHERE result IS NOT NULL
          ORDER BY created_at DESC
          LIMIT $1 OFFSET $2`,
        [limit, offset],
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM games WHERE result IS NOT NULL`,
      ),
    ]);

    res.json({
      games: gamesResult.rows,
      total: parseInt(countResult.rows[0]?.count ?? "0", 10),
      limit,
      offset,
    });
  } catch (err) {
    console.error("Failed to list games:", err);
    res.status(500).json({ error: "Failed to retrieve games" });
  }
});

/**
 * GET /api/games/:id
 *
 * Full detail for a single game, including move list, timestamps,
 * and final FEN.
 *
 * Returns: GameDetail
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: "Game ID is required" });
      return;
    }

    const result = await query<GameDetail>(
      `SELECT id, white, black, result, move_count, created_at::text,
              moves, timestamps, fen_final
         FROM games
        WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    res.json(result.rows[0]!);
  } catch (err) {
    console.error("Failed to get game detail:", err);
    res.status(500).json({ error: "Failed to retrieve game" });
  }
});

export default router;
