"""FastAPI micro-service for the chess engine.

Internal service called by the Express gateway. Manages games, invokes
agents for move selection, and exposes position analysis.
"""

import sys
import time
import uuid
from pathlib import Path

import chess
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Ensure the project root is on sys.path so that `agents` and `engine`
# packages are importable regardless of how uvicorn is launched.
# ---------------------------------------------------------------------------
_PROJECT_ROOT = str(Path(__file__).resolve().parent)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from agents.base import BaseAgent  # noqa: E402
from agents.random_agent import RandomAgent  # noqa: E402
from engine.analysis import analyze_position  # noqa: E402
from engine.game import Game  # noqa: E402

# ---------------------------------------------------------------------------
# Agent registry
# ---------------------------------------------------------------------------
# All available agents keyed by their unique name.  New agents should be
# instantiated and added here.
_AGENT_REGISTRY: dict[str, BaseAgent] = {}


def _register_agent(agent: BaseAgent) -> None:
    """Add an agent instance to the registry."""
    _AGENT_REGISTRY[agent.name] = agent


# Register the built-in agents.
_register_agent(RandomAgent())

# ---------------------------------------------------------------------------
# Active games store (in-memory)
# ---------------------------------------------------------------------------
_GAMES: dict[str, Game] = {}

# ---------------------------------------------------------------------------
# Pydantic models for request / response bodies
# ---------------------------------------------------------------------------


class NewGameRequest(BaseModel):
    white: str
    black: str


class ValidateMoveRequest(BaseModel):
    move: str


class NewGameResponse(BaseModel):
    game_id: str
    white: str
    black: str
    fen: str


class MoveResponse(BaseModel):
    move: str
    fen: str
    is_over: bool
    result: str | None
    elapsed: float


class StateResponse(BaseModel):
    fen: str
    legal_moves: list[str]
    moves: list[str]
    turn: str
    is_over: bool
    result: str | None
    fullmove_number: int
    white: str
    black: str


class ValidateMoveResponse(BaseModel):
    valid: bool
    resulting_fen: str | None = None


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Chess Arena Engine",
    description="Internal chess engine micro-service for Chess Arena.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_game(game_id: str) -> Game:
    """Retrieve a game by ID or raise 404."""
    game = _GAMES.get(game_id)
    if game is None:
        raise HTTPException(status_code=404, detail=f"Game {game_id} not found.")
    return game


def _get_agent(name: str) -> BaseAgent:
    """Retrieve an agent by name or raise 404."""
    agent = _AGENT_REGISTRY.get(name)
    if agent is None:
        raise HTTPException(
            status_code=404,
            detail=f"Agent '{name}' not found. Available: {list(_AGENT_REGISTRY.keys())}",
        )
    return agent


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/agents")
async def list_agents() -> list[dict]:
    """Return metadata for every registered agent."""
    return [agent.to_dict() for agent in _AGENT_REGISTRY.values()]


@app.post("/game/new", response_model=NewGameResponse)
async def new_game(body: NewGameRequest) -> NewGameResponse:
    """Create a new game between two named agents."""
    # Validate that both agents exist in the registry.
    _get_agent(body.white)
    _get_agent(body.black)

    game_id = uuid.uuid4().hex[:12]
    game = Game(game_id=game_id, white=body.white, black=body.black)
    _GAMES[game_id] = game

    return NewGameResponse(
        game_id=game_id,
        white=body.white,
        black=body.black,
        fen=game.get_fen(),
    )


@app.post("/game/{game_id}/move", response_model=MoveResponse)
async def make_move(game_id: str) -> MoveResponse:
    """Ask the current turn's agent to pick and apply a move."""
    game = _get_game(game_id)

    if game.is_over():
        raise HTTPException(status_code=400, detail="Game is already over.")

    # Determine whose turn it is and look up the corresponding agent.
    agent_name = game.white if game.board.turn == chess.WHITE else game.black
    agent = _get_agent(agent_name)

    # Let the agent choose a move and measure wall-clock time.
    start = time.perf_counter()
    try:
        selected_move = await agent.select_move(game.board.copy())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    elapsed = time.perf_counter() - start

    # Validate that the returned move is actually legal.
    if selected_move not in game.board.legal_moves:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Agent '{agent_name}' returned illegal move "
                f"{selected_move.uci()} in position {game.get_fen()}"
            ),
        )

    game.apply_move(selected_move, elapsed)

    return MoveResponse(
        move=selected_move.uci(),
        fen=game.get_fen(),
        is_over=game.is_over(),
        result=game.result,
        elapsed=round(elapsed, 6),
    )


@app.get("/game/{game_id}/state", response_model=StateResponse)
async def game_state(game_id: str) -> StateResponse:
    """Return the full public state of a game."""
    game = _get_game(game_id)

    return StateResponse(
        fen=game.get_fen(),
        legal_moves=game.get_legal_moves(),
        moves=game.moves,
        turn="white" if game.board.turn == chess.WHITE else "black",
        is_over=game.is_over(),
        result=game.result,
        fullmove_number=game.board.fullmove_number,
        white=game.white,
        black=game.black,
    )


@app.post("/game/{game_id}/validate", response_model=ValidateMoveResponse)
async def validate_move(game_id: str, body: ValidateMoveRequest) -> ValidateMoveResponse:
    """Check whether a UCI move string is legal without playing it."""
    game = _get_game(game_id)

    try:
        move = chess.Move.from_uci(body.move)
    except (chess.InvalidMoveError, ValueError):
        return ValidateMoveResponse(valid=False, resulting_fen=None)

    if move not in game.board.legal_moves:
        return ValidateMoveResponse(valid=False, resulting_fen=None)

    # Compute the resulting FEN without mutating the real board.
    board_copy = game.board.copy()
    board_copy.push(move)
    return ValidateMoveResponse(valid=True, resulting_fen=board_copy.fen())


@app.post("/game/{game_id}/analyze")
async def analyze_game(game_id: str) -> dict:
    """Return a position analysis for the current board state."""
    game = _get_game(game_id)
    return analyze_position(game.board)


@app.get("/health")
async def health() -> dict:
    """Simple health check endpoint."""
    return {
        "status": "ok",
        "active_games": len(_GAMES),
        "registered_agents": list(_AGENT_REGISTRY.keys()),
    }
