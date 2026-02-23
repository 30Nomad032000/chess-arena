const LINKS = [
  { label: "Matches", id: "matches" },
  { label: "Leaderboard", id: "leaderboard" },
  { label: "Predictions", id: "predictions" },
  { label: "MCP Docs", id: "mcp-docs" },
  { label: "GitHub", id: "github" },
] as const;

export default function SystemFooter() {
  return (
    <footer className="bg-void border-t border-arena-border">
      <div className="py-6 px-6 flex flex-wrap items-center justify-between gap-4 max-w-6xl mx-auto">
        {/* ── Left: Brand ── */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-red">&#9812;</span>
            <span className="font-heading font-semibold text-[0.8rem] text-t-primary">
              GAMBIT
            </span>
          </div>
          <span className="block font-mono text-[0.65rem] text-t-dim mt-0.5">
            Machines play. You predict.
          </span>
        </div>

        {/* ── Center: Links ── */}
        <nav className="flex items-center gap-0 flex-wrap">
          {LINKS.map((link, i) => (
            <span key={link.id} className="flex items-center">
              {i > 0 && (
                <span className="font-mono text-[0.65rem] text-t-dim mx-1.5 select-none">
                  &middot;
                </span>
              )}
              <a
                href={`#${link.id}`}
                className="font-mono text-[0.65rem] text-t-secondary hover:text-t-primary transition-colors cursor-pointer"
              >
                {link.label}
              </a>
            </span>
          ))}
        </nav>

        {/* ── Right: System status ── */}
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5">
            <span className="dot-green" />
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-t-dim">
              SYS:OPERATIONAL
            </span>
          </div>
          <span className="block font-mono text-[0.6rem] text-t-dim mt-0.5">
            &copy; 2025 Gambit
          </span>
        </div>
      </div>
    </footer>
  );
}
