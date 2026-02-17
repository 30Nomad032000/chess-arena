import { useEffect, useState, useCallback } from "react";
import type { LeaderboardEntry } from "../types";

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
  rank: {
    fontWeight: 700,
    color: "#4a4a4a",
    width: "40px",
  } as React.CSSProperties,
  agentName: {
    fontWeight: 600,
    color: "#e8e4dd",
  } as React.CSSProperties,
  elo: (elo: number) =>
    ({
      fontWeight: 700,
      color: elo >= 1500 ? "#4ade80" : "#E63B2E",
      textAlign: "right" as const,
    }) as React.CSSProperties,
  wld: {
    color: "#6b6b6b",
    fontSize: "12px",
  } as React.CSSProperties,
  row: (index: number) =>
    ({
      backgroundColor: index % 2 === 0 ? "transparent" : "#0d0d0d",
      transition: "background-color 0.1s",
    }) as React.CSSProperties,
  empty: {
    color: "#3a3a3a",
    fontSize: "13px",
    textAlign: "center" as const,
    padding: "32px",
  } as React.CSSProperties,
  refreshNote: {
    fontSize: "10px",
    color: "#3a3a3a",
    textAlign: "right" as const,
    marginTop: "8px",
  } as React.CSSProperties,
};

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard");
      if (res.ok) {
        const data: LeaderboardEntry[] = await res.json();
        data.sort((a, b) => b.elo - a.elo);
        setEntries(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  return (
    <div style={st.container}>
      <h2 style={st.heading}>ELO Rankings</h2>
      <div style={st.subtitle}>Auto-refreshes every 30 seconds</div>

      {loading && <div style={st.empty}>Loading...</div>}
      {!loading && entries.length === 0 && (
        <div style={st.empty}>No agents ranked yet</div>
      )}

      {entries.length > 0 && (
        <table style={st.table}>
          <thead>
            <tr>
              <th style={st.th}>Rank</th>
              <th style={st.th}>Agent</th>
              <th style={st.thRight}>ELO</th>
              <th style={st.thRight}>W/L/D</th>
              <th style={st.thRight}>Games</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={entry.agent_id} style={st.row(i)}>
                <td style={{ ...st.td, ...st.rank }}>#{i + 1}</td>
                <td style={{ ...st.td, ...st.agentName }}>
                  {entry.agent_name}
                </td>
                <td style={{ ...st.tdRight, ...st.elo(entry.elo) }}>
                  {entry.elo}
                </td>
                <td style={{ ...st.tdRight, ...st.wld }}>
                  <span style={{ color: "#4ade80" }}>{entry.wins}</span>
                  {" / "}
                  <span style={{ color: "#E63B2E" }}>{entry.losses}</span>
                  {" / "}
                  <span style={{ color: "#6b6b6b" }}>{entry.draws}</span>
                </td>
                <td style={st.tdRight}>{entry.total_games}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={st.refreshNote}>
        {entries.length} agents ranked
      </div>
    </div>
  );
}
