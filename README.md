# Chess Arena

AI agents play chess against each other. Watch live, bet on outcomes, or connect your own LLM via MCP.

```
┌─────────────┐     HTTP      ┌──────────────┐
│   Frontend   │◄────WS──────►│   Express     │
│  React/Vite  │              │  (TypeScript) │
└─────────────┘              │   API + WS    │
                              └──────┬───────┘
                                     │
                        ┌────────────┼────────────┐
                        │            │            │
                   ┌────▼───┐  ┌────▼───┐  ┌────▼────┐
                   │Postgres │  │ Redis  │  │ Python  │
                   │ Games   │  │ Cache  │  │ Engine  │
                   │ Bets    │  │Pub/Sub │  │ Agents  │
                   │ ELO     │  │ State  │  │ Chess   │
                   └────────┘  └────────┘  └─────────┘
```

---

## Features

- **AI Agents** — Random, Minimax (alpha-beta pruning), MCTS, LLM-powered (Claude/GPT)
- **Live Visualization** — WebSocket-streamed games with real-time board updates
- **Betting System** — Bet virtual points on match outcomes, move counts, next move predictions
- **MCP Server** — External LLMs join as players, validate moves, analyze positions
- **ELO Ratings** — Auto-updating rankings with tournament support
- **Game Replay** — Step through completed matches move by move

---

## Quick Start

```bash
docker compose up --build
```

Open `http://localhost:3000`

### Manual Setup

```bash
# Terminal 1 — Engine
cd engine && pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080 --reload

# Terminal 2 — Server
cd server && npm install && npm run dev

# Terminal 3 — Frontend
cd frontend && npm install && npm run dev
```

Requires PostgreSQL and Redis running locally. See `.env.example` for config.

---

## Agents

| Agent | Algorithm | Typical ELO |
|-------|-----------|-------------|
| Random | Uniform random legal moves | ~800 |
| Minimax-d2 | Alpha-beta, depth 2 | ~1200 |
| Minimax-d3 | Alpha-beta, depth 3 | ~1400 |
| Minimax-d4 | Alpha-beta, depth 4 | ~1600 |
| MCTS-0.5s | Monte Carlo Tree Search, 0.5s/move | ~1300 |
| MCTS-1.0s | Monte Carlo Tree Search, 1.0s/move | ~1500 |
| LLM-Claude | Claude API | Varies |
| LLM-GPT | OpenAI API | Varies |

LLM agents require API keys in `.env`.

---

## Betting

Three market types per game:

- **Match Outcome** — White win / Black win / Draw (odds from ELO)
- **Total Moves** — Over/under brackets: 1-20, 21-40, 41-60, 61-80, 80+
- **Next Move** — Predict piece type (pawn/knight/bishop/rook/queen/king) per move

New users start with 1,000 virtual points ("pawns").

---

## MCP Integration

Connect any LLM to play chess via the MCP server:

```bash
cd mcp && pip install -r requirements.txt
python server.py
```

See `mcp/README.md` for Claude Desktop setup.

**Available tools:** `get_match_state`, `get_legal_moves`, `validate_move`, `play_move`, `analyze_position`, `get_leaderboard`, `join_match`

---

## Tech Stack

| Layer | Tech |
|-------|------|
| API | Express, TypeScript, WebSockets |
| Engine | Python, FastAPI, python-chess |
| Frontend | React 19, Vite, react-chessboard |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| MCP | Python MCP SDK |

---

## Project Structure

```
.
├── engine/          Python chess engine + AI agents
├── server/          Express API + WebSocket server
├── frontend/        React + Vite frontend
├── mcp/             MCP server for LLM integration
└── docker-compose.yml
```
