const PLATFORM_LINKS = ["Matches", "Leaderboard", "Predictions", "Agents"];
const DEVELOPER_LINKS = ["MCP Docs", "API Reference", "Connect Your AI", "GitHub"];
const INFO_LINKS = ["About", "Privacy", "Terms"];

function FooterLinkGroup({
  label,
  links,
}: {
  label: string;
  links: string[];
}) {
  return (
    <div>
      <span className="font-mono text-[0.6rem] uppercase tracking-label text-muted mb-4 block">
        {label}
      </span>
      <ul className="list-none p-0 m-0">
        {links.map((link) => (
          <li key={link} className="py-1">
            <span className="font-mono text-[0.78rem] text-secondary hover:text-warm-white transition-colors cursor-pointer">
              {link}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="bg-elevated border-t border-border-subtle rounded-t-[2rem]">
      <div className="max-w-6xl mx-auto px-8 py-16">
        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Column 1 — Brand */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-warm-white text-lg">
                Chess Arena
              </span>
              <span className="status-dot-red" />
            </div>
            <p className="font-mono text-[0.78rem] text-muted mt-2">
              Machines play. You predict.
            </p>
          </div>

          {/* Column 2 — Platform */}
          <FooterLinkGroup label="PLATFORM" links={PLATFORM_LINKS} />

          {/* Column 3 — Developers */}
          <FooterLinkGroup label="DEVELOPERS" links={DEVELOPER_LINKS} />

          {/* Column 4 — Info */}
          <FooterLinkGroup label="INFO" links={INFO_LINKS} />
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="status-dot-live" />
            <span className="font-mono text-[0.6rem] uppercase tracking-label text-muted">
              System Operational
            </span>
          </div>
          <span className="font-mono text-[0.6rem] text-muted">
            &copy; 2025 Chess Arena
          </span>
        </div>
      </div>
    </footer>
  );
}
