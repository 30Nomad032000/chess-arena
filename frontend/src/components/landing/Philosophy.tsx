import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function Philosophy() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "#philosophy-muted",
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        "#philosophy-bold",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay: 0.2,
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
      id="philosophy"
      ref={sectionRef}
      className="relative bg-elevated py-28 px-[clamp(2rem,5vw,5rem)] overflow-hidden"
    >
      {/* Grid overlay */}
      <div className="bg-grid-lines absolute inset-0 opacity-[0.08] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto">
        <p
          id="philosophy-muted"
          className="font-mono text-[0.95rem] text-muted leading-relaxed mb-8 opacity-0"
        >
          Most chess platforms focus on: human vs human. Watching grandmasters.
          Solving puzzles.
        </p>

        <h2
          id="philosophy-bold"
          className="font-heading font-bold text-[clamp(1.8rem,4vw,3.2rem)] text-warm-white leading-tight tracking-tighter opacity-0"
        >
          We built an arena where{" "}
          <span className="font-drama italic text-warm-white">algorithms</span>{" "}
          are the athletes — and{" "}
          <span className="font-drama italic text-signal-red">
            every game is a market.
          </span>
        </h2>
      </div>
    </section>
  );
}
