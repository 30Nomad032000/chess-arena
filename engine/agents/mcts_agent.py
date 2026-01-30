"""Monte Carlo Tree Search (MCTS) chess agent with UCB1 selection."""

from __future__ import annotations

import asyncio
import math
import random
import time
from typing import Optional

import chess

from .base import BaseAgent

# ---------------------------------------------------------------------------
# Material evaluation for rollout cutoff
# ---------------------------------------------------------------------------

_PIECE_VALUES: dict[chess.PieceType, int] = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 0,
}


def _material_eval(board: chess.Board) -> float:
    """Quick material-only evaluation normalised to roughly [-1, 1].

    Returns the evaluation from White's perspective.
    """
    score = 0
    for sq in chess.SQUARES:
        piece = board.piece_at(sq)
        if piece is None:
            continue
        val = _PIECE_VALUES[piece.piece_type]
        if piece.color == chess.WHITE:
            score += val
        else:
            score -= val

    # Normalise with a sigmoid-like mapping so extreme material
    # advantages map close to +/-1 but never exceed the range.
    # tanh(score/1000) gives a nice curve: +9 pawns -> ~0.72
    return math.tanh(score / 1000.0)


# ---------------------------------------------------------------------------
# MCTS Node
# ---------------------------------------------------------------------------

class _MCTSNode:
    """A single node in the MCTS tree."""

    __slots__ = (
        "board",
        "parent",
        "move",
        "children",
        "untried_moves",
        "visits",
        "total_value",
    )

    def __init__(
        self,
        board: chess.Board,
        parent: Optional[_MCTSNode] = None,
        move: Optional[chess.Move] = None,
    ) -> None:
        self.board = board
        self.parent = parent
        self.move = move  # the move that *led* to this node
        self.children: list[_MCTSNode] = []
        self.untried_moves: list[chess.Move] = list(board.legal_moves)
        random.shuffle(self.untried_moves)
        self.visits: int = 0
        self.total_value: float = 0.0

    @property
    def q(self) -> float:
        """Mean value of this node (from the perspective of the player who just moved)."""
        if self.visits == 0:
            return 0.0
        return self.total_value / self.visits

    def is_fully_expanded(self) -> bool:
        return len(self.untried_moves) == 0

    def is_terminal(self) -> bool:
        return self.board.is_game_over()


# ---------------------------------------------------------------------------
# MCTS algorithm
# ---------------------------------------------------------------------------

_UCB1_C = 1.41  # exploration constant (approx sqrt(2))


def _ucb1(node: _MCTSNode, parent_visits: int) -> float:
    """UCB1 value for a child node."""
    if node.visits == 0:
        return float("inf")
    exploitation = node.q
    exploration = _UCB1_C * math.sqrt(math.log(parent_visits) / node.visits)
    return exploitation + exploration


def _select(node: _MCTSNode) -> _MCTSNode:
    """Descend the tree picking the child with the highest UCB1 score."""
    while not node.is_terminal() and node.is_fully_expanded():
        parent_n = node.visits
        node = max(node.children, key=lambda c: _ucb1(c, parent_n))
    return node


def _expand(node: _MCTSNode) -> _MCTSNode:
    """Expand one untried child and return it."""
    move = node.untried_moves.pop()
    child_board = node.board.copy()
    child_board.push(move)
    child = _MCTSNode(board=child_board, parent=node, move=move)
    node.children.append(child)
    return child


_ROLLOUT_DEPTH = 40


def _rollout(board: chess.Board) -> float:
    """Simulate a random game from *board* and return a result in [-1, 1].

    The result is from **White's** perspective:
      +1  White wins
      -1  Black wins
       0  Draw

    If the rollout hits the depth cutoff the material evaluation is used.
    """
    sim = board.copy()
    depth = 0

    while not sim.is_game_over() and depth < _ROLLOUT_DEPTH:
        moves = list(sim.legal_moves)
        sim.push(random.choice(moves))
        depth += 1

    if sim.is_game_over():
        result = sim.result()
        if result == "1-0":
            return 1.0
        elif result == "0-1":
            return -1.0
        else:
            return 0.0
    else:
        return _material_eval(sim)


def _backpropagate(node: _MCTSNode, result_white: float) -> None:
    """Walk back up the tree updating visit counts and values.

    Each node stores value from the perspective of the player who
    just moved to reach that node.
    """
    current: Optional[_MCTSNode] = node
    while current is not None:
        current.visits += 1
        # Determine whose move it was that *led* to this node.
        # current.board.turn is the side to move *next*, so the side
        # that just moved is the opposite colour.
        if current.board.turn == chess.BLACK:
            # White just moved -> positive result_white is good
            current.total_value += result_white
        else:
            # Black just moved -> positive result_white is bad
            current.total_value -= result_white
        current = current.parent


def _mcts_search(board: chess.Board, time_limit: float) -> chess.Move:
    """Run MCTS for up to *time_limit* seconds and return the best move.

    The best move is the child of root with the most visits.

    Raises:
        ValueError: If the position has no legal moves.
    """
    legal = list(board.legal_moves)
    if not legal:
        raise ValueError("No legal moves available in this position.")
    if len(legal) == 1:
        return legal[0]

    root = _MCTSNode(board.copy())
    deadline = time.monotonic() + time_limit
    iterations = 0

    while time.monotonic() < deadline:
        # 1. Selection
        node = _select(root)

        # 2. Expansion
        if not node.is_terminal() and not node.is_fully_expanded():
            node = _expand(node)

        # 3. Simulation (rollout)
        result_white = _rollout(node.board)

        # 4. Backpropagation
        _backpropagate(node, result_white)
        iterations += 1

    # Choose the most-visited child.
    if not root.children:
        # Edge case: could happen if every expansion leads to terminal
        return random.choice(legal)

    best_child = max(root.children, key=lambda c: c.visits)
    return best_child.move  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# Agent class
# ---------------------------------------------------------------------------

class MCTSAgent(BaseAgent):
    """Monte Carlo Tree Search agent.

    Args:
        time_limit: Maximum thinking time in seconds per move.
        name: Agent identifier.
        description: Human-readable description.
    """

    def __init__(
        self,
        time_limit: float = 1.0,
        name: Optional[str] = None,
        description: Optional[str] = None,
    ) -> None:
        self.time_limit = time_limit
        if name is None:
            name = f"mcts-{time_limit:.1f}s"
        if description is None:
            description = (
                f"Monte Carlo Tree Search with UCB1 selection, "
                f"random rollouts (depth 40), {time_limit:.1f}s per move."
            )
        super().__init__(name=name, description=description)

    async def select_move(self, board: chess.Board) -> chess.Move:
        """Run MCTS in a worker thread and return the best move."""
        board_copy = board.copy()
        return await asyncio.to_thread(_mcts_search, board_copy, self.time_limit)

    def to_dict(self) -> dict:
        d = super().to_dict()
        d["time_limit"] = self.time_limit
        return d
