/**
 * Game orchestrator -- drives a match from start to finish.
 *
 * Creates a game on the engine, loops moves, publishes events to Redis,
 * persists the final result to Postgres, updates ELO, and settles bets.
 */

import { query } from "../db/client.js";
import { engineClient } from "./engine-client.js";
import { updateRatings } from "./elo-service.js";
import {
  publishGameEvent,
  setGameState,
} from "./cache.js";
import {
  settleOutcomeBets,
  settleNextMoveBet,
} from "./betting-engine.js";

export interface MatchOptions {
  white: string;
  black: string;
  moveDelay?: number;
}

export interface MatchResult {
  game_id: string;
  engine_game_id: string;
  result: string;
  moves: string[];
  move_count: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run a complete match: create engine game, loop moves until game over,
 * persist to DB, update ELO ratings, and settle bets.
 *
 * Returns the database game ID and match result.
 */
export async function runMatch(opts: MatchOptions): Promise<MatchResult> {
  const { white, black, moveDelay = 300 } = opts;

  // 1. Insert a game row in Postgres so we have a stable UUID for betting.
  const dbResult = await query<{ id: string }>(
    `INSERT INTO games (white, black) VALUES ($1, $2) RETURNING id`,
    [white, black],
  );
  const gameId = dbResult.rows[0]!.id;

  // 2. Create the game on the engine service.
  const engineGameId = await engineClient.newGame(white, black);

  // 3. Publish game_start event.
  const startState = await engineClient.getState(engineGameId);

  await setGameState(gameId, {
    ...startState,
    game_id: gameId,
    engine_game_id: engineGameId,
  });

  await publishGameEvent(gameId, {
    type: "game_start",
    game_id: gameId,
    white,
    black,
    fen: startState.fen,
  });

  // 4. Loop: request moves until the game is over.
  const moves: string[] = [];
  const timestamps: number[] = [];
  let moveNumber = 0;
  let lastFen = startState.fen;
  let result: string | null = null;

  while (true) {
    if (moveDelay > 0) {
      await sleep(moveDelay);
    }

    const preMovefen = lastFen;
    const moveResult = await engineClient.getMove(engineGameId);

    moveNumber++;
    moves.push(moveResult.move);
    timestamps.push(moveResult.elapsed);
    lastFen = moveResult.fen;

    const currentAgent = moveNumber % 2 === 1 ? white : black;

    // Update cached game state for WebSocket clients.
    const currentState = await engineClient.getState(engineGameId);
    await setGameState(gameId, {
      ...currentState,
      game_id: gameId,
      engine_game_id: engineGameId,
      move_number: moveNumber,
    });

    // Publish move event.
    await publishGameEvent(gameId, {
      type: "move",
      game_id: gameId,
      move: moveResult.move,
      fen: moveResult.fen,
      move_number: moveNumber,
      elapsed: moveResult.elapsed,
      agent: currentAgent,
    });

    // Settle any next_move bets using the pre-move FEN.
    try {
      await settleNextMoveBet(gameId, moveResult.move, preMovefen);
    } catch (err) {
      console.error("Failed to settle next_move bets:", err);
    }

    if (moveResult.is_over) {
      result = moveResult.result ?? "1/2-1/2";
      break;
    }
  }

  // 5. Persist completed game to Postgres.
  await query(
    `UPDATE games
       SET result = $1,
           moves = $2,
           timestamps = $3,
           fen_final = $4,
           move_count = $5
     WHERE id = $6`,
    [result, moves, timestamps, lastFen, moveNumber, gameId],
  );

  // 6. Update ELO ratings.
  await updateRatings(white, black, result!);

  // 7. Settle outcome and move_count bets.
  try {
    await settleOutcomeBets(gameId, result!);
  } catch (err) {
    console.error("Failed to settle outcome bets:", err);
  }

  // 8. Publish game_end event.
  await publishGameEvent(gameId, {
    type: "game_end",
    game_id: gameId,
    result: result!,
    move_count: moveNumber,
    fen: lastFen,
    white,
    black,
  });

  return {
    game_id: gameId,
    engine_game_id: engineGameId,
    result: result!,
    moves,
    move_count: moveNumber,
  };
}
