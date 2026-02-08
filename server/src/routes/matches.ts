import { Router } from "express";
import { matchOrchestrator } from "../services/match-orchestrator.js";
import { getGameState } from "../services/cache.js";
import { query } from "../db/client.js";

const router = Router();

/**
 * POST /api/match
 *
 * Start a new match between two agents. The orchestrator creates the game
 * in the engine, inserts a Postgres row, and runs the game loop in the
 * background. Clients should subscribe to the WebSocket channel
 * /ws/game/:id for real-time move updates.
 *
 * Body: { white: string, black: string, move_delay?: number }
 * Returns: { game_id: string }
 */
router.post("/", async (req, res) => {
  try {
    const { white, black, move_delay } = req.body as {
      white?: string;
      black?: string;
      move_delay?: number;
    };

    if (!white || !black) {
      res.status(400).json({
        error: "Both 'white' and 'black' agent names are required",
      });
      return;
    }

    if (typeof white !== "string" || typeof black !== "string") {
      res.status(400).json({ error: "'white' and 'black' must be strings" });
      return;
    }

    const moveDelay =
      move_delay !== undefined ? Math.max(0, Math.floor(move_delay)) : 1000;

    // startMatch returns the database game ID immediately, then runs
    // the game loop asynchronously in the background.
    const gameId = await matchOrchestrator.startMatch(white, black, moveDelay);

    res.status(201).json({ game_id: gameId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Failed to start match:", err);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/match/:id
 *
 * Get the current state of a match (active or completed).
 * Checks the Redis cache first for in-progress games, then falls back to
 * Postgres for completed (or not-yet-started) games.
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: "Match ID is required" });
      return;
    }

    // Try to get live state from Redis cache (populated by the orchestrator).
    const cachedState = await getGameState(id);
    if (cachedState) {
      res.json({
        game_id: id,
        status: cachedState["is_over"] ? "completed" : "in_progress",
        ...cachedState,
      });
      return;
    }

    // Fall back to Postgres for completed or pending games.
    const dbResult = await query<{
      id: string;
      white: string;
      black: string;
      result: string | null;
      moves: string[];
      timestamps: number[];
      fen_final: string | null;
      move_count: number;
      created_at: string;
    }>(
      `SELECT id, white, black, result, moves, timestamps,
              fen_final, move_count, created_at::text
         FROM games
        WHERE id = $1`,
      [id],
    );

    if (dbResult.rows.length === 0) {
      res.status(404).json({ error: "Match not found" });
      return;
    }

    const game = dbResult.rows[0]!;

    res.json({
      game_id: game.id,
      status: game.result ? "completed" : "pending",
      white: game.white,
      black: game.black,
      result: game.result,
      moves: game.moves,
      timestamps: game.timestamps,
      fen: game.fen_final,
      move_count: game.move_count,
      created_at: game.created_at,
    });
  } catch (err) {
    console.error("Failed to get match state:", err);
    res.status(500).json({ error: "Failed to retrieve match state" });
  }
});

export default router;
