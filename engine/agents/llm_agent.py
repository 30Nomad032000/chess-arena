"""LLM-powered chess agent using Anthropic (Claude) or OpenAI (GPT) APIs.

Uses raw ``httpx`` async calls rather than vendor SDKs to minimise
external dependencies.
"""

from __future__ import annotations

import logging
import os
import random
from typing import Optional

import chess
import httpx

from .base import BaseAgent

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
_OPENAI_URL = "https://api.openai.com/v1/chat/completions"

_MAX_RETRIES = 3
_HTTP_TIMEOUT = 30.0  # seconds

_SYSTEM_PROMPT = (
    "You are a strong chess engine. You will be given a board position as a "
    "FEN string together with a list of legal moves in UCI notation. "
    "Reply with ONLY a single legal UCI move (e.g. e2e4). "
    "Do not include any explanation, punctuation, or extra text."
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_user_message(board: chess.Board) -> str:
    """Build the user prompt containing the FEN and legal moves."""
    fen = board.fen()
    legal_uci = " ".join(m.uci() for m in board.legal_moves)
    return (
        f"Current position (FEN): {fen}\n"
        f"Legal moves (UCI): {legal_uci}\n\n"
        f"Choose the best move."
    )


def _parse_uci_move(text: str, board: chess.Board) -> Optional[chess.Move]:
    """Attempt to extract a valid UCI move from raw LLM output.

    Returns ``None`` if the text does not contain a legal move.
    """
    # Strip whitespace and common markdown artefacts
    cleaned = text.strip().strip("`").strip("'").strip('"').strip()
    # The model sometimes wraps the move in a sentence; try the first token.
    tokens = cleaned.split()
    for token in tokens:
        token = token.strip(".,;:!?`'\"")
        try:
            move = chess.Move.from_uci(token)
            if move in board.legal_moves:
                return move
        except (chess.InvalidMoveError, ValueError):
            continue
    return None


# ---------------------------------------------------------------------------
# Provider-specific request helpers
# ---------------------------------------------------------------------------

async def _call_anthropic(
    client: httpx.AsyncClient,
    api_key: str,
    model: str,
    user_msg: str,
) -> str:
    """Send a request to the Anthropic Messages API and return the text reply."""
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    payload = {
        "model": model,
        "max_tokens": 32,
        "system": _SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user_msg}],
    }
    resp = await client.post(_ANTHROPIC_URL, headers=headers, json=payload, timeout=_HTTP_TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    # Anthropic returns content as a list of blocks.
    blocks = data.get("content", [])
    parts: list[str] = []
    for block in blocks:
        if block.get("type") == "text":
            parts.append(block["text"])
    return " ".join(parts)


async def _call_openai(
    client: httpx.AsyncClient,
    api_key: str,
    model: str,
    user_msg: str,
) -> str:
    """Send a request to the OpenAI Chat Completions API and return the text reply."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "max_tokens": 32,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
    }
    resp = await client.post(_OPENAI_URL, headers=headers, json=payload, timeout=_HTTP_TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    choices = data.get("choices", [])
    if choices:
        return choices[0].get("message", {}).get("content", "")
    return ""


# ---------------------------------------------------------------------------
# Agent class
# ---------------------------------------------------------------------------

class LLMAgent(BaseAgent):
    """Chess agent powered by a large language model.

    Supports two providers:
      - ``"anthropic"`` -- calls the Claude Messages API.
      - ``"openai"``    -- calls the GPT Chat Completions API.

    Args:
        provider: ``"anthropic"`` or ``"openai"``.
        model: Model identifier (e.g. ``"claude-sonnet-4-20250514"``,
               ``"gpt-4o"``).
        api_key: API key.  If *None*, the agent reads from the
                 ``ANTHROPIC_API_KEY`` or ``OPENAI_API_KEY`` env var.
        name: Agent identifier.
        description: Human-readable description.
    """

    SUPPORTED_PROVIDERS = ("anthropic", "openai")

    def __init__(
        self,
        provider: str = "anthropic",
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        name: Optional[str] = None,
        description: Optional[str] = None,
    ) -> None:
        if provider not in self.SUPPORTED_PROVIDERS:
            raise ValueError(
                f"Unsupported provider {provider!r}. "
                f"Choose from {self.SUPPORTED_PROVIDERS}."
            )

        self.provider = provider
        self.model = model or self._default_model(provider)
        self.api_key = api_key or self._env_key(provider)

        if name is None:
            name = f"llm-{provider}-{self.model}"
        if description is None:
            description = f"LLM agent using {provider} model {self.model}."

        super().__init__(name=name, description=description)

    # -- static helpers ----------------------------------------------------

    @staticmethod
    def _default_model(provider: str) -> str:
        if provider == "anthropic":
            return "claude-sonnet-4-20250514"
        return "gpt-4o"

    @staticmethod
    def _env_key(provider: str) -> str:
        var = "ANTHROPIC_API_KEY" if provider == "anthropic" else "OPENAI_API_KEY"
        key = os.environ.get(var, "")
        if not key:
            raise ValueError(
                f"No API key provided and {var} environment variable is not set."
            )
        return key

    # -- move selection ----------------------------------------------------

    async def select_move(self, board: chess.Board) -> chess.Move:
        """Ask the LLM for a move, retrying up to 3 times on failure.

        Falls back to a random legal move if all retries are exhausted.
        """
        legal_moves = list(board.legal_moves)
        if not legal_moves:
            raise ValueError("No legal moves available in this position.")

        user_msg = _build_user_message(board)
        error_context: Optional[str] = None

        async with httpx.AsyncClient() as client:
            for attempt in range(1, _MAX_RETRIES + 1):
                prompt = user_msg
                if error_context:
                    prompt += (
                        f"\n\n[Previous attempt returned an illegal move: "
                        f"{error_context}. Please choose a LEGAL move from "
                        f"the list above.]"
                    )

                try:
                    if self.provider == "anthropic":
                        raw = await _call_anthropic(
                            client, self.api_key, self.model, prompt,
                        )
                    else:
                        raw = await _call_openai(
                            client, self.api_key, self.model, prompt,
                        )
                except httpx.HTTPStatusError as exc:
                    logger.warning(
                        "LLM API HTTP error on attempt %d/%d: %s",
                        attempt, _MAX_RETRIES, exc,
                    )
                    error_context = f"HTTP {exc.response.status_code}"
                    continue
                except httpx.RequestError as exc:
                    logger.warning(
                        "LLM API request error on attempt %d/%d: %s",
                        attempt, _MAX_RETRIES, exc,
                    )
                    error_context = str(exc)
                    continue

                move = _parse_uci_move(raw, board)
                if move is not None:
                    return move

                logger.info(
                    "LLM returned unparseable/illegal move on attempt %d/%d: %r",
                    attempt, _MAX_RETRIES, raw,
                )
                error_context = raw.strip()[:80]

        # All retries exhausted -- fall back to random.
        logger.warning(
            "All %d LLM attempts failed for %s; falling back to random move.",
            _MAX_RETRIES, self.name,
        )
        return random.choice(legal_moves)

    def to_dict(self) -> dict:
        d = super().to_dict()
        d["provider"] = self.provider
        d["model"] = self.model
        return d
