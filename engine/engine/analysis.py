"""Position analysis functions for a chess board."""

import chess

# Standard piece values (pawns = 1)
PIECE_VALUES: dict[int, int] = {
    chess.PAWN: 1,
    chess.KNIGHT: 3,
    chess.BISHOP: 3,
    chess.ROOK: 5,
    chess.QUEEN: 9,
}

# The four centre squares
CENTER_SQUARES: list[int] = [chess.D4, chess.D5, chess.E4, chess.E5]

# Total non-pawn, non-king material at the start of a game (per side):
#   2 knights (6) + 2 bishops (6) + 2 rooks (10) + 1 queen (9) = 31
_STARTING_HEAVY_MATERIAL: int = 31


def _count_pieces(board: chess.Board, color: chess.Color) -> dict[str, int]:
    """Count every piece type for the given colour."""
    return {
        "pawns": len(board.pieces(chess.PAWN, color)),
        "knights": len(board.pieces(chess.KNIGHT, color)),
        "bishops": len(board.pieces(chess.BISHOP, color)),
        "rooks": len(board.pieces(chess.ROOK, color)),
        "queens": len(board.pieces(chess.QUEEN, color)),
        "king": len(board.pieces(chess.KING, color)),
    }


def _material_sum(board: chess.Board, color: chess.Color) -> int:
    """Compute the total material value for one side (king excluded)."""
    total = 0
    for piece_type, value in PIECE_VALUES.items():
        total += len(board.pieces(piece_type, color)) * value
    return total


def _heavy_material(board: chess.Board, color: chess.Color) -> int:
    """Non-pawn material (knights, bishops, rooks, queens) for one side."""
    total = 0
    for piece_type in (chess.KNIGHT, chess.BISHOP, chess.ROOK, chess.QUEEN):
        total += len(board.pieces(piece_type, color)) * PIECE_VALUES[piece_type]
    return total


def _game_phase(board: chess.Board) -> str:
    """Classify the position as opening, middlegame, or endgame.

    Uses the total non-pawn material on the board compared to the starting
    amount to decide the phase.
    """
    total_heavy = _heavy_material(board, chess.WHITE) + _heavy_material(
        board, chess.BLACK
    )
    max_heavy = _STARTING_HEAVY_MATERIAL * 2  # both sides combined

    ratio = total_heavy / max_heavy if max_heavy else 0.0

    if ratio > 0.75:
        return "opening"
    if ratio > 0.30:
        return "middlegame"
    return "endgame"


def _center_control(board: chess.Board) -> dict[str, int]:
    """Count how many of the four centre squares each side attacks."""
    white_count = 0
    black_count = 0

    for sq in CENTER_SQUARES:
        if board.is_attacked_by(chess.WHITE, sq):
            white_count += 1
        if board.is_attacked_by(chess.BLACK, sq):
            black_count += 1

    return {"white": white_count, "black": black_count}


def analyze_position(board: chess.Board) -> dict:
    """Return a comprehensive analysis dictionary for the current position.

    Keys:
        material_balance  – positive means white has more material.
        piece_counts      – per-side piece counts.
        game_phase        – "opening", "middlegame", or "endgame".
        is_check          – whether the side to move is in check.
        is_checkmate      – whether the position is checkmate.
        is_stalemate      – whether the position is stalemate.
        legal_move_count  – number of legal moves for the side to move.
        center_control    – how many centre squares each side attacks.
        fen               – current FEN string.
        turn              – "white" or "black".
    """
    white_material = _material_sum(board, chess.WHITE)
    black_material = _material_sum(board, chess.BLACK)

    return {
        "material_balance": white_material - black_material,
        "piece_counts": {
            "white": _count_pieces(board, chess.WHITE),
            "black": _count_pieces(board, chess.BLACK),
        },
        "game_phase": _game_phase(board),
        "is_check": board.is_check(),
        "is_checkmate": board.is_checkmate(),
        "is_stalemate": board.is_stalemate(),
        "legal_move_count": len(list(board.legal_moves)),
        "center_control": _center_control(board),
        "fen": board.fen(),
        "turn": "white" if board.turn == chess.WHITE else "black",
    }
