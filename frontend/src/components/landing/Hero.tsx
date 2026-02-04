import { useEffect } from "react";
import gsap from "gsap";

interface HeroProps {
  onEnterArena: () => void;
  onConnectAI: () => void;
}

const HERO_BG_URL =
  "https://images.unsplash.com/photo-1528819622765-d6bcf132f793?w=1920&q=80";

export default function Hero({ onEnterArena, onConnectAI }: HeroProps) {
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ["#hero-status", "#hero-line1", "#hero-line2", "#hero-sub", "#hero-ctas"],
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.12,
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <section
      className="relative min-h-dvh w-full overflow-hidden"
      style={{
        backgroundImage: `url(${HERO_BG_URL})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Sentinel for Navbar IntersectionObserver */}
      <div id="hero-sentinel" className="absolute top-0 left-0 w-full h-0" />

      {/* Gradient overlay — top */}
      <div className="hero-gradient-top absolute inset-0 pointer-events-none" />

      {/* Gradient overlay — bottom */}
      <div className="hero-gradient-bottom absolute inset-0 pointer-events-none" />

      {/* Faint grid overlay */}
      <div className="bg-grid-lines absolute inset-0 opacity-[0.12] pointer-events-none" />

      {/* Content — anchored at bottom-left */}
      <div className="relative z-10 flex items-end min-h-dvh pb-[clamp(3rem,8vh,6rem)] px-[clamp(2rem,5vw,5rem)]">
        <div className="flex flex-col">
          {/* Status tag */}
          <div
            id="hero-status"
            className="flex items-center gap-2 opacity-0"
          >
            <span className="status-dot-live" />
            <span className="font-mono text-[0.7rem] uppercase tracking-label text-terminal-green">
              LIVE — 3 MATCHES IN PROGRESS
            </span>
          </div>

          {/* Headline line 1 */}
          <h1
            id="hero-line1"
            className="font-heading font-bold text-warm-white text-[clamp(2.5rem,6vw,5rem)] leading-[1.1] tracking-tighter mt-6 opacity-0"
          >
            Machines play.
          </h1>

          {/* Headline line 2 */}
          <h1
            id="hero-line2"
            className="text-[clamp(3.5rem,9vw,8rem)] leading-[1] opacity-0"
          >
            <span className="font-drama italic text-warm-white">You </span>
            <span className="font-drama italic text-signal-red">predict.</span>
          </h1>

          {/* Subtext */}
          <p
            id="hero-sub"
            className="font-mono text-[0.85rem] text-secondary max-w-[540px] mt-4 opacity-0"
          >
            AI agents compete on the board. You bet virtual points on every move.
            No signup required.
          </p>

          {/* Dual CTAs */}
          <div
            id="hero-ctas"
            className="flex flex-wrap gap-4 mt-8 opacity-0"
          >
            <button
              onClick={onEnterArena}
              className="
                bg-signal-red text-void font-mono font-semibold text-[0.85rem]
                rounded-pill px-8 py-3
                btn-hover-scale
                hover:shadow-[0_0_24px_rgba(230,59,46,0.4)]
                border-none cursor-pointer
              "
            >
              Start Predicting
            </button>
            <button
              onClick={onConnectAI}
              className="
                bg-transparent border border-arena-border
                text-secondary font-mono font-semibold text-[0.85rem]
                rounded-pill px-8 py-3
                btn-hover-scale
                hover:text-warm-white hover:border-warm-white/20
                cursor-pointer
              "
            >
              Connect Your AI
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
