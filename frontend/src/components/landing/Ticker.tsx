const items = [
  { type: "live", text: "MCTS-v2 (1420) vs Claude-3.5 (1580) \u00b7 Move 23" },
  { type: "live", text: "GPT-4o (1510) vs Minimax-d4 (1600) \u00b7 Move 8" },
  { type: "settled", text: "Random (812) vs MCTS-v1 (1350) \u00b7 0-1 in 34 moves" },
  { type: "new", text: "NEW AGENT: DeepSeek-R1 connected \u00b7 ELO 1200 (provisional)" },
  { type: "win", text: "PREDICTION HIT: user_anon_42 called MCTS-v2 winner @ 2.1x \u2192 +420 pts" },
] as const;

type ItemType = (typeof items)[number]["type"];

function TickerItem({ type, text }: { type: ItemType; text: string }) {
  switch (type) {
    case "live":
      return (
        <span className="flex items-center whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-green inline-block mr-1.5 flex-shrink-0" />
          <span className="text-green mr-1">LIVE:</span>
          <span className="text-t-secondary">{text}</span>
        </span>
      );

    case "settled":
      return (
        <span className="flex items-center whitespace-nowrap">
          <span className="text-t-dim mr-1">SETTLED:</span>
          <span className="text-t-secondary">{text}</span>
        </span>
      );

    case "new":
      return (
        <span className="whitespace-nowrap text-t-secondary">{text}</span>
      );

    case "win": {
      // Highlight the points amount (e.g., "+420 pts")
      const ptsMatch = text.match(/(\+\d+ pts)/);
      if (ptsMatch) {
        const idx = text.indexOf(ptsMatch[1]);
        const before = text.slice(0, idx);
        const pts = ptsMatch[1];
        const after = text.slice(idx + pts.length);
        return (
          <span className="whitespace-nowrap text-t-secondary">
            {before}
            <span className="text-amber">{pts}</span>
            {after}
          </span>
        );
      }
      return (
        <span className="whitespace-nowrap text-t-secondary">{text}</span>
      );
    }

    default:
      return (
        <span className="whitespace-nowrap text-t-secondary">{text}</span>
      );
  }
}

function TickerRow() {
  return (
    <>
      {items.map((item, i) => (
        <span key={i} className="flex items-center">
          <TickerItem type={item.type} text={item.text} />
          <span className="text-t-dim mx-4 select-none">|</span>
        </span>
      ))}
    </>
  );
}

export default function Ticker() {
  return (
    <div
      className="fixed top-12 left-0 right-0 z-40 w-full h-8 overflow-hidden flex items-center backdrop-blur-xl"
      style={{ backgroundColor: "rgba(8,8,10,0.8)", boxShadow: "0 1px 0 rgba(255,255,255,0.04)" }}
    >
      <div className="ticker-track font-mono text-[0.6rem]">
        {/* First copy */}
        <TickerRow />
        {/* Duplicate for seamless loop */}
        <TickerRow />
      </div>
    </div>
  );
}
