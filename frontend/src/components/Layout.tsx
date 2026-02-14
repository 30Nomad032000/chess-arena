import { useEffect, useState, type ReactNode } from "react";
import type { Wallet as WalletType } from "../types";

type Tab = "live" | "leaderboard" | "history" | "tournament";

interface LayoutProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  children: ReactNode;
}

const tabs: { key: Tab; label: string }[] = [
  { key: "live", label: "Live" },
  { key: "leaderboard", label: "Leaderboard" },
  { key: "history", label: "History" },
  { key: "tournament", label: "Tournament" },
];

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#0a0a0a",
    color: "#e8e4dd",
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  } as React.CSSProperties,
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    height: "56px",
    borderBottom: "1px solid #1e1e1e",
    backgroundColor: "#0f0f0f",
  } as React.CSSProperties,
  titleSection: {
    display: "flex",
    alignItems: "center",
    gap: "32px",
  } as React.CSSProperties,
  title: {
    fontSize: "18px",
    fontWeight: 700,
    letterSpacing: "0.5px",
    color: "#e8e4dd",
    margin: 0,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  } as React.CSSProperties,
  nav: {
    display: "flex",
    gap: "4px",
  } as React.CSSProperties,
  tab: (active: boolean) =>
    ({
      padding: "8px 16px",
      fontSize: "13px",
      fontWeight: 500,
      cursor: "pointer",
      border: "none",
      background: active ? "#1a1a1a" : "transparent",
      color: active ? "#E63B2E" : "#6b6b6b",
      borderBottom: active ? "2px solid #E63B2E" : "2px solid transparent",
      fontFamily: "inherit",
      transition: "color 0.15s, background 0.15s",
      letterSpacing: "0.3px",
    }) as React.CSSProperties,
  wallet: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "#4ade80",
    fontFamily: "inherit",
  } as React.CSSProperties,
  walletLabel: {
    color: "#6b6b6b",
    fontSize: "11px",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
  } as React.CSSProperties,
  walletAmount: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#4ade80",
  } as React.CSSProperties,
  content: {
    padding: "24px",
    maxWidth: "1400px",
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
};

export function Layout({ activeTab, onTabChange, children }: LayoutProps) {
  const [wallet, setWallet] = useState<WalletType | null>(null);

  useEffect(() => {
    async function fetchWallet() {
      try {
        const res = await fetch("/api/wallet");
        if (res.ok) {
          const data: WalletType = await res.json();
          setWallet(data);
        }
      } catch {
        // silent fail
      }
    }
    fetchWallet();
    const interval = setInterval(fetchWallet, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>Chess Arena</h1>
          <nav style={styles.nav}>
            {tabs.map((t) => (
              <button
                key={t.key}
                style={styles.tab(activeTab === t.key)}
                onClick={() => onTabChange(t.key)}
                onMouseEnter={(e) => {
                  if (activeTab !== t.key) {
                    e.currentTarget.style.color = "#e8e4dd";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== t.key) {
                    e.currentTarget.style.color = "#6b6b6b";
                  }
                }}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <div style={styles.wallet}>
          <span style={styles.walletLabel}>Balance</span>
          <span style={styles.walletAmount}>
            {wallet ? wallet.balance.toLocaleString() : "---"}
          </span>
          <span style={{ color: "#6b6b6b", fontSize: "11px" }}>pts</span>
        </div>
      </header>
      <main style={styles.content}>{children}</main>
    </div>
  );
}
