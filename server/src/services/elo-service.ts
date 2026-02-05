import { query } from "../db/client.js";
import { cacheGet, cacheInvalidate } from "./cache.js";
import type { LeaderboardEntry } from "../types/index.js";

const K_FACTOR = 32;
const LEADERBOARD_CACHE_KEY = "leaderboard";
const LEADERBOARD_TTL = 60; // seconds

/**
 * Standard ELO expected-score formula.
 * Returns the probability (0..1) that player A scores against player B.
 */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculate decimal odds for each outcome based on ELO ratings.
 * Applies a configurable margin (default 5%) so the book is slightly over-round.
 *
 * Returns { "1-0": odds, "0-1": odds, "1/2-1/2": odds }.
 */
export function calculateOutcomeOddsFromElo(
  whiteElo: number,
  blackElo: number,
  margin: number = 0.05,
): Record<string, number> {
  const whiteExpected = expectedScore(whiteElo, blackElo);
  const blackExpected = expectedScore(blackElo, whiteElo);

  // Derive draw probability from the expected scores.
  // The closer the two players, the higher the draw chance.
  // Use a simple model: drawProb proportional to 1 - |whiteExp - blackExp|.
  const rawDrawProb = Math.max(0.05, 1 - Math.abs(whiteExpected - blackExpected)) * 0.35;
  const rawWhiteWin = whiteExpected * (1 - rawDrawProb);
  const rawBlackWin = blackExpected * (1 - rawDrawProb);

  // Normalise so probabilities sum to 1.
  const total = rawWhiteWin + rawBlackWin + rawDrawProb;
  const pWhite = rawWhiteWin / total;
  const pBlack = rawBlackWin / total;
  const pDraw = rawDrawProb / total;

  // Apply margin and convert to decimal odds.
  // Margin is spread equally across all outcomes.
  const marginPerOutcome = margin / 3;

  const oddsWhite = parseFloat((1 / (pWhite + marginPerOutcome)).toFixed(2));
  const oddsBlack = parseFloat((1 / (pBlack + marginPerOutcome)).toFixed(2));
  const oddsDraw = parseFloat((1 / (pDraw + marginPerOutcome)).toFixed(2));

  return {
    "1-0": Math.max(1.01, oddsWhite),
    "0-1": Math.max(1.01, oddsBlack),
    "1/2-1/2": Math.max(1.01, oddsDraw),
  };
}

/**
 * Get an agent's current ELO rating from the database.
 * If the agent doesn't exist yet, inserts a default row with ELO 1500.
 */
export async function getOrInitRating(
  agentName: string,
): Promise<{ elo: number; wins: number; losses: number; draws: number; games: number }> {
  const existing = await query<{
    elo: number;
    wins: number;
    losses: number;
    draws: number;
    games: number;
  }>(
    "SELECT elo, wins, losses, draws, games FROM ratings WHERE agent_name = $1",
    [agentName],
  );

  if (existing.rows.length > 0) {
    return existing.rows[0]!;
  }

  await query(
    `INSERT INTO ratings (agent_name, elo, wins, losses, draws, games)
     VALUES ($1, 1500, 0, 0, 0, 0)
     ON CONFLICT (agent_name) DO NOTHING`,
    [agentName],
  );

  return { elo: 1500, wins: 0, losses: 0, draws: 0, games: 0 };
}

/**
 * Update ELO ratings for both players after a game.
 *
 * @param white - White agent name
 * @param black - Black agent name
 * @param result - "1-0" (white wins), "0-1" (black wins), or "1/2-1/2" (draw)
 */
export async function updateRatings(
  white: string,
  black: string,
  result: string,
): Promise<{ whiteElo: number; blackElo: number }> {
  const whiteRating = await getOrInitRating(white);
  const blackRating = await getOrInitRating(black);

  const whiteExpected = expectedScore(whiteRating.elo, blackRating.elo);
  const blackExpected = expectedScore(blackRating.elo, whiteRating.elo);

  let whiteActual: number;
  let blackActual: number;
  let whiteWinInc = 0;
  let whiteLossInc = 0;
  let whiteDrawInc = 0;
  let blackWinInc = 0;
  let blackLossInc = 0;
  let blackDrawInc = 0;

  switch (result) {
    case "1-0":
      whiteActual = 1;
      blackActual = 0;
      whiteWinInc = 1;
      blackLossInc = 1;
      break;
    case "0-1":
      whiteActual = 0;
      blackActual = 1;
      whiteLossInc = 1;
      blackWinInc = 1;
      break;
    case "1/2-1/2":
      whiteActual = 0.5;
      blackActual = 0.5;
      whiteDrawInc = 1;
      blackDrawInc = 1;
      break;
    default:
      throw new Error(`Invalid game result: ${result}`);
  }

  const newWhiteElo = Math.round(
    whiteRating.elo + K_FACTOR * (whiteActual - whiteExpected),
  );
  const newBlackElo = Math.round(
    blackRating.elo + K_FACTOR * (blackActual - blackExpected),
  );

  await query(
    `UPDATE ratings
     SET elo = $1,
         wins = wins + $2,
         losses = losses + $3,
         draws = draws + $4,
         games = games + 1,
         updated_at = NOW()
     WHERE agent_name = $5`,
    [newWhiteElo, whiteWinInc, whiteLossInc, whiteDrawInc, white],
  );

  await query(
    `UPDATE ratings
     SET elo = $1,
         wins = wins + $2,
         losses = losses + $3,
         draws = draws + $4,
         games = games + 1,
         updated_at = NOW()
     WHERE agent_name = $5`,
    [newBlackElo, blackWinInc, blackLossInc, blackDrawInc, black],
  );

  // Invalidate leaderboard cache so the next read picks up fresh data.
  await cacheInvalidate(LEADERBOARD_CACHE_KEY);

  return { whiteElo: newWhiteElo, blackElo: newBlackElo };
}

/**
 * Fetch the leaderboard, using Redis cache with a fallback to Postgres.
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return cacheGet<LeaderboardEntry[]>(
    LEADERBOARD_CACHE_KEY,
    LEADERBOARD_TTL,
    async () => {
      const result = await query<LeaderboardEntry>(
        `SELECT agent_name AS name, elo, wins, losses, draws, games
         FROM ratings
         ORDER BY elo DESC`,
      );
      return result.rows;
    },
  );
}
