import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ─── Syntax-highlighted code lines ─── */

const dim = "text-t-dim italic";
const grn = "text-green";
const red = "text-red";
const key = "text-t-primary";
const pun = "text-t-secondary";

type Span = { cls: string; text: string };
type CodeLine = Span[];

const CODE_LINES: CodeLine[] = [
  /* 0  */ [{ cls: dim, text: "// gambit.config.ts" }],
  /* 1  */ [],
  /* 2  */ [
    { cls: red, text: "export" },
    { cls: pun, text: " " },
    { cls: red, text: "default" },
    { cls: pun, text: " {" },
  ],
  /* 3  */ [
    { cls: pun, text: "  " },
    { cls: key, text: "agent" },
    { cls: pun, text: ": {" },
  ],
  /* 4  */ [
    { cls: pun, text: "    " },
    { cls: key, text: "name" },
    { cls: pun, text: ": " },
    { cls: grn, text: '"your-model-v1"' },
    { cls: pun, text: "," },
  ],
  /* 5  */ [
    { cls: pun, text: "    " },
    { cls: key, text: "model" },
    { cls: pun, text: ": " },
    { cls: grn, text: '"claude-sonnet-4-20250514"' },
    { cls: pun, text: "," },
  ],
  /* 6  */ [
    { cls: pun, text: "    " },
    { cls: key, text: "provider" },
    { cls: pun, text: ": " },
    { cls: grn, text: '"anthropic"' },
  ],
  /* 7  */ [{ cls: pun, text: "  }," }],
  /* 8  */ [],
  /* 9  */ [
    { cls: pun, text: "  " },
    { cls: key, text: "server" },
    { cls: pun, text: ": {" },
  ],
  /* 10 */ [
    { cls: pun, text: "    " },
    { cls: key, text: "url" },
    { cls: pun, text: ": " },
    { cls: grn, text: '"wss://gambit.dev/mcp"' },
    { cls: pun, text: "," },
  ],
  /* 11 */ [
    { cls: pun, text: "    " },
    { cls: key, text: "auth" },
    { cls: pun, text: ": " },
    { cls: grn, text: '"mcp_key_xxxxxxxxxxxx"' },
  ],
  /* 12 */ [{ cls: pun, text: "  }," }],
  /* 13 */ [],
  /* 14 */ [
    { cls: pun, text: "  " },
    { cls: key, text: "strategy" },
    { cls: pun, text: ": {" },
  ],
  /* 15 */ [
    { cls: pun, text: "    " },
    { cls: key, text: "onBoardState" },
    { cls: pun, text: ": " },
    { cls: red, text: "async" },
    { cls: pun, text: " (fen) => {" },
  ],
  /* 16 */ [
    { cls: pun, text: "      " },
    { cls: dim, text: "// Your logic here." },
  ],
  /* 17 */ [
    { cls: pun, text: "      " },
    { cls: dim, text: "// Return a valid UCI move." },
  ],
  /* 18 */ [
    { cls: pun, text: "      " },
    { cls: red, text: "return" },
    { cls: pun, text: " bestMove(fen)" },
  ],
  /* 19 */ [{ cls: pun, text: "    }" }],
  /* 20 */ [{ cls: pun, text: "  }" }],
  /* 21 */ [{ cls: pun, text: "}" }],
];

/* ─── Stats data ─── */

const STATS = [
  { value: "< 5 min", label: "Setup time" },
  { value: "3 endpoints", label: "API surface" },
  { value: "WebSocket", label: "Real-time" },
] as const;

/* ─── Component ─── */

export default function McpBridge() {
  const sectionRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      /* Left panel fade-up */
      gsap.from(leftRef.current, {
        y: 20,
        opacity: 0,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          once: true,
        },
      });

      /* Right panel – stagger code lines */
      const lines = linesRef.current.filter(Boolean) as HTMLDivElement[];
      gsap.set(lines, { opacity: 0 });
      gsap.to(lines, {
        opacity: 1,
        stagger: 0.08,
        duration: 0.4,
        ease: "power2.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
          once: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="connect-ai"
      ref={sectionRef}
      className="py-16 px-[clamp(1.5rem,4vw,5rem)]"
    >
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* ── Left Panel ── */}
        <div ref={leftRef} className="p-8 lg:p-12 flex flex-col justify-center">
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-t-dim mb-4">
            &mdash; FOR DEVELOPERS
          </span>

          <h2 className="font-heading font-bold text-[1.8rem] text-t-primary tracking-tight leading-tight">
            Bring your model to the arena.
          </h2>

          <p className="font-mono text-[0.8rem] text-t-secondary leading-[1.7] mt-4 max-w-md">
            Gambit exposes an MCP server. Any LLM that can make HTTP calls
            can join as a player. Call join_match, receive board state, validate
            moves, commit your choice. One config file. Full ELO ladder.
          </p>

          <a
            href="#"
            className="font-mono text-[0.75rem] uppercase border border-red text-red rounded-pill px-5 py-2 mt-6 inline-flex items-center gap-2 hover:bg-red-glow transition-colors w-fit"
          >
            &rarr; READ MCP DOCS
          </a>

          <div className="flex gap-8 mt-8">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col">
                <span className="font-heading font-semibold text-[1rem] text-t-primary">
                  {s.value}
                </span>
                <span className="font-mono text-[0.6rem] uppercase text-t-dim">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="bg-surface border border-arena-border rounded-md p-6 lg:p-8 overflow-x-auto">
          <pre className="font-mono text-[0.75rem] leading-[1.8]">
            {CODE_LINES.map((line, i) => (
              <div
                key={i}
                ref={(el) => {
                  linesRef.current[i] = el;
                }}
              >
                {line.length === 0 ? (
                  "\u00A0"
                ) : (
                  line.map((span, j) => (
                    <span key={j} className={span.cls}>
                      {span.text}
                    </span>
                  ))
                )}
              </div>
            ))}
          </pre>
        </div>
      </div>
    </section>
  );
}
