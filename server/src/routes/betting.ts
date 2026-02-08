import { Router } from "express";
import { getMarkets, placeBet } from "../services/betting-engine.js";
import { query } from "../db/client.js";
import type { Bet } from "../types/index.js";

const router = Router();

/**
 * GET /api/markets/:game_id
 *
 * Get the current betting markets and odds for a game.
 * Returns outcome, move_count, and next_move odds.
 */
router.get("/markets/:game_id", async (req, res) => {
  try {
    const { game_id } = req.params;

    if (!game_id) {
      res.status(400).json({ error: "Game ID is required" });
      return;
    }

    const markets = await getMarkets(game_id);

    res.json({
      game_id,
      markets,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message.includes("not found")) {
      res.status(404).json({ error: message });
      return;
    }

    console.error("Failed to get markets:", err);
    res.status(500).json({ error: "Failed to retrieve betting markets" });
  }
});

/**
 * POST /api/bets
 *
 * Place a bet on a game. Uses session middleware to identify the wallet.
 *
 * Body: { game_id, bet_type, selection, stake }
 *   bet_type: "outcome" | "move_count" | "next_move"
 *   selection: depends on bet_type
 *     outcome:    "1-0" | "0-1" | "1/2-1/2"
 *     move_count: "1-20" | "21-40" | "41-60" | "61-80" | "80+"
 *     next_move:  "pawn" | "knight" | "bishop" | "rook" | "queen" | "king"
 *   stake: number (positive, deducted from wallet)
 *
 * Returns: the created Bet object
 */
router.post("/bets", async (req, res) => {
  try {
    const { game_id, bet_type, selection, stake } = req.body as {
      game_id?: string;
      bet_type?: string;
      selection?: string;
      stake?: number;
    };

    if (!game_id || !bet_type || !selection || stake === undefined) {
      res.status(400).json({
        error: "Fields 'game_id', 'bet_type', 'selection', and 'stake' are all required",
      });
      return;
    }

    if (typeof stake !== "number" || stake <= 0) {
      res.status(400).json({ error: "Stake must be a positive number" });
      return;
    }

    const validBetTypes = ["outcome", "move_count", "next_move"];
    if (!validBetTypes.includes(bet_type)) {
      res.status(400).json({
        error: `Invalid bet_type. Must be one of: ${validBetTypes.join(", ")}`,
      });
      return;
    }

    const bet = await placeBet(
      req.walletId,
      game_id,
      bet_type as "outcome" | "move_count" | "next_move",
      selection,
      stake,
    );

    res.status(201).json(bet);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (
      message.includes("not found") ||
      message.includes("Invalid") ||
      message.includes("Insufficient") ||
      message.includes("Cannot bet") ||
      message.includes("not available") ||
      message.includes("No legal moves")
    ) {
      res.status(400).json({ error: message });
      return;
    }

    console.error("Failed to place bet:", err);
    res.status(500).json({ error: "Failed to place bet" });
  }
});

/**
 * GET /api/bets/mine
 *
 * Get all bets for the current session's wallet (active + settled).
 */
router.get("/bets/mine", async (req, res) => {
  try {
    const result = await query<Bet>(
      `SELECT id, wallet_id, game_id, bet_type, selection, stake,
              odds, status, payout, created_at::text
         FROM bets
        WHERE wallet_id = $1
        ORDER BY created_at DESC`,
      [req.walletId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Failed to get user bets:", err);
    res.status(500).json({ error: "Failed to retrieve bets" });
  }
});

export default router;
