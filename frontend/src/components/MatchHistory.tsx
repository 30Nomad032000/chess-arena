import { useEffect, useState, useCallback } from "react";
import type { GameSummary } from "../types";

interface MatchHistoryProps {
  onSelectGame: (gameId: string) => void;
}

const st = {
  container: {
    backgroundColor: "#111111",
    border: "1px solid #1e1e1e",
    borderRadius: "6px",
    padding: "20px",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  } as React.CSSProperties,
  heading: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#e8e4dd",
    margin: "0 0 4px 0",
  } as React.CSSProperties,
  subtitle: {
    fontSize: "11px",
    color: "#4a4a4a",
    marginBottom: "16px",
  } as React.CSSProperties,
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "13px",
  } as React.CSSProperties,
  th: {
    textAlign: "left" as const,
    padding: "10px 12px",
    fontSize: "11px",
    color: "#6b6b6b",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    borderBottom: "1px solid #1e1e1e",
    fontWeight: 600,
  } as React.CSSProperties,
  thRight: {
    textAlign: "right" as const,
    padding: "10px 12px",
    fontSize: "11px",
    color: "#6b6b6b",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    borderBottom: "1px solid #1e1e1e",
    fontWeight: 600,
  } as React.CSSProperties,
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #141414",
    color: "#e8e4dd",
  } as React.CSSProperties,
  tdRight: {
    padding: "10px 12px",
    borderBottom: "1px solid #141414",
    color: "#e8e4dd",
    textAlign: "right" as const,
  } as React.CSSProperties,
  row: (index: number) =>
    ({
      backgroundColor: index % 2 === 0 ? "transparent" : "#0d0d0d",
      cursor: "pointer",
      transition: "background-color 0.1s",
    }) as React.CSSProperties,
  result: (result: string | null) => {
    let color = "#6b6b6b";
    if (result === "1-0" || result === "0-1") color = "#e8e4dd";
    if (result === "1/2-1/2") color = "#6b6b6b";
    return {
      fontWeight: 700,
      color,
    } as React.CSSProperties;
  },
  matchup: {
    display: "flex",
    gap: "6px",
    alignItems: "center",
  } as React.CSSProperties,
  vs: {
    color: "#3a3a3a",
    fontSize: "10px",
  } as React.CSSProperties,
  date: {
    color: "#4a4a4a",
    fontSize: "12px",
  } as React.CSSProperties,
  empty: {
    color: "#3a3a3a",
    fontSize: "13px",
    textAlign: "center" as const,
    padding: "32px",
  } as React.CSSProperties,
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MatchHistory({ onSelectGame }: MatchHistoryProps) {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch("/api/games?limit=20");
      if (res.ok) {
        const data: GameSummary[] = await res.json();
        setGames(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  return (
    <div style={st.container}>
      <h2 style={st.heading}>Match History</h2>
      <div style={st.subtitle}>Click a game to open replay</div>

      {loading && <div style={st.empty}>Loading...</div>}
      {!loading && games.length === 0 && (
        <div style={st.empty}>No completed games yet</div>
      )}

      {games.length > 0 && (
        <table style={st.table}>
          <thead>
            <tr>
              <th style={st.th}>Date</th>
              <th style={st.th}>White vs Black</th>
              <th style={st.th}>Result</th>
              <th style={st.thRight}>Moves</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game, i) => (
              <tr
                key={game.id}
                style={st.row(i)}
                onClick={() => onSelectGame(game.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#1a1a1a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    i % 2 === 0 ? "transparent" : "#0d0d0d";
                }}
              >
                <td style={{ ...st.td, ...st.date }}>
                  {formatDate(game.created_at)}
                </td>
                <td style={st.td}>
                  <div style={st.matchup}>
                    <span style={{ fontWeight: 600 }}>{game.white_agent}</span>
                    <span style={st.vs}>vs</span>
                    <span style={{ fontWeight: 600 }}>{game.black_agent}</span>
                  </div>
                </td>
                <td style={{ ...st.td, ...st.result(game.result) }}>
                  {game.result ?? game.status}
                </td>
                <td style={st.tdRight}>{game.total_moves}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
