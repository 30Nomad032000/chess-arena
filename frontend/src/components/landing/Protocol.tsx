import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ProtocolColumn {
  step: string;
  title: string;
  desc: string;
  visual: React.ReactNode;
}

function AgentsMatchVisual() {
  return (
    <div className="flex items-center mt-5">
      <div
        className="w-3 h-3 bg-red/40 inline-block"
        style={{ animation: "slide-connect 3s ease-in-out infinite" }}
      />
      <span className="w-6 h-[1px] bg-arena-border inline-block mx-1 align-middle" />
      <div
        className="w-3 h-3 bg-green/40 inline-block"
        style={{
          animation: "slide-connect 3s ease-in-out infinite",
          animationDirection: "reverse",
        }}
      />
    </div>
  );
}

function YouPredictVisual() {
  return (
    <div className="w-24 mt-5">
      <div
        className="h-1 rounded-sm bg-red/30"
        style={{ animation: "odds-shift 2.5s ease-in-out infinite" }}
      />
      <div
        className="h-1 rounded-sm mt-2 bg-amber/30"
        style={{ animation: "odds-shift 3s ease-in-out infinite" }}
      />
      <div
        className="h-1 rounded-sm mt-2 bg-green/30"
        style={{ animation: "odds-shift 3.5s ease-in-out infinite" }}
      />
    </div>
  );
}

function PointsSettleVisual() {
  const valueRef = useRef<HTMLSpanElement>(null);
  const counterRef = useRef({ val: 0 });

  useEffect(() => {
    if (!valueRef.current) return;

    const ctx = gsap.context(() => {
      gsap.to(counterRef.current, {
        val: 360,
        duration: 1.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: valueRef.current,
          start: "top 85%",
          once: true,
        },
        onUpdate() {
          if (valueRef.current) {
            valueRef.current.textContent = `+${Math.round(counterRef.current.val)}`;
          }
        },
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <span
      ref={valueRef}
      className="block mt-5 font-heading font-bold text-[1.5rem] text-green tabular-nums"
    >
      +0
    </span>
  );
}

const columns: ProtocolColumn[] = [
  {
    step: "01",
    title: "Agents Match",
    desc: "AI players ranked 800\u20131600 ELO are paired by the system. Random movers, minimax engines, MCTS bots, LLM-powered agents \u2014 all on one ladder.",
    visual: <AgentsMatchVisual />,
  },
  {
    step: "02",
    title: "You Predict",
    desc: "Three bet types on every match. Call the winner pre-game. Predict total moves. Or go move-by-move, guessing the next piece type as odds shift in real-time.",
    visual: <YouPredictVisual />,
  },
  {
    step: "03",
    title: "Points Settle",
    desc: "Outcomes resolve instantly. Your balance updates. No real money, no signup \u2014 just 1,000 virtual points and a prediction leaderboard.",
    visual: <PointsSettleVisual />,
  },
];

export default function Protocol() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from(".protocol-col", {
        y: 20,
        opacity: 0,
        duration: 0.7,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 85%",
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="protocol"
      ref={sectionRef}
      className="bg-panel border-t border-b border-arena-border"
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3">
          {columns.map((col, i) => (
            <div
              key={col.step}
              className={`protocol-col p-8${
                i < columns.length - 1
                  ? " border-b md:border-b-0 md:border-r border-arena-border"
                  : ""
              }`}
            >
              <span className="font-heading font-bold text-[2rem] text-red/20 block leading-none">
                {col.step}
              </span>
              <h3 className="font-heading font-semibold text-[1rem] text-t-primary mt-3">
                {col.title}
              </h3>
              <p className="font-mono text-[0.75rem] text-t-secondary leading-[1.7] mt-3">
                {col.desc}
              </p>
              {col.visual}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
