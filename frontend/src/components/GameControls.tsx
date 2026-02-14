import { useEffect, useState } from "react";
import type { Agent } from "../types";

interface GameControlsProps {
  onGameStart: (gameId: string) => void;
  isPlaying: boolean;
}

const s = {
  container: {
    backgroundColor: "#111111",
    border: "1px solid #1e1e1e",
    borderRadius: "6px",
    padding: "20px",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  } as React.CSSProperties,
  heading: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#6b6b6b",
    textTransform: "uppercase" as const,
    letterSpacing: "1.5px",
    marginBottom: "16px",
    margin: "0 0 16px 0",
  } as React.CSSProperties,
  row: {
    display: "flex",
    gap: "12px",
    marginBottom: "14px",
  } as React.CSSProperties,
  fieldGroup: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  } as React.CSSProperties,
  label: {
    fontSize: "11px",
    color: "#6b6b6b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.8px",
  } as React.CSSProperties,
  select: {
    background: "#0a0a0a",
    border: "1px solid #2a2a2a",
    borderRadius: "4px",
    color: "#e8e4dd",
    padding: "8px 10px",
    fontSize: "13px",
    fontFamily: "inherit",
    outline: "none",
    cursor: "pointer",
    width: "100%",
  } as React.CSSProperties,
  sliderContainer: {
    marginBottom: "16px",
  } as React.CSSProperties,
  slider: {
    width: "100%",
    accentColor: "#E63B2E",
    cursor: "pointer",
  } as React.CSSProperties,
  sliderValue: {
    fontSize: "13px",
    color: "#e8e4dd",
    fontWeight: 600,
  } as React.CSSProperties,
  button: (disabled: boolean) =>
    ({
      width: "100%",
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
      transition: "background-color 0.15s",
      textTransform: "uppercase" as const,
    }) as React.CSSProperties,
  error: {
    color: "#E63B2E",
    fontSize: "12px",
    marginTop: "8px",
  } as React.CSSProperties,
};

export function GameControls({ onGameStart, isPlaying }: GameControlsProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [whiteId, setWhiteId] = useState("");
  const [blackId, setBlackId] = useState("");
  const [speed, setSpeed] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch("/api/agents");
        if (res.ok) {
          const data: Agent[] = await res.json();
          setAgents(data);
          if (data.length >= 2) {
            setWhiteId(data[0].id);
            setBlackId(data[1].id);
          }
        }
      } catch {
        setError("Failed to load agents");
      }
    }
    fetchAgents();
  }, []);

  async function handleStart() {
    if (!whiteId || !blackId || isPlaying) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          white_agent: whiteId,
          black_agent: blackId,
          move_delay: speed,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to start match");
      }
      const data = await res.json();
      onGameStart(data.game_id ?? data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start match");
    } finally {
      setLoading(false);
    }
  }

  const disabled = isPlaying || loading || !whiteId || !blackId;

  return (
    <div style={s.container}>
      <h3 style={s.heading}>New Match</h3>

      <div style={s.row}>
        <div style={s.fieldGroup}>
          <label style={s.label}>White</label>
          <select
            style={s.select}
            value={whiteId}
            onChange={(e) => setWhiteId(e.target.value)}
            disabled={isPlaying}
          >
            <option value="">Select agent...</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.elo})
              </option>
            ))}
          </select>
        </div>
        <div style={s.fieldGroup}>
          <label style={s.label}>Black</label>
          <select
            style={s.select}
            value={blackId}
            onChange={(e) => setBlackId(e.target.value)}
            disabled={isPlaying}
          >
            <option value="">Select agent...</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.elo})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={s.sliderContainer}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "6px",
          }}
        >
          <label style={s.label}>Move Speed</label>
          <span style={s.sliderValue}>{speed.toFixed(1)}s</span>
        </div>
        <input
          type="range"
          min={0.1}
          max={2.0}
          step={0.1}
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          style={s.slider}
          disabled={isPlaying}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "10px",
            color: "#4a4a4a",
          }}
        >
          <span>0.1s</span>
          <span>2.0s</span>
        </div>
      </div>

      <button
        style={s.button(disabled)}
        disabled={disabled}
        onClick={handleStart}
        onMouseEnter={(e) => {
          if (!disabled) e.currentTarget.style.backgroundColor = "#cc3327";
        }}
        onMouseLeave={(e) => {
          if (!disabled) e.currentTarget.style.backgroundColor = "#E63B2E";
        }}
      >
        {loading ? "Starting..." : isPlaying ? "Match in Progress" : "Start Match"}
      </button>

      {error && <div style={s.error}>{error}</div>}
    </div>
  );
}
