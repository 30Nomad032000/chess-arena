import { v4 as uuidv4 } from "uuid";
import { query } from "../db/client.js";
import { engineClient } from "./engine-client.js";
import { updateRatings, getOrInitRating } from "./elo-service.js";
import { settleOutcomeBets, settleNextMoveBet } from "./betting-engine.js";
import {
  publishGameEvent,
  setGameState,
} from "./cache.js";
import type { GameEvent } from "../types/index.js";

interface ActiveMatch {
  dbGameId: string;
  engineGameId: string;
  white: string;
  black: string;
  moveCount: number;
  startedAt: Date;
}

class MatchOrchestrator {
  private activeMatches: Map<string, ActiveMatch> = new Map();

  /**
   * Start a new match between two agents.
   *
   * 1. Creates the game in the Python engine.
   * 2. Inserts a row into the Postgres `games` table.
   * 3. Initialises ELO ratings for both agents if needed.
   * 4. Fires off the game loop as a background async task.
   *
   * @returns The database game UUID (used by the rest of the Express app).
   */
  async startMatch(
    white: string,
    black: string,
    moveDelay: number = 1000,
  ): Promise<string> {
    // Create game in the engine.
    const engineGameId = await engineClient.newGame(white, black);

    // Create game row in Postgres.
    const dbGameId = uuidv4();
    await query(
      `INSERT INTO games (id, white, black, result, moves, timestamps, fen_final, move_count)
       VALUES ($1, $2, $3, NULL, '{}', '{}', NULL, 0)`,
      [dbGameId, white, black],
    );

    // Ensure both agents have ELO entries.
    await getOrInitRating(white);
    await getOrInitRating(black);

    // Register the match as active.
    const match: ActiveMatch = {
      dbGameId,
      engineGameId,
      white,
      black,
      moveCount: 0,
      startedAt: new Date(),
    };
    this.activeMatches.set(dbGameId, match);

    // Set initial game state in Redis.
    const initialState = await engineClient.getState(engineGameId);
    await setGameState(dbGameId, {
      ...initialState,
      db_game_id: dbGameId,
      engine_game_id: engineGameId,
    });

    // Publish game_start event.
    const startEvent: GameEvent = {
      type: "game_start",
      game_id: dbGameId,
      white,
      black,
      fen: initialState.fen,
    };
    await publishGameEvent(dbGameId, startEvent as unknown as Record<string, unknown>);

    // Fire and forget the game loop.
    this.runGameLoop(match, moveDelay).catch((err) => {
      console.error(`Game loop error for ${dbGameId}:`, err);
      this.activeMatches.delete(dbGameId);
    });

    return dbGameId;
  }

  /**
   * Return a map of all currently active game IDs to their match info.
   */
  getActiveMatches(): Map<string, ActiveMatch> {
    return new Map(this.activeMatches);
  }

  // --------------------------------------------------------------------------
  // Game loop (runs in background)
  // --------------------------------------------------------------------------

  private async runGameLoop(
    match: ActiveMatch,
    moveDelay: number,
  ): Promise<void> {
    const { dbGameId, engineGameId, white, black } = match;

    try {
      while (true) {
        // Get the current FEN *before* the move (needed for next_move bet settlement).
        const preMoveFen = await this.getCurrentFen(engineGameId);

        // 1. Ask the engine to make the next move.
        const moveResult = await engineClient.getMove(engineGameId);

        // 2. Update move count.
        match.moveCount += 1;

        // Determine whose move it was (toggle based on move count: odd = white, even = black).
        const agent = match.moveCount % 2 === 1 ? white : black;

        // 3. Store the move in Postgres.
        await query(
          `UPDATE games
           SET moves = array_append(moves, $1),
               timestamps = array_append(timestamps, $2),
               move_count = $3,
               fen_final = $4
           WHERE id = $5`,
          [
            moveResult.move,
            moveResult.elapsed,
            match.moveCount,
            moveResult.fen,
            dbGameId,
          ],
        );

        // 4. Update Redis game state.
        const engineState = await engineClient.getState(engineGameId);
        await setGameState(dbGameId, {
          ...engineState,
          db_game_id: dbGameId,
          engine_game_id: engineGameId,
          move_count: match.moveCount,
        });

        // 5. Publish move event via Redis pub/sub.
        const moveEvent: GameEvent = {
          type: "move",
          game_id: dbGameId,
          move: moveResult.move,
          fen: moveResult.fen,
          move_number: match.moveCount,
          elapsed: moveResult.elapsed,
          agent,
        };
        await publishGameEvent(dbGameId, moveEvent as unknown as Record<string, unknown>);

        // 5b. Settle any next_move bets using the pre-move FEN.
        try {
          await settleNextMoveBet(dbGameId, moveResult.move, preMoveFen);
        } catch (err) {
          console.error(
            `Error settling next_move bets for game ${dbGameId}:`,
            err,
          );
        }

        // 6. Check if game is over.
        if (moveResult.is_over) {
          const result = moveResult.result ?? "1/2-1/2";

          // Update game result in Postgres.
          await query(
            "UPDATE games SET result = $1 WHERE id = $2",
            [result, dbGameId],
          );

          // Update ELO ratings.
          try {
            await updateRatings(white, black, result);
          } catch (err) {
            console.error(
              `Error updating ratings for game ${dbGameId}:`,
              err,
            );
          }

          // Settle outcome and move_count bets.
          try {
            await settleOutcomeBets(dbGameId, result);
          } catch (err) {
            console.error(
              `Error settling bets for game ${dbGameId}:`,
              err,
            );
          }

          // Publish game_end event.
          const endEvent: GameEvent = {
            type: "game_end",
            game_id: dbGameId,
            result,
            move_count: match.moveCount,
            white,
            black,
            fen: moveResult.fen,
          };
          await publishGameEvent(dbGameId, endEvent as unknown as Record<string, unknown>);

          // Update final Redis state.
          await setGameState(dbGameId, {
            ...engineState,
            db_game_id: dbGameId,
            engine_game_id: engineGameId,
            move_count: match.moveCount,
            result,
            is_over: true,
          });

          // Remove from active matches.
          this.activeMatches.delete(dbGameId);

          console.log(
            `Game ${dbGameId} finished: ${result} in ${match.moveCount} moves`,
          );
          return;
        }

        // 7. Sleep before the next move.
        await this.sleep(moveDelay);
      }
    } catch (err) {
      // Publish an error event so clients know the game broke.
      const errorEvent: GameEvent = {
        type: "error",
        game_id: dbGameId,
      };
      await publishGameEvent(
        dbGameId,
        errorEvent as unknown as Record<string, unknown>,
      ).catch(() => {
        // Swallow publish errors during error handling.
      });

      this.activeMatches.delete(dbGameId);
      throw err;
    }
  }

  /**
   * Get the current FEN from the engine for a game.
   */
  private async getCurrentFen(engineGameId: string): Promise<string> {
    const state = await engineClient.getState(engineGameId);
    return state.fen;
  }

  /**
   * Non-blocking sleep.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const matchOrchestrator = new MatchOrchestrator();
