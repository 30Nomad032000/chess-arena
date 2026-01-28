"""Game state wrapper around python-chess."""

from datetime import datetime, timezone

import chess


class Game:
    """Tracks a single chess game: board state, move history, and metadata."""

    def __init__(self, game_id: str, white: str, black: str) -> None:
        self.id: str = game_id
        self.board: chess.Board = chess.Board()
        self.white: str = white
        self.black: str = black
        self.moves: list[str] = []
        self.timestamps: list[float] = []
        self.result: str | None = None
        self.created_at: str = datetime.now(timezone.utc).isoformat()

    def apply_move(self, move: chess.Move, elapsed: float) -> None:
        """Apply a legal move to the board and record it.

        Args:
            move: A legal chess.Move for the current position.
            elapsed: Time in seconds the agent spent choosing the move.

        Raises:
            ValueError: If the move is not legal in the current position.
        """
        if move not in self.board.legal_moves:
            raise ValueError(
                f"Illegal move {move.uci()} in position {self.board.fen()}"
            )
        self.board.push(move)
        self.moves.append(move.uci())
        self.timestamps.append(elapsed)

        if self.is_over():
            self.result = self.get_result()

    def is_over(self) -> bool:
        """Return True if the game has ended by any means."""
        return self.board.is_game_over(claim_draw=True)

    def get_result(self) -> str:
        """Return the game result string.

        Returns:
            "1-0" if white wins, "0-1" if black wins, "1/2-1/2" for any draw,
            or "*" if the game is still in progress.
        """
        if not self.is_over():
            return "*"

        outcome = self.board.outcome(claim_draw=True)
        if outcome is None:
            return "*"

        if outcome.winner is None:
            return "1/2-1/2"
        return "1-0" if outcome.winner == chess.WHITE else "0-1"

    def get_fen(self) -> str:
        """Return the current FEN string."""
        return self.board.fen()

    def get_legal_moves(self) -> list[str]:
        """Return all legal moves in UCI notation."""
        return [move.uci() for move in self.board.legal_moves]

    def to_dict(self) -> dict:
        """Serialize the full game state to a plain dictionary."""
        return {
            "id": self.id,
            "white": self.white,
            "black": self.black,
            "fen": self.get_fen(),
            "moves": self.moves,
            "timestamps": self.timestamps,
            "result": self.result,
            "is_over": self.is_over(),
            "turn": "white" if self.board.turn == chess.WHITE else "black",
            "fullmove_number": self.board.fullmove_number,
            "legal_moves": self.get_legal_moves(),
            "created_at": self.created_at,
        }
