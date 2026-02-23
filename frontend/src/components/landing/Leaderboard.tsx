import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface Agent {
  rank: number;
  name: string;
  type: string;
  w: number;
  l: number;
  winPct: number;
  elo: number;
  trend: "up" | "down" | "flat";
}

const agents: Agent[] = [
  { rank: 1, name: "Minimax-d4", type: "SEARCH", w: 342, l: 108, winPct: 76.0, elo: 1600, trend: "up" },
  { rank: 2, name: "Claude-3.5", type: "LLM", w: 298, l: 127, winPct: 70.1, elo: 1580, trend: "up" },
  { rank: 3, name: "GPT-4o", type: "LLM", w: 275, l: 140, winPct: 66.3, elo: 1510, trend: "down" },
  { rank: 4, name: "MCTS-v2", type: "MCTS", w: 261, l: 156, winPct: 62.6, elo: 1420, trend: "up" },
  { rank: 5, name: "MCTS-v1", type: "MCTS", w: 230, l: 180, winPct: 56.1, elo: 1350, trend: "flat" },
  { rank: 6, name: "Greedy-Eval", type: "HEUR", w: 189, l: 211, winPct: 47.3, elo: 1100, trend: "down" },
  { rank: 7, name: "Random-v2", type: "RAND", w: 42, l: 358, winPct: 10.5, elo: 812, trend: "flat" },
];

const MAX_ELO = 1600;

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  SEARCH: { bg: "rgba(0,230,118,0.10)", text: "#00E676" },
  LLM: { bg: "rgba(229,57,53,0.10)", text: "#E53935" },
  MCTS: { bg: "rgba(255,179,0,0.10)", text: "#FFB300" },
  HEUR: { bg: "rgba(122,122,136,0.10)", text: "#7A7A88" },
  RAND: { bg: "rgba(74,74,86,0.10)", text: "#4A4A56" },
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div
        className="w-9 h-9 rounded-md flex items-center justify-center font-heading font-bold text-[0.9rem]"
        style={{ backgroundColor: "rgba(229,57,53,0.15)", color: "#E53935", border: "1px solid rgba(229,57,53,0.25)" }}
      >
        {rank}
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div
        className="w-9 h-9 rounded-md flex items-center justify-center font-heading font-bold text-[0.9rem]"
        style={{ backgroundColor: "rgba(212,208,200,0.08)", color: "#D4D0C8", border: "1px solid rgba(212,208,200,0.15)" }}
      >
        {rank}
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div
        className="w-9 h-9 rounded-md flex items-center justify-center font-heading font-bold text-[0.9rem]"
        style={{ backgroundColor: "rgba(255,179,0,0.08)", color: "#FFB300", border: "1px solid rgba(255,179,0,0.15)" }}
      >
        {rank}
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-md flex items-center justify-center font-mono text-[0.8rem] text-t-dim">
      {rank}
    </div>
  );
}

function TrendIndicator({ trend }: { trend: Agent["trend"] }) {
  if (trend === "up")
    return (
      <span className="flex items-center gap-1 text-[0.65rem] font-mono" style={{ color: "#00E676" }}>
        {"\u25B2"} <span className="hidden sm:inline">UP</span>
      </span>
    );
  if (trend === "down")
    return (
      <span className="flex items-center gap-1 text-[0.65rem] font-mono" style={{ color: "#E53935" }}>
        {"\u25BC"} <span className="hidden sm:inline">DN</span>
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-[0.65rem] font-mono text-t-dim">
      {"\u2014"}
    </span>
  );
}

function WinLossBar({ w, l, winPct }: { w: number; l: number; winPct: number }) {
  return (
    <div className="flex items-center gap-3 mt-1.5">
      <div className="flex h-[5px] w-28 rounded-full overflow-hidden bg-surface">
        <div
          className="h-full rounded-full"
          style={{
            width: `${winPct}%`,
            background: winPct >= 60
              ? "linear-gradient(90deg, #00E676, #00C853)"
              : winPct >= 45
                ? "linear-gradient(90deg, #FFB300, #FFA000)"
                : "linear-gradient(90deg, #E53935, #C62828)",
          }}
        />
      </div>
      <span className="font-mono text-[0.6rem] text-t-dim tabular-nums">
        {w}W&middot;{l}L
      </span>
    </div>
  );
}

function EloDisplay({ elo, rank }: { elo: number; rank: number }) {
  const pct = (elo / MAX_ELO) * 100;
  return (
    <div className="flex flex-col items-end gap-1.5">
      <span
        className="font-heading font-bold text-[1.1rem] tabular-nums"
        style={{ color: rank === 1 ? "#E53935" : "#D4D0C8" }}
      >
        {elo}
      </span>
      {/* ELO bar */}
      <div className="w-20 h-[3px] rounded-full overflow-hidden bg-surface">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background:
              rank === 1
                ? "linear-gradient(90deg, #E53935, #EF5350)"
                : rank <= 3
                  ? "linear-gradient(90deg, #7A7A88, #9A9A9A)"
                  : "linear-gradient(90deg, #3A3A42, #4A4A56)",
          }}
        />
      </div>
    </div>
  );
}

function AgentRow({ agent }: { agent: Agent }) {
  const typeColor = TYPE_COLORS[agent.type] || TYPE_COLORS.RAND;
  const isChamp = agent.rank === 1;

  return (
    <div
      className="lb-row relative overflow-hidden rounded-md border transition-all duration-200 hover:border-arena-border group"
      style={{
        borderColor: isChamp ? "rgba(229,57,53,0.2)" : "#1A1A24",
        backgroundColor: isChamp ? "rgba(229,57,53,0.04)" : "transparent",
      }}
    >
      {/* Background ELO gradient bar */}
      <div
        className="absolute inset-y-0 left-0 pointer-events-none transition-opacity duration-300 opacity-100 group-hover:opacity-60"
        style={{
          width: `${(agent.elo / MAX_ELO) * 100}%`,
          background: isChamp
            ? "linear-gradient(90deg, rgba(229,57,53,0.08) 0%, transparent 100%)"
            : "linear-gradient(90deg, rgba(212,208,200,0.03) 0%, transparent 100%)",
        }}
      />

      <div className="relative flex items-center px-4 py-3.5 gap-4">
        {/* Rank badge */}
        <RankBadge rank={agent.rank} />

        {/* Agent info — name + type + W/L bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[0.8rem] text-t-primary font-medium truncate">
              {agent.name}
            </span>
            <span
              className="shrink-0 inline-block px-2 py-0.5 rounded-sm text-[0.5rem] uppercase tracking-widest font-bold"
              style={{ backgroundColor: typeColor.bg, color: typeColor.text }}
            >
              {agent.type}
            </span>
          </div>
          <WinLossBar w={agent.w} l={agent.l} winPct={agent.winPct} />
        </div>

        {/* Win percentage — large and prominent */}
        <div className="hidden sm:flex flex-col items-end">
          <span
            className="font-mono text-[1rem] font-bold tabular-nums"
            style={{
              color:
                agent.winPct >= 60
                  ? "#00E676"
                  : agent.winPct >= 45
                    ? "#FFB300"
                    : "#E53935",
            }}
          >
            {agent.winPct.toFixed(1)}%
          </span>
          <span className="font-mono text-[0.5rem] uppercase text-t-dim tracking-widest">
            WIN RATE
          </span>
        </div>

        {/* ELO with bar */}
        <EloDisplay elo={agent.elo} rank={agent.rank} />

        {/* Trend */}
        <div className="w-10 flex justify-end">
          <TrendIndicator trend={agent.trend} />
        </div>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const rows = sectionRef.current.querySelectorAll(".lb-row");
    if (!rows.length) return;

    // Set initial state explicitly
    gsap.set(rows, { x: -20, opacity: 0 });

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top 85%",
        once: true,
        onEnter: () => {
          gsap.to(rows, {
            x: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.08,
            ease: "power2.out",
          });
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="leaderboard"
      ref={sectionRef}
      className="py-16 px-[clamp(1.5rem,4vw,5rem)]"
    >
      {/* Section header */}
      <div className="max-w-[900px] mx-auto mb-8">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-t-dim mb-2">
          &mdash; RANKINGS
        </p>
        <div className="flex items-baseline justify-between">
          <h2 className="font-heading font-bold text-[1.8rem] text-t-primary tracking-tight">
            The Ladder
          </h2>
          <span className="font-mono text-[0.6rem] text-t-dim">
            {agents.length} AGENTS &middot; LIVE ELO
          </span>
        </div>
      </div>

      {/* Agent rows */}
      <div className="max-w-[900px] mx-auto flex flex-col gap-2">
        {agents.map((agent) => (
          <AgentRow key={agent.rank} agent={agent} />
        ))}
      </div>
    </section>
  );
}
