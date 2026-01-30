"""Abstract base class for chess agents."""

from abc import ABC, abstractmethod

import chess


class BaseAgent(ABC):
    """Base class that all chess agents must inherit from.

    Attributes:
        name: A short, unique identifier for this agent (e.g. "minimax-d3").
        description: A human-readable description of the agent's strategy.
    """

    def __init__(self, name: str, description: str) -> None:
        self.name = name
        self.description = description

    @abstractmethod
    async def select_move(self, board: chess.Board) -> chess.Move:
        """Choose a move for the current board position.

        Args:
            board: The current chess board state. Implementations should
                   treat this as read-only (copy before mutating).

        Returns:
            A legal ``chess.Move`` to play.

        Raises:
            ValueError: If the board has no legal moves (game is already over).
        """

    def to_dict(self) -> dict:
        """Serialize agent metadata to a plain dictionary."""
        return {
            "name": self.name,
            "description": self.description,
            "type": self.__class__.__name__,
        }

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} name={self.name!r}>"
