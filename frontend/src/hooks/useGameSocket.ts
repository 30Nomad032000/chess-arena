import { useEffect, useRef, useState, useCallback } from "react";
import type { GameEvent } from "../types";

interface LastMove {
  from: string;
  to: string;
}

interface UseGameSocketReturn {
  events: GameEvent[];
  currentFen: string;
  isConnected: boolean;
  isGameOver: boolean;
  lastMove: LastMove | null;
  reset: () => void;
}

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function parseUciMove(uci: string): LastMove | null {
  if (!uci || uci.length < 4) return null;
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
  };
}

export function useGameSocket(gameId: string | null): UseGameSocketReturn {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [currentFen, setCurrentFen] = useState<string>(START_FEN);
  const [isConnected, setIsConnected] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const reset = useCallback(() => {
    setEvents([]);
    setCurrentFen(START_FEN);
    setIsConnected(false);
    setIsGameOver(false);
    setLastMove(null);
  }, []);

  useEffect(() => {
    if (!gameId) return;

    reset();

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/game/${gameId}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    ws.onmessage = (msg) => {
      try {
        const event: GameEvent = JSON.parse(msg.data);
        setEvents((prev) => [...prev, event]);

        switch (event.type) {
          case "move": {
            if (event.data.fen) {
              setCurrentFen(event.data.fen);
            }
            if (event.data.move) {
              const parsed = parseUciMove(event.data.move);
              if (parsed) {
                setLastMove(parsed);
              }
            }
            break;
          }
          case "game_end": {
            setIsGameOver(true);
            if (event.data.fen) {
              setCurrentFen(event.data.fen);
            }
            break;
          }
          case "game_start": {
            if (event.data.fen) {
              setCurrentFen(event.data.fen);
            }
            break;
          }
        }
      } catch {
        // ignore malformed messages
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [gameId, reset]);

  return { events, currentFen, isConnected, isGameOver, lastMove, reset };
}
