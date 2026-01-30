"""Chess agent registry.

Provides a central ``AGENT_REGISTRY`` mapping agent names to instances,
and a ``register_agents()`` helper that populates it.

Usage::

    from engine.agents import AGENT_REGISTRY, register_agents

    register_agents()
    agent = AGENT_REGISTRY["minimax-d3"]
    move = await agent.select_move(board)
"""

from __future__ import annotations

import logging
import os
from typing import Dict

from .base import BaseAgent
from .random_agent import RandomAgent
from .minimax_agent import MinimaxAgent
from .mcts_agent import MCTSAgent
from .llm_agent import LLMAgent

logger = logging.getLogger(__name__)

AGENT_REGISTRY: Dict[str, BaseAgent] = {}


def _register(agent: BaseAgent) -> None:
    """Insert *agent* into the global registry, warning on duplicates."""
    if agent.name in AGENT_REGISTRY:
        logger.warning("Overwriting existing agent %r in registry.", agent.name)
    AGENT_REGISTRY[agent.name] = agent
    logger.debug("Registered agent: %s", agent.name)


def register_agents() -> Dict[str, BaseAgent]:
    """Create and register all built-in agents.

    LLM-backed agents are only registered when the corresponding API key
    environment variable is set (``ANTHROPIC_API_KEY``, ``OPENAI_API_KEY``).

    Returns:
        A reference to the global ``AGENT_REGISTRY`` dict.
    """
    # -- Deterministic / algorithmic agents --------------------------------
    _register(RandomAgent())

    _register(MinimaxAgent(depth=2))
    _register(MinimaxAgent(depth=3))
    _register(MinimaxAgent(depth=4))

    _register(MCTSAgent(time_limit=0.5))
    _register(MCTSAgent(time_limit=1.0))

    # -- LLM agents (optional) --------------------------------------------
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if anthropic_key:
        try:
            _register(LLMAgent(provider="anthropic", api_key=anthropic_key))
            logger.info("Registered Anthropic LLM agent.")
        except Exception:
            logger.exception("Failed to register Anthropic LLM agent.")
    else:
        logger.info("ANTHROPIC_API_KEY not set; skipping Anthropic LLM agent.")

    openai_key = os.environ.get("OPENAI_API_KEY", "")
    if openai_key:
        try:
            _register(LLMAgent(provider="openai", api_key=openai_key))
            logger.info("Registered OpenAI LLM agent.")
        except Exception:
            logger.exception("Failed to register OpenAI LLM agent.")
    else:
        logger.info("OPENAI_API_KEY not set; skipping OpenAI LLM agent.")

    logger.info(
        "Agent registry ready: %d agent(s) registered — %s",
        len(AGENT_REGISTRY),
        ", ".join(sorted(AGENT_REGISTRY)),
    )
    return AGENT_REGISTRY


__all__ = [
    "BaseAgent",
    "RandomAgent",
    "MinimaxAgent",
    "MCTSAgent",
    "LLMAgent",
    "AGENT_REGISTRY",
    "register_agents",
]
