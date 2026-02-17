import { useEffect, useState, useCallback } from "react";
import type { Wallet as WalletType } from "../types";

interface Transaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  created_at: string;
  balance_after: number;
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
  balanceCard: {
    backgroundColor: "#0a0a0a",
    border: "1px solid #1e1e1e",
    borderRadius: "6px",
    padding: "24px",
    textAlign: "center" as const,
  } as React.CSSProperties,
  balanceLabel: {
    fontSize: "11px",
    color: "#6b6b6b",
    textTransform: "uppercase" as const,
    letterSpacing: "1.5px",
    marginBottom: "8px",
  } as React.CSSProperties,
  balanceAmount: {
    fontSize: "36px",
    fontWeight: 700,
    color: "#4ade80",
    lineHeight: 1.2,
  } as React.CSSProperties,
  balanceUnit: {
    fontSize: "14px",
    color: "#6b6b6b",
    marginLeft: "8px",
  } as React.CSSProperties,
  statsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "12px",
    marginTop: "16px",
  } as React.CSSProperties,
  stat: {
    textAlign: "center" as const,
  } as React.CSSProperties,
  statLabel: {
    fontSize: "10px",
    color: "#4a4a4a",
    textTransform: "uppercase" as const,
    letterSpacing: "0.8px",
  } as React.CSSProperties,
  statValue: (color: string) =>
    ({
      fontSize: "16px",
      fontWeight: 700,
      color,
      marginTop: "2px",
    }) as React.CSSProperties,
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
  txList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
    maxHeight: "400px",
    overflowY: "auto" as const,
  } as React.CSSProperties,
  txRow: (type: string) =>
    ({
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 12px",
      backgroundColor: "#0a0a0a",
      borderRadius: "4px",
      borderLeft: `3px solid ${type === "credit" ? "#4ade80" : "#E63B2E"}`,
    }) as React.CSSProperties,
  txInfo: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "2px",
  } as React.CSSProperties,
  txDescription: {
    fontSize: "12px",
    color: "#e8e4dd",
    fontWeight: 500,
  } as React.CSSProperties,
  txDate: {
    fontSize: "10px",
    color: "#4a4a4a",
  } as React.CSSProperties,
  txAmount: (type: string) =>
    ({
      fontSize: "14px",
      fontWeight: 700,
      color: type === "credit" ? "#4ade80" : "#E63B2E",
    }) as React.CSSProperties,
  empty: {
    color: "#3a3a3a",
    fontSize: "13px",
    textAlign: "center" as const,
    padding: "24px",
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

export function Wallet() {
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [walletRes, txRes] = await Promise.all([
        fetch("/api/wallet"),
        fetch("/api/wallet/history"),
      ]);
      if (walletRes.ok) {
        const w: WalletType = await walletRes.json();
        setWallet(w);
      }
      if (txRes.ok) {
        const txs: Transaction[] = await txRes.json();
        setTransactions(txs);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div style={st.container}>
        <h2 style={st.heading}>Wallet</h2>
        <div style={st.empty}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={st.container}>
      <h2 style={st.heading}>Wallet</h2>

      {/* Balance */}
      <div style={st.balanceCard}>
        <div style={st.balanceLabel}>Current Balance</div>
        <div style={st.balanceAmount}>
          {wallet ? wallet.balance.toLocaleString() : "0"}
          <span style={st.balanceUnit}>pts</span>
        </div>
        {wallet && (
          <div style={st.statsRow}>
            <div style={st.stat}>
              <div style={st.statLabel}>Wagered</div>
              <div style={st.statValue("#e8e4dd")}>
                {wallet.total_wagered.toLocaleString()}
              </div>
            </div>
            <div style={st.stat}>
              <div style={st.statLabel}>Won</div>
              <div style={st.statValue("#4ade80")}>
                {wallet.total_won.toLocaleString()}
              </div>
            </div>
            <div style={st.stat}>
              <div style={st.statLabel}>Lost</div>
              <div style={st.statValue("#E63B2E")}>
                {wallet.total_lost.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div style={st.section}>
        <h3 style={st.sectionTitle}>Transaction History</h3>
        <div style={st.txList}>
          {transactions.length === 0 && (
            <div style={st.empty}>No transactions yet</div>
          )}
          {transactions.map((tx) => (
            <div key={tx.id} style={st.txRow(tx.type)}>
              <div style={st.txInfo}>
                <span style={st.txDescription}>{tx.description}</span>
                <span style={st.txDate}>{formatDate(tx.created_at)}</span>
              </div>
              <span style={st.txAmount(tx.type)}>
                {tx.type === "credit" ? "+" : "-"}
                {tx.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
