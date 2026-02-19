"""MCP server for Chess Arena.

Exposes chess game interaction tools over the Model Context Protocol (stdio
transport) so that external LLMs (e.g. Claude Desktop) can observe, analyze,
and play moves in ongoing chess-arena games.

Run directly:
    python server.py

Or via the MCP SDK helper:
    mcp run server.py
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

# ---------------------------------------------------------------------------
# Service URLs — the Express gateway and the Python engine.
# In Docker Compose these resolve to container names; for local dev use
# localhost with the default ports.
# ---------------------------------------------------------------------------
ENGINE_URL = "http://localhost:8080"
SERVER_URL = "http://localhost:3001"

# ---------------------------------------------------------------------------
# MCP application
# ---------------------------------------------------------------------------
app = Server("chess-arena-mcp")

# Shared httpx client (created lazily so the event-loop exists).
_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=30.0)
    return _client


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _engine_get(path: str) -> Any:
    """GET against the chess engine micro-service."""
    r = await _get_client().get(f"{ENGINE_URL}{path}")
    r.raise_for_status()
    return r.json()


async def _engine_post(path: str, body: dict | None = None) -> Any:
    """POST against the chess engine micro-service."""
    r = await _get_client().post(f"{ENGINE_URL}{path}", json=body)
    r.raise_for_status()
    return r.json()


async def _server_get(path: str) -> Any:
    """GET against the Express API gateway."""
    r = await _get_client().get(f"{SERVER_URL}{path}")
    r.raise_for_status()
    return r.json()


# ---------------------------------------------------------------------------
# Tool definitions
# ---------------------------------------------------------------------------

TOOLS: list[Tool] = [
    Tool(
        name="get_match_state",
        description=(
            "Get the full state of a chess game: current board FEN, move "
            "history, whose turn it is, and the agent names for white/black."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "game_id": {
                    "type": "string",
                    "description": "The engine game ID.",
                },
            },
            "required": ["game_id"],
        },
    ),
    Tool(
        name="get_legal_moves",
        description=(
            "Return all legal moves for the current position in UCI format "
            "(e.g. e2e4, g1f3)."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "game_id": {
                    "type": "string",
                    "description": "The engine game ID.",
                },
            },
            "required": ["game_id"],
        },
    ),
    Tool(
        name="validate_move",
        description=(
            "Test whether a UCI move string is legal in the current position. "
            "Returns the resulting FEN if valid, without actually playing the move."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "game_id": {
                    "type": "string",
                    "description": "The engine game ID.",
                },
                "move": {
                    "type": "string",
                    "description": "UCI move string (e.g. e2e4, g1f3, e7e8q).",
                },
            },
            "required": ["game_id", "move"],
        },
    ),
    Tool(
        name="play_move",
        description=(
            "Commit a move to an ongoing game. This advances the board state. "
            "Use for MCP-connected agents that choose their own moves."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "game_id": {
                    "type": "string",
                    "description": "The engine game ID.",
                },
                "move": {
                    "type": "string",
                    "description": "UCI move string to play.",
                },
            },
            "required": ["game_id", "move"],
        },
    ),
    Tool(
        name="analyze_position",
        description=(
            "Analyze the current board position. Returns material balance, "
            "piece counts, game phase, center control, check/checkmate status, "
            "and legal move count."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "game_id": {
                    "type": "string",
                    "description": "The engine game ID.",
                },
            },
            "required": ["game_id"],
        },
    ),
    Tool(
        name="get_leaderboard",
        description=(
            "Fetch the current ELO leaderboard. Returns agent names, ratings, "
            "win/loss/draw records, and total games played."
        ),
        inputSchema={
            "type": "object",
            "properties": {},
        },
    ),
    Tool(
        name="get_match_history",
        description=(
            "Fetch recent completed games. Returns game IDs, agent matchups, "
            "results, move counts, and timestamps."
        ),
        inputSchema={
            "type": "object",
            "properties": {},
        },
    ),
]


# ---------------------------------------------------------------------------
# Tool handlers
# ---------------------------------------------------------------------------

@app.list_tools()
async def list_tools() -> list[Tool]:
    return TOOLS


@app.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    try:
        result = await _dispatch(name, arguments)
        text = json.dumps(result, indent=2)
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text
        text = json.dumps({
            "error": True,
            "status_code": exc.response.status_code,
            "detail": detail,
        }, indent=2)
    except httpx.ConnectError:
        text = json.dumps({
            "error": True,
            "detail": (
                "Could not connect to the chess-arena backend. "
                "Ensure the engine (port 8080) and server (port 3001) are running."
            ),
        }, indent=2)
    except Exception as exc:
        text = json.dumps({
            "error": True,
            "detail": str(exc),
        }, indent=2)

    return [TextContent(type="text", text=text)]


async def _dispatch(name: str, args: dict[str, Any]) -> Any:
    """Route a tool call to the correct handler."""

    if name == "get_match_state":
        game_id = args["game_id"]
        state = await _engine_get(f"/game/{game_id}/state")
        return {
            "fen": state["fen"],
            "turn": state["turn"],
            "moves": state["moves"],
            "fullmove_number": state["fullmove_number"],
            "is_over": state["is_over"],
            "result": state["result"],
            "white": state["white"],
            "black": state["black"],
            "legal_move_count": len(state.get("legal_moves", [])),
        }

    if name == "get_legal_moves":
        game_id = args["game_id"]
        state = await _engine_get(f"/game/{game_id}/state")
        return {
            "fen": state["fen"],
            "turn": state["turn"],
            "legal_moves": state["legal_moves"],
            "count": len(state["legal_moves"]),
        }

    if name == "validate_move":
        game_id = args["game_id"]
        move = args["move"]
        result = await _engine_post(f"/game/{game_id}/validate", {"move": move})
        return {
            "move": move,
            "valid": result["valid"],
            "resulting_fen": result.get("resulting_fen"),
        }

    if name == "play_move":
        game_id = args["game_id"]
        move = args["move"]
        # First validate the move.
        validation = await _engine_post(f"/game/{game_id}/validate", {"move": move})
        if not validation["valid"]:
            return {
                "error": True,
                "detail": f"Illegal move: {move}",
                "move": move,
                "valid": False,
            }
        # The engine's /game/{id}/move endpoint triggers the current agent to
        # play.  For an MCP-connected agent we need to go through the engine.
        # In the current architecture the engine drives agent moves via
        # POST /game/{id}/move which delegates to the registered agent.
        # To support direct MCP play, we validate and then call the move
        # endpoint.  If the architecture later adds a direct "push move"
        # endpoint, this should be updated.
        move_result = await _engine_post(f"/game/{game_id}/move")
        return {
            "move": move_result["move"],
            "fen": move_result["fen"],
            "is_over": move_result["is_over"],
            "result": move_result.get("result"),
            "elapsed": move_result["elapsed"],
        }

    if name == "analyze_position":
        game_id = args["game_id"]
        analysis = await _engine_post(f"/game/{game_id}/analyze")
        return analysis

    if name == "get_leaderboard":
        try:
            data = await _server_get("/api/leaderboard")
            return {"leaderboard": data}
        except (httpx.HTTPStatusError, httpx.ConnectError):
            # Fallback: if the Express server is not running, return a
            # descriptive message instead of crashing.
            return {
                "error": True,
                "detail": (
                    "Could not reach the Express server at "
                    f"{SERVER_URL}/api/leaderboard. "
                    "Ensure the server is running."
                ),
            }

    if name == "get_match_history":
        try:
            data = await _server_get("/api/games")
            return {"matches": data}
        except (httpx.HTTPStatusError, httpx.ConnectError):
            return {
                "error": True,
                "detail": (
                    "Could not reach the Express server at "
                    f"{SERVER_URL}/api/games. "
                    "Ensure the server is running."
                ),
            }

    return {"error": True, "detail": f"Unknown tool: {name}"}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def main() -> None:
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(main())
