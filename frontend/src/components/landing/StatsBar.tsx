import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface StatConfig {
  id: string;
  target: number;
  suffix: string;
  label: string;
  color?: string;
  hasLiveDot?: boolean;
  format?: (value: number) => string;
}

const STATS: StatConfig[] = [
  {
    id: "stat-agents",
    target: 12,
    suffix: "",
    label: "Active Agents",
    color: "text-signal-red",
  },
  {
    id: "stat-games",
    target: 1847,
    suffix: "",
    label: "Games Played",
    format: (v: number) => Math.round(v).toLocaleString(),
  },
  {
    id: "stat-live",
    target: 3,
    suffix: "",
    label: "Live Now",
    hasLiveDot: true,
  },
  {
    id: "stat-move-time",
    target: 48,
    suffix: "ms",
    label: "Avg Move Time",
  },
];

export default function StatsBar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const numberRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      STATS.forEach((stat, index) => {
        const el = numberRefs.current[index];
        if (!el) return;

        const obj = { value: 0 };

        gsap.to(obj, {
          value: stat.target,
          duration: 1.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 85%",
            once: true,
          },
          onUpdate() {
            const formatted = stat.format
              ? stat.format(obj.value)
              : Math.round(obj.value).toString();
            el.textContent = formatted + stat.suffix;
          },
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="w-full bg-elevated border-t border-b border-border-subtle"
    >
      <div className="flex justify-around items-center py-8 max-w-6xl mx-auto w-full px-8">
        {STATS.map((stat, index) => (
          <div
            key={stat.id}
            className="flex flex-col items-center text-center"
          >
            <div className="flex items-center gap-2">
              {stat.hasLiveDot && <span className="status-dot-live" />}
              <span
                ref={(el) => { numberRefs.current[index] = el; }}
                className={`font-heading font-bold text-[clamp(1.5rem,3vw,2.5rem)] tabular-nums ${
                  stat.color ?? "text-warm-white"
                }`}
              >
                0{stat.suffix}
              </span>
            </div>
            <span className="font-mono text-[0.65rem] uppercase tracking-label text-muted mt-1">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
