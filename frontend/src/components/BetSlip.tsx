import { useState } from "react";

interface BetSlipProps {
  betType: string;
  selection: string;
  odds: number;
  onPlace: (stake: number) => void;
  disabled: boolean;
}

const st = {
  card: {
    backgroundColor: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: "4px",
    padding: "10px 12px",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    transition: "border-color 0.15s",
  } as React.CSSProperties,
  info: {
    flex: 1,
    minWidth: 0,
  } as React.CSSProperties,
  selection: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#e8e4dd",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  } as React.CSSProperties,
  odds: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#E63B2E",
  } as React.CSSProperties,
  betType: {
    fontSize: "10px",
    color: "#4a4a4a",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  } as React.CSSProperties,
  inputGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  } as React.CSSProperties,
  input: {
    width: "64px",
    padding: "6px 8px",
    fontSize: "12px",
    fontFamily: "inherit",
    backgroundColor: "#0a0a0a",
    border: "1px solid #2a2a2a",
    borderRadius: "3px",
    color: "#e8e4dd",
    outline: "none",
    textAlign: "right" as const,
  } as React.CSSProperties,
  button: (disabled: boolean) =>
    ({
      padding: "6px 12px",
      fontSize: "11px",
      fontWeight: 700,
      fontFamily: "inherit",
      border: "none",
      borderRadius: "3px",
      cursor: disabled ? "not-allowed" : "pointer",
      backgroundColor: disabled ? "#1e1e1e" : "#E63B2E",
      color: disabled ? "#4a4a4a" : "#ffffff",
      letterSpacing: "0.3px",
      transition: "background-color 0.15s",
      whiteSpace: "nowrap" as const,
    }) as React.CSSProperties,
  payout: {
    fontSize: "10px",
    color: "#4ade80",
    textAlign: "right" as const,
    minWidth: "60px",
  } as React.CSSProperties,
};

export function BetSlip({
  betType,
  selection,
  odds,
  onPlace,
  disabled,
}: BetSlipProps) {
  const [stake, setStake] = useState("");

  const stakeNum = parseFloat(stake) || 0;
  const payout = stakeNum * odds;
  const canBet = !disabled && stakeNum > 0;

  function handlePlace() {
    if (!canBet) return;
    onPlace(stakeNum);
    setStake("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handlePlace();
  }

  return (
    <div style={st.card}>
      <div style={st.info}>
        <div style={st.betType}>{betType}</div>
        <div style={st.selection}>{selection}</div>
        <div style={st.odds}>{odds.toFixed(2)}x</div>
      </div>
      <div style={st.inputGroup}>
        <input
          type="number"
          style={st.input}
          placeholder="0"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          min={0}
        />
        <button
          style={st.button(!canBet)}
          disabled={!canBet}
          onClick={handlePlace}
          onMouseEnter={(e) => {
            if (canBet) e.currentTarget.style.backgroundColor = "#cc3327";
          }}
          onMouseLeave={(e) => {
            if (canBet) e.currentTarget.style.backgroundColor = "#E63B2E";
          }}
        >
          Bet
        </button>
      </div>
      <div style={st.payout}>
        {stakeNum > 0 ? `+${payout.toFixed(0)}` : ""}
      </div>
    </div>
  );
}
