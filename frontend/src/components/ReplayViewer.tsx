import { useEffect, useState, useCallback, useRef } from "react";
import { Chess } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import type { GameDetail } from "../types";

interface ReplayViewerProps {
  gameId: string;
  onBack: () => void;
}

const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

interface ReplayState {
  fens: string[];
  moves: string[];
  lastMoves: ({ from: string; to: string } | null)[];
  whiteName: string;
  blackName: string;
  result: string | null;
}

function buildReplay(detail: GameDetail): ReplayState {
  const chess = new Chess();
  const fens: string[] = [START_FEN];
  const moves: string[] = [];
  const lastMoves: ({ from: string; to: string } | null)[] = [null];

  if (detail.pgn) {
    chess.loadPgn(detail.pgn);
    const history = chess.history({ verbose: true });
    // Rebuild step-by-step
    const stepChess = new Chess();
    for (const move of history) {
      stepChess.move(move.san);
      fens.push(stepChess.fen());
      moves.push(move.san);
      lastMoves.push({ from: move.from, to: move.to });
    }
  } else {
    // Reconstruct from events
    for (const ev of detail.events) {
      if (ev.type === "move" && ev.data.fen) {
        fens.push(ev.data.fen);
        const san =
          typeof ev.data.san === "string" ? ev.data.san : (ev.data.move ?? "?");
        moves.push(san);
        if (ev.data.move && ev.data.move.length >= 4) {
          lastMoves.push({
            from: ev.data.move.slice(0, 2),
            to: ev.data.move.slice(2, 4),
          });
        } else {
          lastMoves.push(null);
        }
      }
    }
  }

  return {
    fens,
    moves,
    lastMoves,
    whiteName: detail.white_agent_name ?? detail.white_agent,
    blackName: detail.black_agent_name ?? detail.black_agent,
    result: detail.result,
  };
}

const st = {
  container: {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
  } as React.CSSProperties,
  topBar: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  } as React.CSSProperties,
  backButton: {
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: 600,
    fontFamily: "inherit",
    border: "1px solid #2a2a2a",
    borderRadius: "4px",
    cursor: "pointer",
    backgroundColor: "#111111",
    color: "#e8e4dd",
    transition: "background-color 0.15s",
  } as React.CSSProperties,
  title: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#e8e4dd",
  } as React.CSSProperties,
  result: {
    fontSize: "13px",
    color: "#E63B2E",
    fontWeight: 700,
    marginLeft: "auto",
  } as React.CSSProperties,
  mainLayout: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: "20px",
    alignItems: "start",
  } as React.CSSProperties,
  sidebar: {
    backgroundColor: "#111111",
    border: "1px solid #1e1e1e",
    borderRadius: "6px",
    padding: "16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
    maxHeight: "520px",
  } as React.CSSProperties,
  controls: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap" as const,
  } as React.CSSProperties,
  controlBtn: (active?: boolean) =>
    ({
      padding: "8px 14px",
      fontSize: "12px",
      fontWeight: 600,
      fontFamily: "inherit",
      border: "1px solid #2a2a2a",
      borderRadius: "4px",
      cursor: "pointer",
      backgroundColor: active ? "#E63B2E" : "#0a0a0a",
      color: active ? "#ffffff" : "#e8e4dd",
      transition: "background-color 0.15s",
      flex: 1,
      minWidth: "60px",
      textAlign: "center" as const,
    }) as React.CSSProperties,
  moveList: {
    flex: 1,
    overflowY: "auto" as const,
    minHeight: 0,
  } as React.CSSProperties,
  moveRow: (active: boolean, index: number) =>
    ({
      display: "grid",
      gridTemplateColumns: "32px 1fr 1fr",
      gap: "4px",
      padding: "4px 8px",
      fontSize: "12px",
      backgroundColor: active
        ? "#1e1a14"
        : index % 2 === 0
          ? "transparent"
          : "#0d0d0d",
      border: active ? "1px solid #E63B2E" : "1px solid transparent",
      borderRadius: "2px",
      cursor: "pointer",
    }) as React.CSSProperties,
  moveNum: {
    color: "#4a4a4a",
    fontSize: "11px",
    textAlign: "right" as const,
    paddingRight: "6px",
  } as React.CSSProperties,
  moveText: (active: boolean) =>
    ({
      color: active ? "#E63B2E" : "#e8e4dd",
      fontWeight: active ? 700 : 500,
    }) as React.CSSProperties,
  positionLabel: {
    fontSize: "11px",
    color: "#6b6b6b",
    textAlign: "center" as const,
  } as React.CSSProperties,
  loading: {
    color: "#3a3a3a",
    fontSize: "13px",
    textAlign: "center" as const,
    padding: "32px",
  } as React.CSSProperties,
};

export function ReplayViewer({ gameId, onBack }: ReplayViewerProps) {
  const [game, setGame] = useState<GameDetail | null>(null);
  const [replay, setReplay] = useState<ReplayState | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const moveListRef = useRef<HTMLDivElement>(null);

  const fetchGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${gameId}`);
      if (res.ok) {
        const data: GameDetail = await res.json();
        setGame(data);
        const built = buildReplay(data);
        setReplay(built);
        setCurrentIndex(0);
      }
    } catch {
      // silent
    }
  }, [gameId]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  // Auto-play timer
  useEffect(() => {
    if (!autoPlay || !replay) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= replay.fens.length - 1) {
          setAutoPlay(false);
          return prev;
        }
        return prev + 1;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [autoPlay, replay]);

  // Scroll active move into view
  useEffect(() => {
    if (!moveListRef.current) return;
    const active = moveListRef.current.querySelector("[data-active='true']");
    if (active) {
      active.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [currentIndex]);

  if (!game || !replay) {
    return (
      <div>
        <button style={st.backButton} onClick={onBack}>
          Back
        </button>
        <div style={st.loading}>Loading game...</div>
      </div>
    );
  }

  const fen = replay.fens[currentIndex] ?? START_FEN;
  const lastMove = replay.lastMoves[currentIndex] ?? null;
  const totalPositions = replay.fens.length;

  function goFirst() {
    setCurrentIndex(0);
    setAutoPlay(false);
  }
  function goBack() {
    setCurrentIndex((p) => Math.max(0, p - 1));
  }
  function goForward() {
    setCurrentIndex((p) => Math.min(totalPositions - 1, p + 1));
  }
  function goLast() {
    setCurrentIndex(totalPositions - 1);
    setAutoPlay(false);
  }
  function toggleAutoPlay() {
    if (currentIndex >= totalPositions - 1) {
      setCurrentIndex(0);
      setAutoPlay(true);
    } else {
      setAutoPlay((p) => !p);
    }
  }

  // Build move pairs for the move list
  const movePairs: {
    num: number;
    white: { san: string; index: number } | null;
    black: { san: string; index: number } | null;
  }[] = [];
  for (let i = 0; i < replay.moves.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: { san: replay.moves[i], index: i + 1 },
      black:
        i + 1 < replay.moves.length
          ? { san: replay.moves[i + 1], index: i + 2 }
          : null,
    });
  }

  return (
    <div style={st.container}>
      <div style={st.topBar}>
        <button
          style={st.backButton}
          onClick={onBack}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#1a1a1a";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#111111";
          }}
        >
          Back
        </button>
        <span style={st.title}>
          {replay.whiteName} vs {replay.blackName}
        </span>
        {replay.result && <span style={st.result}>{replay.result}</span>}
      </div>

      <div style={st.mainLayout}>
        <div>
          <ChessBoard fen={fen} lastMove={lastMove} width={480} />
        </div>

        <div style={st.sidebar}>
          <div style={st.controls}>
            <button style={st.controlBtn()} onClick={goFirst}>
              |&lt;
            </button>
            <button style={st.controlBtn()} onClick={goBack}>
              &lt;
            </button>
            <button style={st.controlBtn(autoPlay)} onClick={toggleAutoPlay}>
              {autoPlay ? "||" : "Play"}
            </button>
            <button style={st.controlBtn()} onClick={goForward}>
              &gt;
            </button>
            <button style={st.controlBtn()} onClick={goLast}>
              &gt;|
            </button>
          </div>

          <div style={st.positionLabel}>
            Position {currentIndex} / {totalPositions - 1}
          </div>

          <div style={st.moveList} ref={moveListRef}>
            {movePairs.map((pair, i) => {
              const whiteActive = pair.white?.index === currentIndex;
              const blackActive = pair.black?.index === currentIndex;
              return (
                <div
                  key={pair.num}
                  style={st.moveRow(whiteActive || blackActive, i)}
                  data-active={whiteActive || blackActive}
                >
                  <span style={st.moveNum}>{pair.num}.</span>
                  <span
                    style={{
                      ...st.moveText(whiteActive),
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      if (pair.white) setCurrentIndex(pair.white.index);
                    }}
                  >
                    {pair.white?.san ?? ""}
                  </span>
                  <span
                    style={{
                      ...st.moveText(blackActive),
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      if (pair.black) setCurrentIndex(pair.black.index);
                    }}
                  >
                    {pair.black?.san ?? ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
