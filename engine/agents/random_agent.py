"""Agent that selects a uniformly random legal move."""

import random

import chess

from .base import BaseAgent


class RandomAgent(BaseAgent):
    """Picks a random legal move. Useful as a baseline and fallback."""

    def __init__(
        self,
        name: str = "random",
        description: str = "Selects a uniformly random legal move.",
    ) -> None:
        super().__init__(name=name, description=description)

    async def select_move(self, board: chess.Board) -> chess.Move:
        """Return a random legal move.

        Raises:
            ValueError: If the position has no legal moves.
        """
        legal_moves = list(board.legal_moves)
        if not legal_moves:
            raise ValueError("No legal moves available in this position.")
        return random.choice(legal_moves)
