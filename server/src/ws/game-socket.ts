/**
 * WebSocket handler for live game streaming.
 *
 * Accepts connections on /ws/game/:id, subscribes to the Redis pub/sub
 * channel for that game, and forwards all events (game_start, move,
 * game_end, bet updates) to the connected WebSocket client.
 *
 * On connect, sends the current cached game state so late-joining
 * clients can hydrate immediately.
 *
 * On disconnect, unsubscribes from the Redis channel to clean up.
 */

import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { subscribeGameEvents, getGameState } from "../services/cache.js";

/**
 * Set up the WebSocket server on the given HTTP server.
 * Handles the upgrade request manually to parse the game ID from the URL.
 */
export function setupWebSocket(server: http.Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Handle the HTTP upgrade manually so we can route based on path.
  server.on("upgrade", (request, socket, head) => {
    const url = request.url;

    if (!url) {
      socket.destroy();
      return;
    }

    // Parse game ID from /ws/game/:id
    const match = url.match(/^\/ws\/game\/([a-f0-9-]+)/i);

    if (!match) {
      // Not a recognised WebSocket path -- reject the upgrade.
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }

    const gameId = match[1]!;

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, gameId);
    });
  });

  // Handle new WebSocket connections.
  wss.on(
    "connection",
    (ws: WebSocket, _request: http.IncomingMessage, gameId: string) => {
      console.log(`WS: client connected for game ${gameId}`);

      // 1. Send the current cached game state immediately so the client
      //    can render the board without waiting for the next event.
      getGameState(gameId)
        .then((state) => {
          if (state && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "state_sync",
                game_id: gameId,
                ...state,
              }),
            );
          }
        })
        .catch((err) => {
          console.error(
            `WS: failed to send initial state for game ${gameId}:`,
            err,
          );
        });

      // 2. Subscribe to the Redis channel for this game and forward
      //    every event to the WebSocket client.
      const unsubscribe = subscribeGameEvents(gameId, (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(event));
        }
      });

      // 3. Clean up when the client disconnects.
      ws.on("close", () => {
        console.log(`WS: client disconnected from game ${gameId}`);
        unsubscribe();
      });

      ws.on("error", (err) => {
        console.error(`WS: error on game ${gameId}:`, err);
        unsubscribe();
      });
    },
  );

  console.log("WebSocket server initialised (path: /ws/game/:id)");

  return wss;
}
