import { useEffect, useState, useCallback } from "react";
import { BetSlip } from "./BetSlip";
import type { Bet, MarketOdds } from "../types";

interface BettingPanelProps {
  gameId: string | null;
  isGameOver: boolean;
}

interface MarketData {
  outcome: MarketOdds | null;
  totalMoves: { over: number; under: number; line: number } | null;
  nextMove: { options: { move: string; odds: number }[] } | null;
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
    gap: "16px",
    height: "100%",
    minHeight: 0,
    overflowY: "auto" as const,
  } as React.CSSProperties,
  heading: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#6b6b6b",
    textTransform: "uppercase" as const,
    letterSpacing: "1.5px",
    margin: 0,
  } as React.CSSProperties,
  section: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#E63B2E",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    paddingBottom: "4px",
    borderBottom: "1px solid #1e1e1e",
    margin: 0,
  } as React.CSSProperties,
  activeBets: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  } as React.CSSProperties,
  betRow: (status: string) =>
    ({
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "6px 10px",
      backgroundColor: "#0a0a0a",
      borderRadius: "3px",
      fontSize: "11px",
      borderLeft: `3px solid ${
        status === "won"
          ? "#4ade80"
          : status === "lost"
            ? "#E63B2E"
            : "#4a4a4a"
      }`,
    }) as React.CSSProperties,
  betAmount: {
    color: "#e8e4dd",
    fontWeight: 600,
  } as React.CSSProperties,
  betStatus: (status: string) =>
    ({
      fontWeight: 700,
      fontSize: "10px",
      textTransform: "uppercase" as const,
      letterSpacing: "0.5px",
      color:
        status === "won"
          ? "#4ade80"
          : status === "lost"
            ? "#E63B2E"
            : "#6b6b6b",
    }) as React.CSSProperties,
  payout: (won: boolean) =>
    ({
      fontWeight: 700,
      color: won ? "#4ade80" : "#E63B2E",
    }) as React.CSSProperties,
  empty: {
    color: "#3a3a3a",
    fontSize: "12px",
    textAlign: "center" as const,
    padding: "16px",
  } as React.CSSProperties,
  error: {
    color: "#E63B2E",
    fontSize: "11px",
  } as React.CSSProperties,
};

export function BettingPanel({ gameId, isGameOver }: BettingPanelProps) {
  const [markets, setMarkets] = useState<MarketData>({
    outcome: null,
    totalMoves: null,
    nextMove: null,
  });
  const [activeBets, setActiveBets] = useState<Bet[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkets = useCallback(async () => {
    if (!gameId) return;
    try {
      const res = await fetch(`/api/markets/${gameId}`);
      if (res.ok) {
        const data = await res.json();
        setMarkets({
          outcome: data.outcome ?? null,
          totalMoves: data.total_moves ?? null,
          nextMove: data.next_move ?? null,
        });
      }
    } catch {
      // silently fail, markets may not be available yet
    }
  }, [gameId]);

  const fetchBets = useCallback(async () => {
    if (!gameId) return;
    try {
      const res = await fetch(`/api/bets?game_id=${gameId}`);
      if (res.ok) {
        const data: Bet[] = await res.json();
        setActiveBets(data);
      }
    } catch {
      // silent
    }
  }, [gameId]);

  useEffect(() => {
    fetchMarkets();
    fetchBets();
    const interval = setInterval(() => {
      fetchMarkets();
      fetchBets();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchMarkets, fetchBets]);

  async function placeBet(
    marketType: string,
    selection: string,
    odds: number,
    stake: number
  ) {
    if (!gameId) return;
    setError(null);
    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: gameId,
          market_type: marketType,
          selection,
          odds,
          amount: stake,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to place bet");
      }
      fetchBets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place bet");
    }
  }

  if (!gameId) {
    return (
      <div style={st.container}>
        <h3 style={st.heading}>Betting</h3>
        <div style={st.empty}>Start a match to place bets</div>
      </div>
    );
  }

  const outcome = markets.outcome;

  return (
    <div style={st.container}>
      <h3 style={st.heading}>Betting</h3>

      {error && <div style={st.error}>{error}</div>}

      {/* Match Outcome */}
      {outcome && (
        <div style={st.section}>
          <h4 style={st.sectionTitle}>Match Outcome</h4>
          <BetSlip
            betType="Outcome"
            selection={`${outcome.white_agent} Win`}
            odds={outcome.white_odds}
            onPlace={(stake) =>
              placeBet("outcome", "white", outcome.white_odds, stake)
            }
            disabled={isGameOver}
          />
          <BetSlip
            betType="Outcome"
            selection="Draw"
            odds={outcome.draw_odds}
            onPlace={(stake) =>
              placeBet("outcome", "draw", outcome.draw_odds, stake)
            }
            disabled={isGameOver}
          />
          <BetSlip
            betType="Outcome"
            selection={`${outcome.black_agent} Win`}
            odds={outcome.black_odds}
            onPlace={(stake) =>
              placeBet("outcome", "black", outcome.black_odds, stake)
            }
            disabled={isGameOver}
          />
        </div>
      )}

      {/* Total Moves */}
      {markets.totalMoves && (
        <div style={st.section}>
          <h4 style={st.sectionTitle}>
            Total Moves (Line: {markets.totalMoves.line})
          </h4>
          <BetSlip
            betType="Total Moves"
            selection={`Over ${markets.totalMoves.line}`}
            odds={markets.totalMoves.over}
            onPlace={(stake) =>
              placeBet(
                "total_moves",
                "over",
                markets.totalMoves!.over,
                stake
              )
            }
            disabled={isGameOver}
          />
          <BetSlip
            betType="Total Moves"
            selection={`Under ${markets.totalMoves.line}`}
            odds={markets.totalMoves.under}
            onPlace={(stake) =>
              placeBet(
                "total_moves",
                "under",
                markets.totalMoves!.under,
                stake
              )
            }
            disabled={isGameOver}
          />
        </div>
      )}

      {/* Next Move */}
      {markets.nextMove && markets.nextMove.options.length > 0 && (
        <div style={st.section}>
          <h4 style={st.sectionTitle}>Next Move</h4>
          {markets.nextMove.options.map((opt) => (
            <BetSlip
              key={opt.move}
              betType="Next Move"
              selection={opt.move}
              odds={opt.odds}
              onPlace={(stake) =>
                placeBet("next_move", opt.move, opt.odds, stake)
              }
              disabled={isGameOver}
            />
          ))}
        </div>
      )}

      {/* Active Bets */}
      {activeBets.length > 0 && (
        <div style={st.section}>
          <h4 style={st.sectionTitle}>Your Bets</h4>
          <div style={st.activeBets}>
            {activeBets.map((bet) => (
              <div key={bet.id} style={st.betRow(bet.status)}>
                <div>
                  <span style={st.betAmount}>{bet.amount}</span>
                  <span style={{ color: "#6b6b6b", marginLeft: "6px" }}>
                    @ {bet.odds.toFixed(2)}x
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {bet.status === "won" && bet.payout !== null && (
                    <span style={st.payout(true)}>+{bet.payout}</span>
                  )}
                  {bet.status === "lost" && (
                    <span style={st.payout(false)}>-{bet.amount}</span>
                  )}
                  <span style={st.betStatus(bet.status)}>{bet.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
