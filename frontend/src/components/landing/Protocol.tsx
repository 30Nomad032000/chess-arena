import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    number: "01",
    title: "Agents Enter the Arena",
    description:
      "AI players — from random movers to LLM-powered engines — are matched by the system. Every agent has an ELO rating updated after each game.",
  },
  {
    number: "02",
    title: "You Read the Board",
    description:
      "Watch the game unfold move by move over WebSocket. See the position, the ELO gap, the history. Then place your prediction: winner, move count, or next piece.",
  },
  {
    number: "03",
    title: "Odds Settle. Points Move.",
    description:
      "When the game ends or a move confirms your bet, points settle instantly. Climb the prediction leaderboard. No real money. No signup. Just signal.",
  },
] as const;

function RotatingRingSvg() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      className="absolute top-4 right-4 opacity-20"
    >
      <g
        style={{
          transformOrigin: "40px 40px",
          animation: "slow-rotate 20s linear infinite",
        }}
      >
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <circle
            key={angle}
            cx={40 + 25 * Math.cos((angle * Math.PI) / 180)}
            cy={40 + 25 * Math.sin((angle * Math.PI) / 180)}
            r="4"
            fill="#E63B2E"
          />
        ))}
      </g>
    </svg>
  );
}

function ScanGridSvg() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      className="absolute top-4 right-4 opacity-20"
    >
      {[0, 1, 2, 3].flatMap((row) =>
        [0, 1, 2, 3].map((col) => (
          <circle
            key={`${row}-${col}`}
            cx={16 + col * 16}
            cy={16 + row * 16}
            r="2"
            fill="#8A8A96"
          />
        ))
      )}
      <rect
        x="0"
        y="0"
        width="4"
        height="80"
        fill="#E63B2E"
        opacity="0.6"
        style={{ animation: "scan-line 3s linear infinite" }}
      />
    </svg>
  );
}

function EkgSvg() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      className="absolute top-4 right-4 opacity-20"
    >
      <path
        d="M0 40 L15 40 L20 20 L25 55 L30 35 L35 45 L40 40 L55 40 L60 15 L65 60 L70 30 L75 40 L80 40"
        fill="none"
        stroke="#E63B2E"
        strokeWidth="2"
        strokeDasharray="200"
        strokeDashoffset="200"
        style={{ animation: "ekg-draw 2.5s ease-in-out infinite" }}
      />
    </svg>
  );
}

const CARD_SVGS = [RotatingRingSvg, ScanGridSvg, EkgSvg];

export default function Protocol() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".protocol-card",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
            toggleActions: "play none none none",
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="py-24 px-[clamp(1.5rem,4vw,5rem)]"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <span className="font-mono text-[0.6rem] uppercase tracking-label text-muted mb-2 block">
          PROTOCOL
        </span>
        <h2 className="font-heading font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-warm-white tracking-tighter mb-12">
          How It Works
        </h2>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => {
            const SvgComponent = CARD_SVGS[i];
            return (
              <div
                key={step.number}
                className="protocol-card bg-elevated border border-border-subtle rounded-card p-8 card-lift relative overflow-hidden opacity-0"
              >
                <SvgComponent />

                <span className="font-heading text-[2.5rem] font-bold text-signal-red/30 mb-4 block">
                  {step.number}
                </span>
                <h3 className="font-heading font-semibold text-lg text-warm-white mb-3">
                  {step.title}
                </h3>
                <p className="font-mono text-[0.8rem] text-secondary leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
