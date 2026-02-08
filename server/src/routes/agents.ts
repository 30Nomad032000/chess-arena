import { Router } from "express";
import { engineClient } from "../services/engine-client.js";
import { getOrInitRating } from "../services/elo-service.js";
import type { Agent } from "../types/index.js";

const router = Router();

/**
 * GET /api/agents
 *
 * Proxy to engine to list all registered agents, then merge
 * ELO ratings from the database.
 *
 * Returns: Array<{ name, description, elo }>
 */
router.get("/", async (_req, res) => {
  try {
    const engineAgents = await engineClient.getAgents();

    const agents: Agent[] = await Promise.all(
      engineAgents.map(async (agent) => {
        const rating = await getOrInitRating(agent.name);
        return {
          name: agent.name,
          description: agent.description,
          elo: rating.elo,
        };
      }),
    );

    res.json(agents);
  } catch (err) {
    console.error("Failed to fetch agents:", err);
    res.status(502).json({
      error: "Failed to retrieve agents from engine",
    });
  }
});

export default router;
