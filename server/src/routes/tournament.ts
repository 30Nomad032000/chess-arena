import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { runMatch, type MatchResult } from "../services/orchestrator.js";

const router = Router();

// -------------------------------------------------------------------------
// In-memory tournament tracking
// -------------------------------------------------------------------------

interface TournamentGame {
  white: string;
  black: string;
  game_id: string | null;
  result: string | null;
  status: "pending" | "in_progress" | "completed" | "failed";
}

interface Tournament {
  id: string;
  agent_names: string[];
  total_games: number;
  completed_games: number;
  status: "running" | "completed" | "failed";
  games: TournamentGame[];
  standings: Record<string, { wins: number; losses: number; draws: number; points: number }>;
  created_at: string;
}

const activeTournaments = new Map<string, Tournament>();

/**
 * Generate all round-robin pairs: each agent plays every other agent
 * as both white and black (double round-robin).
 */
function generatePairs(agents: string[]): Array<{ white: string; black: string }> {
  const pairs: Array<{ white: string; black: string }> = [];
  for (let i = 0; i < agents.length; i++) {
    for (let j = 0; j < agents.length; j++) {
      if (i !== j) {
        pairs.push({ white: agents[i]!, black: agents[j]! });
      }
    }
  }
  return pairs;
}

/**
 * Run a tournament in the background. Matches are played sequentially
 * to avoid overloading the engine service.
 */
async function runTournament(tournament: Tournament): Promise<void> {
  for (const game of tournament.games) {
    game.status = "in_progress";

    try {
      const result: MatchResult = await runMatch({
        white: game.white,
        black: game.black,
        moveDelay: 100, // faster for tournaments
      });

      game.game_id = result.game_id;
      game.result = result.result;
      game.status = "completed";
      tournament.completed_games++;

      // Update standings.
      const whiteStanding = tournament.standings[game.white]!;
      const blackStanding = tournament.standings[game.black]!;

      if (result.result === "1-0") {
        whiteStanding.wins++;
        whiteStanding.points += 1;
        blackStanding.losses++;
      } else if (result.result === "0-1") {
        blackStanding.wins++;
        blackStanding.points += 1;
        whiteStanding.losses++;
      } else {
        whiteStanding.draws++;
        whiteStanding.points += 0.5;
        blackStanding.draws++;
        blackStanding.points += 0.5;
      }
    } catch (err) {
      console.error(
        `Tournament ${tournament.id}: game ${game.white} vs ${game.black} failed:`,
        err,
      );
      game.status = "failed";
      tournament.completed_games++;
    }
  }

  tournament.status = "completed";
}

/**
 * POST /api/tournament
 *
 * Start a round-robin tournament among the specified agents. Each pair
 * plays two games (once as white, once as black). Matches run
 * sequentially in the background.
 *
 * Body: { agent_names: string[] }
 * Returns: { tournament_id, total_games }
 */
router.post("/", async (req, res) => {
  try {
    const { agent_names } = req.body as { agent_names?: string[] };

    if (!agent_names || !Array.isArray(agent_names)) {
      res.status(400).json({ error: "'agent_names' must be an array of strings" });
      return;
    }

    if (agent_names.length < 2) {
      res.status(400).json({ error: "At least 2 agents are required for a tournament" });
      return;
    }

    // Deduplicate agent names.
    const uniqueAgents = [...new Set(agent_names)];

    if (uniqueAgents.length < 2) {
      res.status(400).json({ error: "At least 2 distinct agents are required" });
      return;
    }

    const pairs = generatePairs(uniqueAgents);

    const tournamentId = uuidv4();

    // Initialize standings for each agent.
    const standings: Tournament["standings"] = {};
    for (const agent of uniqueAgents) {
      standings[agent] = { wins: 0, losses: 0, draws: 0, points: 0 };
    }

    const tournament: Tournament = {
      id: tournamentId,
      agent_names: uniqueAgents,
      total_games: pairs.length,
      completed_games: 0,
      status: "running",
      games: pairs.map((p) => ({
        white: p.white,
        black: p.black,
        game_id: null,
        result: null,
        status: "pending",
      })),
      standings,
      created_at: new Date().toISOString(),
    };

    activeTournaments.set(tournamentId, tournament);

    // Run the tournament in the background (don't await).
    runTournament(tournament).catch((err) => {
      console.error(`Tournament ${tournamentId} failed:`, err);
      tournament.status = "failed";
    });

    res.status(201).json({
      tournament_id: tournamentId,
      total_games: pairs.length,
    });
  } catch (err) {
    console.error("Failed to start tournament:", err);
    res.status(500).json({ error: "Failed to start tournament" });
  }
});

/**
 * GET /api/tournament/:id
 *
 * Get the current state of a tournament including progress, standings,
 * and the list of completed games.
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: "Tournament ID is required" });
      return;
    }

    const tournament = activeTournaments.get(id);

    if (!tournament) {
      res.status(404).json({ error: "Tournament not found" });
      return;
    }

    // Sort standings by points descending, then wins, then alphabetically.
    const sortedStandings = Object.entries(tournament.standings)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.name.localeCompare(b.name);
      });

    res.json({
      tournament_id: tournament.id,
      status: tournament.status,
      agent_names: tournament.agent_names,
      total_games: tournament.total_games,
      completed_games: tournament.completed_games,
      standings: sortedStandings,
      games: tournament.games,
      created_at: tournament.created_at,
    });
  } catch (err) {
    console.error("Failed to get tournament:", err);
    res.status(500).json({ error: "Failed to retrieve tournament" });
  }
});

export default router;
