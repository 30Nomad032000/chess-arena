import { useEffect, useState, useCallback } from "react";
import type { Agent } from "../types";

interface TournamentStanding {
  agent_id: string;
  agent_name: string;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  games_played: number;
}

interface TournamentData {
  id: string;
  status: "pending" | "in_progress" | "completed";
  total_games: number;
  completed_games: number;
  standings: TournamentStanding[];
}

const st = {
  container: {
    backgroundColor: "#111111",
    border: "1px solid #1e1e1e",
    borderRadius: "6px",
    padding: "20px",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    display: "flex",
    flexDirection: "column" as const,
    gap: "20px",
  } as React.CSSProperties,
  heading: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#e8e4dd",
    margin: 0,
  } as React.CSSProperties,
  section: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#6b6b6b",
    textTransform: "uppercase" as const,
    letterSpacing: "1.5px",
    margin: 0,
  } as React.CSSProperties,
  agentList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
    maxHeight: "240px",
    overflowY: "auto" as const,
  } as React.CSSProperties,
  agentRow: (selected: boolean) =>
    ({
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "8px 12px",
      backgroundColor: selected ? "#1a1510" : "#0a0a0a",
      border: selected ? "1px solid #E63B2E" : "1px solid #1e1e1e",
      borderRadius: "4px",
      cursor: "pointer",
      transition: "border-color 0.15s, background-color 0.15s",
    }) as React.CSSProperties,
  checkbox: {
    accentColor: "#E63B2E",
    cursor: "pointer",
    width: "16px",
    height: "16px",
  } as React.CSSProperties,
  agentName: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#e8e4dd",
    flex: 1,
  } as React.CSSProperties,
  agentElo: {
    fontSize: "12px",
    color: "#6b6b6b",
  } as React.CSSProperties,
  selectedCount: {
    fontSize: "11px",
    color: "#4a4a4a",
  } as React.CSSProperties,
  startBtn: (disabled: boolean) =>
    ({
      padding: "12px",
      fontSize: "14px",
      fontWeight: 700,
      fontFamily: "inherit",
      border: "none",
      borderRadius: "4px",
      cursor: disabled ? "not-allowed" : "pointer",
      backgroundColor: disabled ? "#2a2a2a" : "#E63B2E",
      color: disabled ? "#6b6b6b" : "#ffffff",
      letterSpacing: "0.5px",
      textTransform: "uppercase" as const,
      transition: "background-color 0.15s",
    }) as React.CSSProperties,
  progressContainer: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  } as React.CSSProperties,
  progressBarOuter: {
    width: "100%",
    height: "8px",
    backgroundColor: "#1e1e1e",
    borderRadius: "4px",
    overflow: "hidden",
  } as React.CSSProperties,
  progressBarInner: (pct: number) =>
    ({
      width: `${pct}%`,
      height: "100%",
      backgroundColor: pct >= 100 ? "#4ade80" : "#E63B2E",
      borderRadius: "4px",
      transition: "width 0.3s",
    }) as React.CSSProperties,
  progressLabel: {
    fontSize: "11px",
    color: "#6b6b6b",
    display: "flex",
    justifyContent: "space-between",
  } as React.CSSProperties,
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "13px",
  } as React.CSSProperties,
  th: {
    textAlign: "left" as const,
    padding: "8px 12px",
    fontSize: "11px",
    color: "#6b6b6b",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    borderBottom: "1px solid #1e1e1e",
    fontWeight: 600,
  } as React.CSSProperties,
  thRight: {
    textAlign: "right" as const,
    padding: "8px 12px",
    fontSize: "11px",
    color: "#6b6b6b",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    borderBottom: "1px solid #1e1e1e",
    fontWeight: 600,
  } as React.CSSProperties,
  td: {
    padding: "8px 12px",
    borderBottom: "1px solid #141414",
    color: "#e8e4dd",
  } as React.CSSProperties,
  tdRight: {
    padding: "8px 12px",
    borderBottom: "1px solid #141414",
    color: "#e8e4dd",
    textAlign: "right" as const,
  } as React.CSSProperties,
  standingRow: (index: number) =>
    ({
      backgroundColor: index % 2 === 0 ? "transparent" : "#0d0d0d",
    }) as React.CSSProperties,
  error: {
    color: "#E63B2E",
    fontSize: "12px",
  } as React.CSSProperties,
  empty: {
    color: "#3a3a3a",
    fontSize: "13px",
    textAlign: "center" as const,
    padding: "24px",
  } as React.CSSProperties,
};

export function TournamentPanel() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch("/api/agents");
        if (res.ok) {
          const data: Agent[] = await res.json();
          setAgents(data);
        }
      } catch {
        // silent
      }
    }
    fetchAgents();
  }, []);

  // Poll active tournament
  const pollTournament = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/tournament/${id}`);
      if (res.ok) {
        const data: TournamentData = await res.json();
        setTournament(data);
        return data.status;
      }
    } catch {
      // silent
    }
    return null;
  }, []);

  useEffect(() => {
    if (!tournament || tournament.status === "completed") return;
    const interval = setInterval(() => {
      pollTournament(tournament.id);
    }, 3000);
    return () => clearInterval(interval);
  }, [tournament, pollTournament]);

  function toggleAgent(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function startTournament() {
    if (selectedIds.size < 2) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_ids: Array.from(selectedIds),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to start tournament");
      }
      const data: TournamentData = await res.json();
      setTournament(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start tournament"
      );
    } finally {
      setLoading(false);
    }
  }

  const isRunning =
    tournament?.status === "in_progress" || tournament?.status === "pending";
  const canStart = selectedIds.size >= 2 && !isRunning && !loading;

  const progress = tournament
    ? tournament.total_games > 0
      ? (tournament.completed_games / tournament.total_games) * 100
      : 0
    : 0;

  return (
    <div style={st.container}>
      <h2 style={st.heading}>Tournament</h2>

      {error && <div style={st.error}>{error}</div>}

      {/* Agent Selection */}
      <div style={st.section}>
        <h3 style={st.sectionTitle}>Select Agents</h3>
        <div style={st.selectedCount}>
          {selectedIds.size} selected (minimum 2)
        </div>
        <div style={st.agentList}>
          {agents.map((agent) => {
            const selected = selectedIds.has(agent.id);
            return (
              <div
                key={agent.id}
                style={st.agentRow(selected)}
                onClick={() => toggleAgent(agent.id)}
              >
                <input
                  type="checkbox"
                  style={st.checkbox}
                  checked={selected}
                  onChange={() => toggleAgent(agent.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span style={st.agentName}>{agent.name}</span>
                <span style={st.agentElo}>{agent.elo} ELO</span>
              </div>
            );
          })}
          {agents.length === 0 && (
            <div style={st.empty}>No agents available</div>
          )}
        </div>
      </div>

      <button
        style={st.startBtn(!canStart)}
        disabled={!canStart}
        onClick={startTournament}
        onMouseEnter={(e) => {
          if (canStart) e.currentTarget.style.backgroundColor = "#cc3327";
        }}
        onMouseLeave={(e) => {
          if (canStart) e.currentTarget.style.backgroundColor = "#E63B2E";
        }}
      >
        {loading
          ? "Starting..."
          : isRunning
            ? "Tournament in Progress"
            : "Start Tournament"}
      </button>

      {/* Progress */}
      {tournament && (
        <div style={st.section}>
          <h3 style={st.sectionTitle}>Progress</h3>
          <div style={st.progressContainer}>
            <div style={st.progressBarOuter}>
              <div style={st.progressBarInner(progress)} />
            </div>
            <div style={st.progressLabel}>
              <span>
                {tournament.completed_games} / {tournament.total_games} games
              </span>
              <span>{progress.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Standings */}
      {tournament && tournament.standings.length > 0 && (
        <div style={st.section}>
          <h3 style={st.sectionTitle}>Standings</h3>
          <table style={st.table}>
            <thead>
              <tr>
                <th style={st.th}>#</th>
                <th style={st.th}>Agent</th>
                <th style={st.thRight}>Pts</th>
                <th style={st.thRight}>W/L/D</th>
                <th style={st.thRight}>GP</th>
              </tr>
            </thead>
            <tbody>
              {tournament.standings
                .sort((a, b) => b.points - a.points)
                .map((s, i) => (
                  <tr key={s.agent_id} style={st.standingRow(i)}>
                    <td style={st.td}>{i + 1}</td>
                    <td style={{ ...st.td, fontWeight: 600 }}>
                      {s.agent_name}
                    </td>
                    <td
                      style={{
                        ...st.tdRight,
                        fontWeight: 700,
                        color: "#4ade80",
                      }}
                    >
                      {s.points}
                    </td>
                    <td style={st.tdRight}>
                      <span style={{ color: "#4ade80" }}>{s.wins}</span>/
                      <span style={{ color: "#E63B2E" }}>{s.losses}</span>/
                      <span style={{ color: "#6b6b6b" }}>{s.draws}</span>
                    </td>
                    <td style={st.tdRight}>{s.games_played}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
