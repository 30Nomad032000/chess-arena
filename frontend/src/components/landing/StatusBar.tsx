import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";

interface StatusBarProps {
  onNavigate: (section: string) => void;
  onExplore: () => void;
}

const NAV_LINKS = [
  { label: "MATCHES", id: "matches" },
  { label: "LEADERBOARD", id: "leaderboard" },
  { label: "PREDICTIONS", id: "predictions" },
  { label: "DOCS", id: "docs", href: "/docs" },
] as const;

export default function StatusBar({ onNavigate, onExplore }: StatusBarProps) {
  const barRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(barRef.current, {
        y: -48,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <header
      ref={barRef}
      className="fixed top-0 left-0 right-0 z-50 border-b border-arena-border backdrop-blur-xl"
      style={{ backgroundColor: "rgba(14,14,18,0.85)" }}
    >
      <div className="flex items-center justify-between px-3 sm:px-6 h-12">
        {/* Left: Logo */}
        <div className="flex items-center gap-2.5">
          <span className="text-red text-[1.1rem] leading-none">&#9812;</span>
          <span className="font-heading font-semibold text-[0.85rem] text-t-primary tracking-tight">
            GAMBIT
          </span>
          <span className="dot-red" />
        </div>

        {/* Center: Nav Links */}
        <nav className="hidden md:flex items-center gap-0">
          {NAV_LINKS.map((link, i) => (
            <span key={link.id} className="flex items-center">
              {i > 0 && (
                <span className="text-t-dim font-mono text-[0.65rem] mx-2 select-none">
                  &middot;
                </span>
              )}
              {"href" in link && link.href ? (
                <Link
                  to={link.href}
                  className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-t-secondary hover:text-t-primary transition-colors duration-150 no-underline"
                >
                  {link.label}
                </Link>
              ) : (
                <button
                  onClick={() => onNavigate(link.id)}
                  className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-t-secondary hover:text-t-primary transition-colors duration-150 bg-transparent border-none cursor-pointer"
                >
                  {link.label}
                </button>
              )}
            </span>
          ))}
        </nav>

        {/* Right: Points + CTA */}
        <div className="flex items-center">
          <span className="font-mono text-[0.7rem] text-amber bg-amber-glow px-3 py-1 rounded-sm hidden sm:inline-block">
            [1,000 PTS]
          </span>
          <button
            onClick={onExplore}
            className="font-mono text-[0.65rem] uppercase rounded-pill px-4 py-1.5 font-semibold hover:brightness-110 transition-all ml-3 cursor-pointer border-none text-white"
            style={{ backgroundColor: "#E53935" }}
          >
            EXPLORE
          </button>
        </div>
      </div>
    </header>
  );
}
