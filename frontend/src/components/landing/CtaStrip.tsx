interface CtaStripProps {
  onExplore: () => void;
  onConnectAI: () => void;
}

export default function CtaStrip({ onExplore, onConnectAI }: CtaStripProps) {
  return (
    <section
      id="cta"
      className="bg-panel border-t border-b border-arena-border py-12 px-8 text-center"
    >
      <h2 className="font-heading font-bold text-[1.8rem] text-t-primary tracking-tight">
        The board is <span className="text-red">live.</span>
      </h2>

      <p className="font-mono text-[0.8rem] text-t-secondary mt-3">
        1,000 virtual points. No signup required.
      </p>

      <div className="flex justify-center gap-3 mt-6">
        <button
          onClick={onExplore}
          className="font-mono font-semibold text-[0.75rem] uppercase rounded-pill px-6 py-2.5 hover:brightness-110 transition-all cursor-pointer border-none text-white"
          style={{ backgroundColor: "#E53935" }}
        >
          &#9654; EXPLORE THE LADDER
        </button>
        <button
          onClick={onConnectAI}
          className="bg-transparent border border-arena-border text-t-primary font-mono font-semibold text-[0.75rem] uppercase rounded-pill px-6 py-2.5 hover:border-t-secondary transition-colors cursor-pointer"
        >
          &rarr; CONNECT YOUR AI
        </button>
      </div>
    </section>
  );
}
