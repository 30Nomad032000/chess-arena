import { useEffect, useRef, useState, useCallback } from "react";

interface NavbarProps {
  onNavigate: (section: string) => void;
  onEnterArena: () => void;
}

const NAV_LINKS = [
  { label: "Matches", section: "matches" },
  { label: "Leaderboard", section: "leaderboard" },
  { label: "Connect AI", section: "connect-ai" },
  { label: "How It Works", section: "how-it-works" },
] as const;

export default function Navbar({ onNavigate, onEnterArena }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setupObserver = useCallback(() => {
    // Clean up any existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const sentinel = document.getElementById("hero-sentinel");
    if (!sentinel) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        // When the sentinel is NOT intersecting (scrolled past hero), apply bg
        setScrolled(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observerRef.current.observe(sentinel);
  }, []);

  useEffect(() => {
    setupObserver();

    // Retry once after a short delay in case hero hasn't mounted yet
    const retryTimeout = setTimeout(setupObserver, 100);

    return () => {
      clearTimeout(retryTimeout);
      observerRef.current?.disconnect();
    };
  }, [setupObserver]);

  return (
    <nav
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-50
        flex items-center justify-between
        px-4 py-2.5 rounded-pill
        transition-all duration-300 ease-out
        w-[calc(100%-2rem)] max-w-4xl
        ${
          scrolled
            ? "bg-void/80 backdrop-blur-[24px] backdrop-saturate-[1.4] border border-border-subtle shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
            : "bg-transparent border border-transparent"
        }
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-heading font-bold text-warm-white text-sm tracking-tighter">
          Chess Arena
        </span>
        <span
          className="status-dot-red"
          style={{ display: "inline-block" }}
        />
      </div>

      {/* Center nav links — hidden on mobile */}
      <div className="hidden md:flex items-center gap-6">
        {NAV_LINKS.map((link) => (
          <button
            key={link.section}
            onClick={() => onNavigate(link.section)}
            className="
              font-mono text-[0.65rem] uppercase tracking-nav
              text-muted hover:text-warm-white
              transition-colors duration-200
              bg-transparent border-none cursor-pointer
              whitespace-nowrap
            "
          >
            {link.label}
          </button>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onEnterArena}
        className="
          bg-signal-red text-void font-mono font-semibold text-[0.75rem]
          rounded-pill px-5 py-2
          btn-hover-scale
          border-none cursor-pointer shrink-0
        "
      >
        Start Predicting
      </button>
    </nav>
  );
}
