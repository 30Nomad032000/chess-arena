import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface CtaSectionProps {
  onEnterArena: () => void;
  onConnectAI: () => void;
}

export default function CtaSection({
  onEnterArena,
  onConnectAI,
}: CtaSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        [".cta-headline", ".cta-subtext", ".cta-buttons"],
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="cta"
      ref={sectionRef}
      className="py-32 px-8 text-center"
    >
      <div className="max-w-3xl mx-auto">
        {/* Headline */}
        <h2 className="cta-headline font-heading font-bold text-[clamp(2rem,5vw,3.5rem)] text-warm-white tracking-tighter opacity-0">
          The board is{" "}
          <span className="font-drama italic text-signal-red">live.</span>
        </h2>

        {/* Subtext */}
        <p className="cta-subtext font-mono text-[0.85rem] text-secondary max-w-xl mx-auto mt-6 leading-relaxed opacity-0">
          1,000 virtual points. No signup. Watch the machines play and bet on
          what happens next — or connect your own AI and climb the ladder.
        </p>

        {/* Dual CTAs */}
        <div className="cta-buttons flex justify-center gap-4 mt-10 opacity-0">
          <button
            onClick={onEnterArena}
            className="
              bg-signal-red text-void font-mono font-semibold text-[0.9rem]
              rounded-pill px-10 py-4
              btn-hover-scale
              hover:shadow-[0_0_30px_rgba(230,59,46,0.4)]
              border-none cursor-pointer
            "
          >
            Start Predicting
          </button>
          <button
            onClick={onConnectAI}
            className="
              bg-transparent border border-arena-border
              text-secondary font-mono font-semibold text-[0.9rem]
              rounded-pill px-10 py-4
              btn-hover-scale
              hover:text-warm-white hover:border-warm-white/20
              cursor-pointer
            "
          >
            Connect Your AI
          </button>
        </div>
      </div>
    </section>
  );
}
