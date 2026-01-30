"""Minimax agent with alpha-beta pruning, piece-square tables, and move ordering."""

from __future__ import annotations

import asyncio
import math
from typing import Optional

import chess

from .base import BaseAgent

# ---------------------------------------------------------------------------
# Piece values (centipawns)
# ---------------------------------------------------------------------------

PIECE_VALUES: dict[chess.PieceType, int] = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 0,  # king value handled via checkmate scoring
}

# ---------------------------------------------------------------------------
# Piece-square tables (from White's perspective, index 0 = a1)
# Values are in centipawns and added to the base piece value.
# For Black the table is mirrored vertically.
# ---------------------------------------------------------------------------

PAWN_TABLE: list[int] = [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
]

KNIGHT_TABLE: list[int] = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
]

BISHOP_TABLE: list[int] = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
]

ROOK_TABLE: list[int] = [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
]

QUEEN_TABLE: list[int] = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
]

KING_TABLE_MIDDLEGAME: list[int] = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
]

PST: dict[chess.PieceType, list[int]] = {
    chess.PAWN: PAWN_TABLE,
    chess.KNIGHT: KNIGHT_TABLE,
    chess.BISHOP: BISHOP_TABLE,
    chess.ROOK: ROOK_TABLE,
    chess.QUEEN: QUEEN_TABLE,
    chess.KING: KING_TABLE_MIDDLEGAME,
}

# Pre-compute mirrored tables so we don't mirror at runtime.
# Mirror means: flip rank (row), keep file (column).
# Square s on rank r, file f  ->  mirrored square = (7-r)*8 + f
_MIRROR: list[int] = []
for _r in range(8):
    for _f in range(8):
        _MIRROR.append((7 - _r) * 8 + _f)

PST_WHITE: dict[chess.PieceType, list[int]] = {}
PST_BLACK: dict[chess.PieceType, list[int]] = {}
for _pt, _table in PST.items():
    # The tables above are written with rank-8 at the top (index 0-7)
    # and rank-1 at the bottom (index 56-63). In python-chess, square
    # indices go a1=0 .. h8=63, so rank-1 is indices 0-7.  We need to
    # flip the table so that index i gives the bonus for White on square i.
    white_tbl = [0] * 64
    black_tbl = [0] * 64
    for sq in range(64):
        white_tbl[sq] = _table[_MIRROR[sq]]
        black_tbl[sq] = _table[sq]  # already "mirrored" from White's view
    PST_WHITE[_pt] = white_tbl
    PST_BLACK[_pt] = black_tbl

# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

CHECKMATE_SCORE = 100_000


def evaluate(board: chess.Board) -> int:
    """Return a static evaluation in centipawns from the side-to-move's POV.

    Positive values are good for the side to move.
    """
    if board.is_checkmate():
        # The side to move is in checkmate -> they lost.
        return -CHECKMATE_SCORE

    if board.is_stalemate() or board.is_insufficient_material() or board.can_claim_draw():
        return 0

    score = 0
    for sq in chess.SQUARES:
        piece = board.piece_at(sq)
        if piece is None:
            continue
        value = PIECE_VALUES[piece.piece_type]
        if piece.color == chess.WHITE:
            value += PST_WHITE[piece.piece_type][sq]
            score += value
        else:
            value += PST_BLACK[piece.piece_type][sq]
            score -= value

    # Return from side-to-move's perspective.
    if board.turn == chess.BLACK:
        score = -score

    return score


# ---------------------------------------------------------------------------
# Move ordering
# ---------------------------------------------------------------------------

def _move_order_key(board: chess.Board, move: chess.Move) -> int:
    """Return a sort key for *move*. Lower values are searched first.

    Ordering heuristic:
      1. Captures ordered by MVV-LVA (Most Valuable Victim - Least Valuable Aggressor)
      2. Moves that give check
      3. Quiet moves
    """
    score = 0

    # --- Captures: large negative score so they sort first ---------------
    if board.is_capture(move):
        # Victim value
        victim_sq = move.to_square
        victim = board.piece_at(victim_sq)
        if victim is not None:
            victim_val = PIECE_VALUES.get(victim.piece_type, 0)
        else:
            # en-passant: victim is a pawn
            victim_val = PIECE_VALUES[chess.PAWN]

        aggressor = board.piece_at(move.from_square)
        aggressor_val = PIECE_VALUES.get(aggressor.piece_type, 0) if aggressor else 0

        # MVV-LVA: prioritise high victim value, low aggressor value.
        # We negate so that good captures have the lowest keys.
        score = -(10 * victim_val - aggressor_val) - 20_000
    else:
        # --- Checks (non-capture) ----------------------------------------
        board.push(move)
        is_check = board.is_check()
        board.pop()
        if is_check:
            score = -10_000

    # Promotions are always interesting
    if move.promotion is not None:
        score -= PIECE_VALUES.get(move.promotion, 0)

    return score


def _ordered_moves(board: chess.Board) -> list[chess.Move]:
    """Return legal moves sorted by the move-ordering heuristic."""
    moves = list(board.legal_moves)
    moves.sort(key=lambda m: _move_order_key(board, m))
    return moves


# ---------------------------------------------------------------------------
# Negamax with alpha-beta pruning
# ---------------------------------------------------------------------------

def _negamax(board: chess.Board, depth: int, alpha: int, beta: int) -> int:
    """Return the evaluation for the side to move using negamax + alpha-beta.

    Args:
        board: Current position (will be mutated via push/pop).
        depth: Remaining depth to search.
        alpha: Lower bound.
        beta: Upper bound.

    Returns:
        Evaluation in centipawns from the side-to-move's perspective.
    """
    if depth == 0 or board.is_game_over():
        return evaluate(board)

    best = -CHECKMATE_SCORE - 1

    for move in _ordered_moves(board):
        board.push(move)
        score = -_negamax(board, depth - 1, -beta, -alpha)
        board.pop()

        if score > best:
            best = score
        if best > alpha:
            alpha = best
        if alpha >= beta:
            break  # beta cutoff

    return best


def _search_root(board: chess.Board, depth: int) -> chess.Move:
    """Search from the root and return the best move.

    Raises:
        ValueError: If there are no legal moves.
    """
    moves = _ordered_moves(board)
    if not moves:
        raise ValueError("No legal moves available in this position.")

    best_move = moves[0]
    best_score = -CHECKMATE_SCORE - 1
    alpha = -CHECKMATE_SCORE - 1
    beta = CHECKMATE_SCORE + 1

    for move in moves:
        board.push(move)
        score = -_negamax(board, depth - 1, -beta, -alpha)
        board.pop()

        if score > best_score:
            best_score = score
            best_move = move
        if score > alpha:
            alpha = score

    return best_move


# ---------------------------------------------------------------------------
# Agent class
# ---------------------------------------------------------------------------

class MinimaxAgent(BaseAgent):
    """Minimax agent with alpha-beta pruning and piece-square tables.

    Args:
        depth: Search depth in plies (half-moves). Higher values play
               stronger but take exponentially longer.
        name: Agent identifier.
        description: Human-readable description.
    """

    def __init__(
        self,
        depth: int = 3,
        name: Optional[str] = None,
        description: Optional[str] = None,
    ) -> None:
        self.depth = depth
        if name is None:
            name = f"minimax-d{depth}"
        if description is None:
            description = (
                f"Minimax with alpha-beta pruning, depth {depth}, "
                f"piece-square tables and MVV-LVA move ordering."
            )
        super().__init__(name=name, description=description)

    async def select_move(self, board: chess.Board) -> chess.Move:
        """Search for the best move, offloading to a thread to stay async-friendly."""
        # Copy the board so the caller's state is never mutated.
        board_copy = board.copy()
        return await asyncio.to_thread(_search_root, board_copy, self.depth)

    def to_dict(self) -> dict:
        d = super().to_dict()
        d["depth"] = self.depth
        return d
