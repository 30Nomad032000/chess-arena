import { query, getClient } from "../db/client.js";
import { redis } from "../db/redis.js";
import * as walletService from "./wallet-service.js";
import {
  getOrInitRating,
  calculateOutcomeOddsFromElo,
} from "./elo-service.js";
import type { Bet, MarketOdds } from "../types/index.js";

// --------------------------------------------------------------------------
// Odds helpers
// --------------------------------------------------------------------------

/**
 * Calculate decimal odds for outcome bets (1-0, 0-1, 1/2-1/2).
 * Delegates to the ELO service for the probability model,
 * then applies a 5% margin.
 */
export async function calculateOutcomeOdds(
  whiteElo: number,
  blackElo: number,
): Promise<Record<string, number>> {
  return calculateOutcomeOddsFromElo(whiteElo, blackElo, 0.05);
}

/**
 * Calculate decimal odds for move-count bracket bets.
 * Brackets: 1-20, 21-40, 41-60, 61-80, 80+.
 *
 * Uses a Poisson-like distribution centered on expectedMoves to assign
 * probabilities to each bracket, then converts to decimal odds with margin.
 */
export function calculateMoveCountOdds(
  expectedMoves: number = 40,
): Record<string, number> {
  const brackets: [string, number, number][] = [
    ["1-20", 1, 20],
    ["21-40", 21, 40],
    ["41-60", 41, 60],
    ["61-80", 61, 80],
    ["80+", 81, 200],
  ];

  const margin = 0.05;

  // Calculate raw probabilities using a normal-ish distribution.
  const sigma = expectedMoves * 0.4; // spread
  const rawProbs: number[] = brackets.map(([, lo, hi]) => {
    // Probability mass in [lo, hi] approximated by midpoint density.
    const mid = (lo + hi) / 2;
    const z = (mid - expectedMoves) / sigma;
    return Math.exp(-0.5 * z * z);
  });

  // Normalise.
  const totalRaw = rawProbs.reduce((s, p) => s + p, 0);
  const probs = rawProbs.map((p) => p / totalRaw);

  const result: Record<string, number> = {};
  const marginPerOutcome = margin / brackets.length;

  for (let i = 0; i < brackets.length; i++) {
    const key = brackets[i]![0];
    const prob = probs[i]!;
    const odds = parseFloat((1 / (prob + marginPerOutcome)).toFixed(2));
    result[key] = Math.max(1.01, odds);
  }

  return result;
}

/**
 * Calculate next-move odds by piece type based on the legal moves from a FEN.
 *
 * Accepts a FEN string and parses the legal-move list to determine which piece
 * types can move. Odds are proportional to the number of legal moves for each
 * piece type.
 *
 * Piece-type categories: pawn, knight, bishop, rook, queen, king.
 */
export function calculateNextMoveOdds(
  fen: string,
  legalMoves: string[] = [],
): Record<string, number> {
  if (legalMoves.length === 0) {
    return {};
  }

  // Parse the board from FEN to map squares to piece types.
  const boardPart = fen.split(" ")[0];
  if (!boardPart) return {};

  const pieceMap = new Map<string, string>(); // square -> piece type name
  const ranks = boardPart.split("/");

  const pieceTypeNames: Record<string, string> = {
    p: "pawn",
    n: "knight",
    b: "bishop",
    r: "rook",
    q: "queen",
    k: "king",
  };

  const files = "abcdefgh";

  for (let rankIdx = 0; rankIdx < ranks.length; rankIdx++) {
    let fileIdx = 0;
    const rank = ranks[rankIdx]!;
    for (const ch of rank) {
      if (ch >= "1" && ch <= "8") {
        fileIdx += parseInt(ch, 10);
      } else {
        const square = files[fileIdx]! + String(8 - rankIdx);
        const pieceType = pieceTypeNames[ch.toLowerCase()];
        if (pieceType) {
          pieceMap.set(square, pieceType);
        }
        fileIdx++;
      }
    }
  }

  // Count legal moves per piece type (source square determines the piece).
  const moveCounts: Record<string, number> = {};
  let totalMoves = 0;

  for (const move of legalMoves) {
    // UCI format: e.g. "e2e4", "g1f3", "e1g1" (castling).
    const from = move.substring(0, 2);
    const pieceType = pieceMap.get(from) ?? "pawn"; // fallback for safety
    moveCounts[pieceType] = (moveCounts[pieceType] ?? 0) + 1;
    totalMoves++;
  }

  if (totalMoves === 0) return {};

  // Convert counts to probabilities and then to decimal odds with margin.
  const margin = 0.05;
  const pieceTypes = Object.keys(moveCounts);
  const marginPerOutcome = margin / pieceTypes.length;
  const result: Record<string, number> = {};

  for (const [pieceType, count] of Object.entries(moveCounts)) {
    const prob = count / totalMoves;
    const odds = parseFloat((1 / (prob + marginPerOutcome)).toFixed(2));
    result[pieceType] = Math.max(1.01, odds);
  }

  return result;
}

// --------------------------------------------------------------------------
// Market retrieval
// --------------------------------------------------------------------------

/**
 * Get all current betting markets for a game.
 * Reads agent names from the games table, fetches their ELO, and computes odds.
 */
export async function getMarkets(gameId: string): Promise<MarketOdds> {
  const gameResult = await query<{
    white: string;
    black: string;
    move_count: number;
    moves: string[];
  }>(
    "SELECT white, black, move_count, moves FROM games WHERE id = $1",
    [gameId],
  );

  if (gameResult.rows.length === 0) {
    throw new Error(`Game ${gameId} not found`);
  }

  const game = gameResult.rows[0]!;
  const whiteRating = await getOrInitRating(game.white);
  const blackRating = await getOrInitRating(game.black);

  const outcomeOdds = await calculateOutcomeOdds(whiteRating.elo, blackRating.elo);
  const moveCountOdds = calculateMoveCountOdds(40);

  // For next-move odds, try to get the current FEN and legal moves from Redis cache.
  let nextMoveOdds: Record<string, number> = {};
  const cachedState = await redis.get(`gamestate:${gameId}`);
  if (cachedState) {
    const state = JSON.parse(cachedState) as {
      fen?: string;
      legal_moves?: string[];
    };
    if (state.fen && state.legal_moves) {
      nextMoveOdds = calculateNextMoveOdds(state.fen, state.legal_moves);
    }
  }

  return {
    outcome: outcomeOdds,
    move_count: moveCountOdds,
    next_move: nextMoveOdds,
  };
}

// --------------------------------------------------------------------------
// Bet placement
// --------------------------------------------------------------------------

/**
 * Place a bet on a game.
 *
 * Validates the bet type and selection, calculates odds, debits the stake
 * from the wallet, and inserts the bet record.
 *
 * Returns the created bet.
 */
export async function placeBet(
  walletId: string,
  gameId: string,
  betType: "outcome" | "move_count" | "next_move",
  selection: string,
  stake: number,
): Promise<Bet> {
  if (stake <= 0) {
    throw new Error("Stake must be positive");
  }

  // Verify game exists and is still in progress.
  const gameResult = await query<{
    id: string;
    white: string;
    black: string;
    result: string | null;
    moves: string[];
    move_count: number;
  }>(
    "SELECT id, white, black, result, moves, move_count FROM games WHERE id = $1",
    [gameId],
  );

  if (gameResult.rows.length === 0) {
    throw new Error(`Game ${gameId} not found`);
  }

  const game = gameResult.rows[0]!;

  if (game.result !== null) {
    throw new Error("Cannot bet on a finished game");
  }

  // Calculate odds based on bet type.
  let odds: number;

  switch (betType) {
    case "outcome": {
      const validSelections = ["1-0", "0-1", "1/2-1/2"];
      if (!validSelections.includes(selection)) {
        throw new Error(
          `Invalid outcome selection "${selection}". Must be one of: ${validSelections.join(", ")}`,
        );
      }
      const whiteRating = await getOrInitRating(game.white);
      const blackRating = await getOrInitRating(game.black);
      const outcomeOdds = await calculateOutcomeOdds(
        whiteRating.elo,
        blackRating.elo,
      );
      odds = outcomeOdds[selection]!;
      break;
    }
    case "move_count": {
      const validBrackets = ["1-20", "21-40", "41-60", "61-80", "80+"];
      if (!validBrackets.includes(selection)) {
        throw new Error(
          `Invalid move_count selection "${selection}". Must be one of: ${validBrackets.join(", ")}`,
        );
      }
      const moveCountOdds = calculateMoveCountOdds(40);
      odds = moveCountOdds[selection]!;
      break;
    }
    case "next_move": {
      const validPieces = ["pawn", "knight", "bishop", "rook", "queen", "king"];
      if (!validPieces.includes(selection)) {
        throw new Error(
          `Invalid next_move selection "${selection}". Must be a piece type: ${validPieces.join(", ")}`,
        );
      }

      // Get current position from Redis to compute next-move odds.
      const cachedState = await redis.get(`gamestate:${gameId}`);
      if (!cachedState) {
        throw new Error("Game state not available for next_move betting");
      }

      const state = JSON.parse(cachedState) as {
        fen?: string;
        legal_moves?: string[];
      };

      if (!state.fen || !state.legal_moves) {
        throw new Error("Game state incomplete for next_move betting");
      }

      const nextMoveOdds = calculateNextMoveOdds(state.fen, state.legal_moves);
      const selectedOdds = nextMoveOdds[selection];

      if (selectedOdds === undefined) {
        throw new Error(
          `No legal moves available for piece type "${selection}"`,
        );
      }

      odds = selectedOdds;
      break;
    }
    default:
      throw new Error(`Invalid bet type: ${betType as string}`);
  }

  // Debit the stake from the wallet.
  await walletService.debit(walletId, stake, "bet_stake", gameId);

  // Insert the bet record.
  const betResult = await query<Bet>(
    `INSERT INTO bets (wallet_id, game_id, bet_type, selection, stake, odds, status, payout)
     VALUES ($1, $2, $3, $4, $5, $6, 'active', 0)
     RETURNING id, wallet_id, game_id, bet_type, selection, stake, odds, status, payout, created_at::text`,
    [walletId, gameId, betType, selection, stake, odds],
  );

  return betResult.rows[0]!;
}

// --------------------------------------------------------------------------
// Settlement
// --------------------------------------------------------------------------

/**
 * Determine which move-count bracket a number of moves falls into.
 */
function getMoveCountBracket(moveCount: number): string {
  if (moveCount <= 20) return "1-20";
  if (moveCount <= 40) return "21-40";
  if (moveCount <= 60) return "41-60";
  if (moveCount <= 80) return "61-80";
  return "80+";
}

/**
 * Settle all outcome and move_count bets for a completed game.
 *
 * Outcome bets win if their selection matches the game result.
 * Move-count bets win if their bracket contains the total move count.
 */
export async function settleOutcomeBets(
  gameId: string,
  result: string,
): Promise<void> {
  // Read the game's total move count.
  const gameResult = await query<{ move_count: number }>(
    "SELECT move_count FROM games WHERE id = $1",
    [gameId],
  );

  if (gameResult.rows.length === 0) {
    throw new Error(`Game ${gameId} not found`);
  }

  const moveCount = gameResult.rows[0]!.move_count;
  const moveCountBracket = getMoveCountBracket(moveCount);

  // Fetch all active outcome and move_count bets for this game.
  const betsResult = await query<{
    id: string;
    wallet_id: string;
    bet_type: string;
    selection: string;
    stake: number;
    odds: number;
  }>(
    `SELECT id, wallet_id, bet_type, selection, stake, odds
     FROM bets
     WHERE game_id = $1
       AND status = 'active'
       AND bet_type IN ('outcome', 'move_count')`,
    [gameId],
  );

  for (const bet of betsResult.rows) {
    let won = false;

    if (bet.bet_type === "outcome") {
      won = bet.selection === result;
    } else if (bet.bet_type === "move_count") {
      won = bet.selection === moveCountBracket;
    }

    if (won) {
      const payout = parseFloat((bet.stake * bet.odds).toFixed(2));

      await query(
        "UPDATE bets SET status = 'won', payout = $1 WHERE id = $2",
        [payout, bet.id],
      );

      // Credit the winnings to the bettor's wallet.
      await walletService.credit(
        bet.wallet_id,
        payout,
        "bet_payout",
        bet.id,
      );
    } else {
      await query(
        "UPDATE bets SET status = 'lost', payout = 0 WHERE id = $1",
        [bet.id],
      );
    }
  }
}

/**
 * Settle next_move bets after a move is played.
 *
 * A next_move bet wins if the piece type of the actual move matches the
 * bettor's selection.
 *
 * @param gameId - The database game UUID.
 * @param actualMove - The UCI move string that was played (e.g. "e2e4").
 * @param fen - The FEN *before* the move was played (to look up piece types).
 */
export async function settleNextMoveBet(
  gameId: string,
  actualMove: string,
  fen: string,
): Promise<void> {
  // Determine the piece type that moved from the pre-move FEN.
  const fromSquare = actualMove.substring(0, 2);
  const movedPieceType = getPieceTypeAtSquare(fen, fromSquare);

  if (!movedPieceType) {
    // Should not happen in a valid game; skip settlement.
    console.error(
      `Could not determine piece at ${fromSquare} in FEN: ${fen}`,
    );
    return;
  }

  // Fetch all active next_move bets for this game.
  const betsResult = await query<{
    id: string;
    wallet_id: string;
    selection: string;
    stake: number;
    odds: number;
  }>(
    `SELECT id, wallet_id, selection, stake, odds
     FROM bets
     WHERE game_id = $1
       AND status = 'active'
       AND bet_type = 'next_move'`,
    [gameId],
  );

  for (const bet of betsResult.rows) {
    const won = bet.selection === movedPieceType;

    if (won) {
      const payout = parseFloat((bet.stake * bet.odds).toFixed(2));

      await query(
        "UPDATE bets SET status = 'won', payout = $1 WHERE id = $2",
        [payout, bet.id],
      );

      await walletService.credit(
        bet.wallet_id,
        payout,
        "bet_payout",
        bet.id,
      );
    } else {
      await query(
        "UPDATE bets SET status = 'lost', payout = 0 WHERE id = $1",
        [bet.id],
      );
    }
  }
}

// --------------------------------------------------------------------------
// Internal helpers
// --------------------------------------------------------------------------

/**
 * Parse a FEN string and return the piece type name at a given square.
 * Returns null if the square is empty.
 */
function getPieceTypeAtSquare(
  fen: string,
  square: string,
): string | null {
  const boardPart = fen.split(" ")[0];
  if (!boardPart) return null;

  const pieceTypeNames: Record<string, string> = {
    p: "pawn",
    n: "knight",
    b: "bishop",
    r: "rook",
    q: "queen",
    k: "king",
  };

  const files = "abcdefgh";
  const ranks = boardPart.split("/");

  for (let rankIdx = 0; rankIdx < ranks.length; rankIdx++) {
    let fileIdx = 0;
    const rank = ranks[rankIdx]!;
    for (const ch of rank) {
      if (ch >= "1" && ch <= "8") {
        fileIdx += parseInt(ch, 10);
      } else {
        const sq = files[fileIdx]! + String(8 - rankIdx);
        if (sq === square) {
          return pieceTypeNames[ch.toLowerCase()] ?? null;
        }
        fileIdx++;
      }
    }
  }

  return null;
}
