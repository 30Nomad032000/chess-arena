import { useEffect, useRef } from "react";
import type { GameEvent } from "../types";

interface GameInfoProps {
  events: GameEvent[];
  isGameOver: boolean;
}

interface ParsedMove {
  san: string;
  thinkTime: number;
}

function extractMoves(events: GameEvent[]): ParsedMove[] {
  const moves: ParsedMove[] = [];
  let lastTimestamp: number | null = null;

  for (const ev of events) {
    if (ev.type === "move" && ev.data.move) {
      const san =
        typeof ev.data.san === "string" ? ev.data.san : ev.data.move;
      const thinkTime =
        lastTimestamp !== null
          ? Math.max(0, (ev.timestamp - lastTimestamp) / 1000)
          : 0;
      moves.push({ san, thinkTime });
      lastTimestamp = ev.timestamp;
    } else if (ev.type === "game_start") {
      lastTimestamp = ev.timestamp;
    }
  }
  return moves;
}

function getPlayerNames(events: GameEvent[]): {
  white: string;
  black: string;
} {
  for (const ev of events) {
    if (ev.type === "game_start") {
      return {
        white: typeof ev.data.white === "string" ? ev.data.white : "White",
        black: typeof ev.data.black === "string" ? ev.data.black : "Black",
      };
    }
  }
  return { white: "White", black: "Black" };
}

function getResult(events: GameEvent[]): string | null {
  for (const ev of events) {
    if (ev.type === "game_end") {
      const parts: string[] = [];
      if (ev.data.result) parts.push(ev.data.result);
      if (ev.data.reason) parts.push(`(${ev.data.reason})`);
      if (ev.data.winner) parts.push(`Winner: ${ev.data.winner}`);
      return parts.length > 0 ? parts.join(" ") : "Game Over";
    }
  }
  return null;
}

const st = {
  container: {
    backgroundColor: "#111111",
    border: "1px solid #1e1e1e",
    borderRadius: "6px",
    padding: "16px",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    display: "flex",
    flexDirection: "column" as const,
    height: "100%",
    minHeight: 0,
  } as React.CSSProperties,
  heading: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#6b6b6b",
    textTransform: "uppercase" as const,
    letterSpacing: "1.5px",
    margin: "0 0 12px 0",
  } as React.CSSProperties,
  players: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    padding: "10px 12px",
    backgroundColor: "#0a0a0a",
    borderRadius: "4px",
    border: "1px solid #1e1e1e",
  } as React.CSSProperties,
  playerName: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#e8e4dd",
  } as React.CSSProperties,
  vs: {
    fontSize: "11px",
    color: "#4a4a4a",
    fontWeight: 600,
  } as React.CSSProperties,
  moveCounter: {
    fontSize: "11px",
    color: "#6b6b6b",
    marginBottom: "8px",
    textAlign: "right" as const,
  } as React.CSSProperties,
  moveList: {
    flex: 1,
    overflowY: "auto" as const,
    minHeight: 0,
  } as React.CSSProperties,
  moveRow: {
    display: "grid",
    gridTemplateColumns: "36px 1fr 48px 1fr 48px",
    gap: "4px",
    padding: "3px 6px",
    fontSize: "12px",
    alignItems: "center",
  } as React.CSSProperties,
  moveNumber: {
    color: "#4a4a4a",
    fontSize: "11px",
    textAlign: "right" as const,
    paddingRight: "6px",
  } as React.CSSProperties,
  moveText: {
    color: "#e8e4dd",
    fontWeight: 500,
  } as React.CSSProperties,
  thinkTime: {
    color: "#4a4a4a",
    fontSize: "10px",
    textAlign: "right" as const,
  } as React.CSSProperties,
  result: {
    marginTop: "12px",
    padding: "12px",
    backgroundColor: "#1a1a1a",
    borderRadius: "4px",
    border: "1px solid #E63B2E",
    textAlign: "center" as const,
    fontSize: "13px",
    fontWeight: 700,
    color: "#E63B2E",
    letterSpacing: "0.5px",
  } as React.CSSProperties,
  empty: {
    color: "#3a3a3a",
    fontSize: "12px",
    textAlign: "center" as const,
    padding: "24px",
  } as React.CSSProperties,
};

export function GameInfo({ events, isGameOver }: GameInfoProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const moves = extractMoves(events);
  const { white, black } = getPlayerNames(events);
  const result = getResult(events);

  const moveCount = Math.ceil(moves.length / 2);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves.length]);

  const movePairs: { num: number; white: ParsedMove | null; black: ParsedMove | null }[] =
    [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: moves[i] ?? null,
      black: moves[i + 1] ?? null,
    });
  }

  return (
    <div style={st.container}>
      <h3 style={st.heading}>Game Info</h3>

      <div style={st.players}>
        <span style={st.playerName}>{white}</span>
        <span style={st.vs}>vs</span>
        <span style={st.playerName}>{black}</span>
      </div>

      <div style={st.moveCounter}>
        Move {moveCount} {isGameOver ? "(Final)" : ""}
      </div>

      <div style={st.moveList} ref={scrollRef}>
        {movePairs.length === 0 && (
          <div style={st.empty}>Waiting for moves...</div>
        )}
        {movePairs.map((pair) => (
          <div
            key={pair.num}
            style={{
              ...st.moveRow,
              backgroundColor: pair.num % 2 === 0 ? "#0f0f0f" : "transparent",
            }}
          >
            <span style={st.moveNumber}>{pair.num}.</span>
            <span style={st.moveText}>{pair.white?.san ?? ""}</span>
            <span style={st.thinkTime}>
              {pair.white ? `${pair.white.thinkTime.toFixed(1)}s` : ""}
            </span>
            <span style={st.moveText}>{pair.black?.san ?? ""}</span>
            <span style={st.thinkTime}>
              {pair.black ? `${pair.black.thinkTime.toFixed(1)}s` : ""}
            </span>
          </div>
        ))}
      </div>

      {result && <div style={st.result}>{result}</div>}
    </div>
  );
}
