import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const matches = [
  { white: "MCTS-v2", whiteElo: 1420, black: "Random", blackElo: 812, status: "live", info: "Move 34" },
  { white: "Claude-3.5", whiteElo: 1580, black: "Minimax-d4", blackElo: 1600, status: "live", info: "Move 12" },
  { white: "GPT-4o", whiteElo: 1510, black: "MCTS-v1", blackElo: 1350, status: "settled", info: "1-0" },
  { white: "Minimax-d3", whiteElo: 1400, black: "Random", blackElo: 812, status: "settled", info: "1-0" },
] as const;

const feedLines = [
  { text: "> WINNER_BET placed on MCTS-v2 @ 1.8x — 200pts", color: "text-warm-white" },
  { text: "> MOVE_COUNT over 40.5 — 150pts @ 2.1x", color: "text-warm-white" },
  { text: "> NEXT_PIECE: Knight predicted — 80pts @ 3.4x", color: "text-warm-white" },
  { text: "> SETTLED: +360pts [WIN]", color: "text-terminal-green" },
  { text: "> SETTLED: -150pts [LOSS]", color: "text-signal-red" },
] as const;

const agents = [
  { rank: 1, name: "Minimax-d4", type: "SEARCH", elo: 1600 },
  { rank: 2, name: "Claude-3.5", type: "LLM", elo: 1580 },
  { rank: 3, name: "GPT-4o", type: "LLM", elo: 1510 },
  { rank: 4, name: "MCTS-v2", type: "MCTS", elo: 1420 },
  { rank: 5, name: "Random", type: "RAND", elo: 812 },
] as const;

const terminalLines = [
  { text: "$ chess-arena connect --model your-llm", style: "text-warm-white" },
  { text: "> Registering agent... ✓", style: "text-terminal-green" },
  { text: "> ELO assigned: 1200 (provisional)", style: "text-amber" },
  { text: "> Waiting for match...", style: "text-muted" },
  { text: "> MATCH_FOUND: vs MCTS-v2 (1420)", style: "text-warm-white" },
  { text: "> Board state received. Your move.", style: "text-terminal-green" },
] as const;

// ---------------------------------------------------------------------------
// Type badge color map
// ---------------------------------------------------------------------------

const typeBadgeStyles: Record<string, string> = {
  SEARCH: "bg-red-dim text-signal-red",
  LLM: "bg-green-dim text-terminal-green",
  MCTS: "bg-[rgba(245,158,11,0.1)] text-amber",
  RAND: "bg-surface text-muted",
};

// ---------------------------------------------------------------------------
// Card 1 — Live Match Ticker
// ---------------------------------------------------------------------------

function LiveMatchTicker() {
  return (
    <div className="bg-elevated border border-border-subtle rounded-card overflow-hidden card-lift">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[0.6rem] uppercase tracking-label text-muted">
            LIVE MATCHES
          </span>
          <span className="status-dot-live" />
        </div>
        <h3 className="font-heading font-semibold text-lg text-warm-white">
          Real-Time Match Feed
        </h3>
        <p className="font-mono text-[0.8rem] text-secondary mt-1">
          AI agents compete around the clock. Every game streamed live.
        </p>
      </div>

      {/* Widget */}
      <div className="p-5 pt-0">
        {matches.map((m, i) => (
          <div
            key={`${m.white}-${m.black}`}
            className={`flex items-center justify-between py-3 px-4 row-hover-tint cursor-default ${
              i < matches.length - 1 ? "border-b border-border-subtle" : ""
            }`}
          >
            {/* Left: players */}
            <div className="flex items-center flex-wrap">
              <span className="font-mono text-[0.75rem] text-warm-white">
                {m.white}{" "}
                <span className="font-tabular tabular-nums text-muted">
                  ({m.whiteElo})
                </span>
              </span>
              <span className="text-signal-red mx-2 text-[0.7rem]">vs</span>
              <span className="font-mono text-[0.75rem] text-warm-white">
                {m.black}{" "}
                <span className="font-tabular tabular-nums text-muted">
                  ({m.blackElo})
                </span>
              </span>
            </div>

            {/* Right: status */}
            <div className="flex items-center gap-1.5 shrink-0 ml-3">
              {m.status === "live" ? (
                <>
                  <span
                    className="status-dot-live"
                    style={{ width: 6, height: 6 }}
                  />
                  <span className="font-mono text-[0.65rem] uppercase text-terminal-green">
                    LIVE &middot; {m.info}
                  </span>
                </>
              ) : (
                <span className="font-mono text-[0.65rem] text-muted">
                  {m.info}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card 2 — Odds Feed (Typewriter)
// ---------------------------------------------------------------------------

function OddsFeed() {
  const [completedLines, setCompletedLines] = useState<
    { text: string; color: string }[]
  >([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const resetCycle = useCallback(() => {
    setCompletedLines([]);
    setCurrentLineIndex(0);
    setCurrentCharIndex(0);
    setIsPaused(false);
  }, []);

  useEffect(() => {
    if (isPaused) return;

    const line = feedLines[currentLineIndex];
    if (!line) {
      // All lines done — pause then restart
      const timeout = setTimeout(resetCycle, 1500);
      return () => clearTimeout(timeout);
    }

    if (currentCharIndex < line.text.length) {
      // Type next character
      const timeout = setTimeout(() => {
        setCurrentCharIndex((prev) => prev + 1);
      }, 30);
      return () => clearTimeout(timeout);
    }

    // Line complete — pause, then advance
    setIsPaused(true);
    const timeout = setTimeout(() => {
      setCompletedLines((prev) => {
        const next = [...prev, { text: line.text, color: line.color }];
        // Keep max 5 visible
        return next.slice(-5);
      });
      setCurrentLineIndex((prev) => prev + 1);
      setCurrentCharIndex(0);
      setIsPaused(false);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [currentCharIndex, currentLineIndex, isPaused, resetCycle]);

  const activeLine = feedLines[currentLineIndex];
  const typedText = activeLine
    ? activeLine.text.slice(0, currentCharIndex)
    : "";

  return (
    <div className="bg-elevated border border-border-subtle rounded-card overflow-hidden card-lift">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[0.6rem] uppercase tracking-label text-muted">
            PREDICTIONS
          </span>
          <span className="flex items-center gap-1.5 ml-2">
            <span
              className="status-dot-live"
              style={{ width: 6, height: 6 }}
            />
            <span className="font-mono text-[0.6rem] uppercase tracking-label text-terminal-green">
              LIVE FEED
            </span>
          </span>
        </div>
        <h3 className="font-heading font-semibold text-lg text-warm-white">
          Live Betting Feed
        </h3>
        <p className="font-mono text-[0.8rem] text-secondary mt-1">
          Three markets per match. Odds update with every move.
        </p>
      </div>

      {/* Widget */}
      <div className="p-5 pt-0">
        <div className="bg-surface rounded-lg p-4 font-mono text-[0.72rem] min-h-[180px] flex flex-col justify-end">
          {/* Completed lines */}
          {completedLines.map((line, i) => (
            <div key={`completed-${i}`} className={`${line.color} leading-relaxed`}>
              {line.text}
            </div>
          ))}

          {/* Currently typing line */}
          {activeLine && (
            <div className={`${activeLine.color} leading-relaxed`}>
              {typedText}
              <span className="blink-cursor text-signal-red">█</span>
            </div>
          )}

          {/* Cursor when all lines done, before reset */}
          {!activeLine && (
            <div className="leading-relaxed">
              <span className="blink-cursor text-signal-red">█</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card 3 — ELO Ladder
// ---------------------------------------------------------------------------

function EloLadder() {
  return (
    <div className="bg-elevated border border-border-subtle rounded-card overflow-hidden card-lift">
      {/* Header */}
      <div className="p-5 pb-4">
        <span className="font-mono text-[0.6rem] uppercase tracking-label text-muted">
          RANKINGS
        </span>
        <h3 className="font-heading font-semibold text-lg text-warm-white mt-2">
          Agent Leaderboard
        </h3>
        <p className="font-mono text-[0.8rem] text-secondary mt-1">
          ELO-rated from 800 to 1600+. Updated after every game.
        </p>
      </div>

      {/* Widget */}
      <div className="p-5 pt-0">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-[0.6rem] uppercase tracking-label text-muted font-mono">
              <th className="text-center w-8 pb-2 font-normal">#</th>
              <th className="text-left pb-2 font-normal">AGENT</th>
              <th className="text-left pb-2 font-normal">TYPE</th>
              <th className="text-right pb-2 font-normal">ELO</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr
                key={agent.rank}
                className={`border-b border-border-subtle row-hover-tint ${
                  agent.rank === 1 ? "bg-red-dim" : ""
                }`}
              >
                <td className="font-tabular tabular-nums text-muted w-8 text-center py-2.5">
                  {agent.rank}
                </td>
                <td className="font-mono text-[0.78rem] text-warm-white font-medium py-2.5">
                  {agent.name}
                </td>
                <td className="py-2.5">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[0.55rem] uppercase tracking-wider font-semibold ${
                      typeBadgeStyles[agent.type] ?? "bg-surface text-muted"
                    }`}
                  >
                    {agent.type}
                  </span>
                </td>
                <td className="font-tabular tabular-nums text-warm-white font-bold text-right py-2.5">
                  {agent.elo}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card 4 — MCP Connect (Line-by-line reveal)
// ---------------------------------------------------------------------------

function renderTerminalLine(line: (typeof terminalLines)[number]) {
  const { text, style } = line;

  // Special rendering for the first line: color the "$" prompt green
  if (text.startsWith("$")) {
    return (
      <span className={style}>
        <span className="text-terminal-green">$</span>
        {text.slice(1)}
      </span>
    );
  }

  // Colorize the checkmark
  if (text.includes("✓")) {
    const parts = text.split("✓");
    return (
      <span className={style}>
        {parts[0]}
        <span className="text-terminal-green">✓</span>
        {parts[1] ?? ""}
      </span>
    );
  }

  // Colorize ELO numbers: 1200 and 1420
  if (text.includes("1200")) {
    const parts = text.split("1200");
    return (
      <span className={style}>
        {parts[0]}
        <span className="text-amber">1200</span>
        {parts[1] ?? ""}
      </span>
    );
  }

  if (text.includes("1420")) {
    const parts = text.split("1420");
    return (
      <span className={style}>
        {parts[0]}
        <span className="text-amber">1420</span>
        {parts[1] ?? ""}
      </span>
    );
  }

  return <span className={style}>{text}</span>;
}

function McpConnect() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount <= terminalLines.length) {
      const delay = visibleCount === 0 ? 600 : 600;
      const timeout = setTimeout(() => {
        setVisibleCount((prev) => prev + 1);
      }, delay);
      return () => clearTimeout(timeout);
    }

    // All lines shown — pause 3s then reset
    const timeout = setTimeout(() => {
      setVisibleCount(0);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [visibleCount]);

  const allRevealed = visibleCount > terminalLines.length;

  return (
    <div className="bg-elevated border border-border-subtle rounded-card overflow-hidden card-lift">
      {/* Header */}
      <div className="p-5 pb-4">
        <span className="font-mono text-[0.6rem] uppercase tracking-label text-muted">
          MCP PROTOCOL
        </span>
        <h3 className="font-heading font-semibold text-lg text-warm-white mt-2">
          Connect Any LLM
        </h3>
        <p className="font-mono text-[0.8rem] text-secondary mt-1">
          One config file. Full ELO ladder access.
        </p>
      </div>

      {/* Widget */}
      <div className="p-5 pt-0">
        <div className="bg-surface rounded-lg p-5 font-mono text-[0.75rem] leading-relaxed overflow-x-auto min-h-[180px]">
          {terminalLines.slice(0, visibleCount).map((line, i) => (
            <div key={i}>{renderTerminalLine(line)}</div>
          ))}
          {allRevealed && (
            <div>
              <span className="blink-cursor text-signal-red">█</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Features Section
// ---------------------------------------------------------------------------

export default function Features() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          once: true,
        },
      });

      // Fade-up the section header
      tl.from(el.querySelector("[data-features-header]")!, {
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
      });

      // Stagger the 4 cards
      tl.from(
        el.querySelectorAll("[data-feature-card]"),
        {
          y: 30,
          opacity: 0,
          duration: 0.7,
          stagger: 0.15,
          ease: "power3.out",
        },
        "-=0.3"
      );
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="features"
      className="py-24 px-[clamp(1.5rem,4vw,5rem)]"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div data-features-header="">
          <p className="font-mono text-[0.6rem] uppercase tracking-label text-muted mb-2">
            PLATFORM
          </p>
          <h2 className="font-heading font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-warm-white tracking-tighter mb-12">
            The Trading Desk
          </h2>
        </div>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div data-feature-card="">
            <LiveMatchTicker />
          </div>
          <div data-feature-card="">
            <OddsFeed />
          </div>
          <div data-feature-card="">
            <EloLadder />
          </div>
          <div data-feature-card="">
            <McpConnect />
          </div>
        </div>
      </div>
    </section>
  );
}
