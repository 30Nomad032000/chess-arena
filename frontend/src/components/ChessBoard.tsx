import { Chessboard } from "react-chessboard";

interface LastMove {
  from: string;
  to: string;
}

interface ChessBoardProps {
  fen: string;
  lastMove?: LastMove | null;
  orientation?: "white" | "black";
  width?: number;
}

function buildCustomSquareStyles(
  lastMove: LastMove | null | undefined
): Record<string, React.CSSProperties> {
  const sq: Record<string, React.CSSProperties> = {};
  if (lastMove) {
    const highlight: React.CSSProperties = {
      backgroundColor: "rgba(255, 255, 50, 0.35)",
    };
    sq[lastMove.from] = highlight;
    sq[lastMove.to] = highlight;
  }
  return sq;
}

const boardWrapper = (width: number): React.CSSProperties => ({
  border: "2px solid #2a2a2a",
  borderRadius: "4px",
  overflow: "hidden",
  width: width,
  height: width,
  boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
});

export function ChessBoard({
  fen,
  lastMove,
  orientation = "white",
  width = 480,
}: ChessBoardProps) {
  const customSquareStyles = buildCustomSquareStyles(lastMove);

  return (
    <div style={boardWrapper(width)}>
      <Chessboard
        position={fen}
        boardOrientation={orientation}
        boardWidth={width}
        arePiecesDraggable={false}
        customDarkSquareStyle={{ backgroundColor: "#779952" }}
        customLightSquareStyle={{ backgroundColor: "#edeed1" }}
        customSquareStyles={customSquareStyles}
        customBoardStyle={{
          borderRadius: "0px",
        }}
        onPieceDrop={() => false}
        animationDuration={200}
        id="chess-arena-board"
      />
    </div>
  );
}

export type { LastMove };
