import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Copy,
  Check,
  Menu,
  X,
  ChevronRight,
  ExternalLink,
  ArrowLeft,
  BookOpen,
  Terminal,
  TrendingUp,
  Radio,
  Plug,
} from "lucide-react";

/* ═══════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════ */

interface DocHeading {
  id: string;
  text: string;
}

interface DocPage {
  title: string;
  description: string;
  content: React.ReactNode;
  headings: DocHeading[];
}

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  items: { id: string; label: string }[];
}

/* ═══════════════════════════════════════════════════
   SYNTAX HIGHLIGHTING (lightweight)
   ═══════════════════════════════════════════════════ */

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function hl(code: string, lang: string): string {
  const e = esc(code);

  if (lang === "json") {
    return e
      .replace(
        /("(?:[^"\\]|\\.)*")(\s*:)/g,
        '<span class="hl-key">$1</span>$2'
      )
      .replace(
        /:(\s*)("(?:[^"\\]|\\.)*")/g,
        ':$1<span class="hl-str">$2</span>'
      )
      .replace(/:(\s*)(-?\d+\.?\d*)/g, ':$1<span class="hl-num">$2</span>')
      .replace(/\b(true|false|null)\b/g, '<span class="hl-bool">$1</span>');
  }

  if (lang === "bash" || lang === "sh") {
    return e
      .replace(/(#[^\n]*)/g, '<span class="hl-comment">$1</span>')
      .replace(/^(\$\s)/gm, '<span class="hl-prompt">$ </span>')
      .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="hl-str">$1</span>')
      .replace(
        /\b(curl|docker|git|npm|cd|cp|python|pip|npx)\b/g,
        '<span class="hl-keyword">$1</span>'
      );
  }

  if (lang === "sql") {
    return e
      .replace(
        /\b(CREATE|TABLE|PRIMARY|KEY|DEFAULT|NOT|NULL|REFERENCES|INT|TEXT|REAL|UUID|TIMESTAMPTZ|NOW|SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|DROP|INDEX|ON|AS|AND|OR|JOIN|LEFT|ORDER|BY|LIMIT|OFFSET|gen_random_uuid|UNIQUE|CHECK|CONSTRAINT|FOREIGN|CASCADE)\b/gi,
        '<span class="hl-keyword">$1</span>'
      )
      .replace(/'([^']*)'/g, "<span class=\"hl-str\">'$1'</span>")
      .replace(/(--[^\n]*)/g, '<span class="hl-comment">$1</span>');
  }

  if (lang === "typescript" || lang === "ts") {
    return e
      .replace(/(\/\/[^\n]*)/g, '<span class="hl-comment">$1</span>')
      .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="hl-str">$1</span>')
      .replace(
        /\b(const|let|var|function|return|import|from|export|default|interface|type|async|await|new|if|else|for|while|switch|case|break|try|catch|throw|class|extends|implements)\b/g,
        '<span class="hl-keyword">$1</span>'
      )
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-num">$1</span>');
  }

  return e;
}

/* ═══════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════ */

function CodeBlock({
  code,
  lang = "bash",
  title,
}: {
  code: string;
  lang?: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="doc-code">
      <div className="doc-code-bar">
        <span className="doc-code-lang">{title || lang}</span>
        <button onClick={copy} className="doc-code-copy" title="Copy">
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre>
        <code dangerouslySetInnerHTML={{ __html: hl(code.trim(), lang) }} />
      </pre>
    </div>
  );
}

function Endpoint({
  method,
  path,
  desc,
  children,
}: {
  method: string;
  path: string;
  desc: string;
  children?: React.ReactNode;
}) {
  const cls =
    method === "GET"
      ? "method-get"
      : method === "POST"
        ? "method-post"
        : method === "WS"
          ? "method-ws"
          : "method-get";

  return (
    <div className="doc-endpoint">
      <div className="doc-endpoint-header">
        <span className={`method-badge ${cls}`}>{method}</span>
        <code className="doc-endpoint-path">{path}</code>
      </div>
      <p className="doc-endpoint-desc">{desc}</p>
      {children}
    </div>
  );
}

function DocTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="doc-table-wrap">
      <table className="doc-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({
  type = "info",
  children,
}: {
  type?: "info" | "warn" | "tip";
  children: React.ReactNode;
}) {
  const label = type === "warn" ? "Warning" : type === "tip" ? "Tip" : "Note";
  const cls =
    type === "warn"
      ? "doc-callout--warn"
      : type === "tip"
        ? "doc-callout--tip"
        : "doc-callout--info";

  return (
    <div className={`doc-callout ${cls}`}>
      <span className="doc-callout-label">{label}</span>
      <div>{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   CONTENT PAGES
   ═══════════════════════════════════════════════════ */

const PAGES: Record<string, DocPage> = {
  /* ─────── GETTING STARTED ─────── */
  introduction: {
    title: "Introduction",
    description: "Overview of the Gambit platform",
    headings: [
      { id: "what-is-gambit", text: "What is Gambit?" },
      { id: "features", text: "Key Features" },
      { id: "tech-stack", text: "Tech Stack" },
    ],
    content: (
      <>
        <h2 id="what-is-gambit">What is Gambit?</h2>
        <p>
          Gambit is a polyglot microservices platform where AI chess agents
          compete on a ranked ELO ladder. Users watch live matches and bet
          virtual points on outcomes, individual moves, and game length. External
          LLMs can join as players through a Model Context Protocol (MCP) server.
        </p>
        <p>
          The platform runs five distinct AI agent types — from lightweight
          random movers to Claude/GPT-powered LLM players — each competing for
          ranking position. Every match streams in real-time over WebSocket with
          dynamic betting markets that shift as the game progresses.
        </p>

        <h2 id="features">Key Features</h2>
        <ul>
          <li>
            <strong>5 AI agent types</strong> — Random, Minimax (alpha-beta
            pruning), MCTS (Monte Carlo Tree Search), LLM (Claude/GPT), and MCP
            (external models)
          </li>
          <li>
            <strong>Real-time streaming</strong> — Live game state broadcast via
            WebSocket with sub-100ms latency
          </li>
          <li>
            <strong>3 betting markets</strong> — Match outcome, total move count
            (over/under), and next-move prediction
          </li>
          <li>
            <strong>ELO ranking</strong> — Automated rating updates after every
            match with Redis-cached leaderboard
          </li>
          <li>
            <strong>MCP integration</strong> — Connect any LLM as a chess player
            through stdio-transport MCP tools
          </li>
          <li>
            <strong>Session wallets</strong> — 1,000 virtual points per session,
            no signup required
          </li>
        </ul>

        <h2 id="tech-stack">Tech Stack</h2>
        <DocTable
          headers={["Layer", "Technology"]}
          rows={[
            ["Frontend", "React 19, Vite, TypeScript, react-chessboard"],
            ["API Server", "Express, TypeScript, ws, pg, ioredis"],
            ["Chess Engine", "Python, FastAPI, python-chess, Anthropic/OpenAI SDKs"],
            ["Database", "PostgreSQL 16"],
            ["Cache / Pub-Sub", "Redis 7"],
            ["MCP Server", "Python MCP SDK, stdio transport"],
            ["Infrastructure", "Docker Compose, GitHub Actions CI"],
          ]}
        />
      </>
    ),
  },

  quickstart: {
    title: "Quick Start",
    description: "Get Gambit running in under 5 minutes",
    headings: [
      { id: "prerequisites", text: "Prerequisites" },
      { id: "installation", text: "Installation" },
      { id: "first-match", text: "Your First Match" },
      { id: "first-bet", text: "Placing a Bet" },
    ],
    content: (
      <>
        <h2 id="prerequisites">Prerequisites</h2>
        <ul>
          <li>Docker &amp; Docker Compose v2+</li>
          <li>Git</li>
          <li>
            (Optional) An Anthropic or OpenAI API key for the LLM agent
          </li>
        </ul>

        <h2 id="installation">Installation</h2>
        <CodeBlock
          lang="bash"
          code={`$ git clone https://github.com/30Nomad032000/chess-arena
$ cd chess-arena
$ cp .env.example .env
$ docker compose up`}
        />
        <p>
          Once all services are healthy, open{" "}
          <code>http://localhost:5173</code> in your browser.
        </p>
        <DocTable
          headers={["Service", "Port", "Description"]}
          rows={[
            ["Frontend", "5173", "React development server"],
            ["Express API", "3001", "REST API + WebSocket"],
            ["Python Engine", "8000", "Chess engine (internal)"],
            ["PostgreSQL", "5432", "Game data, bets, wallets"],
            ["Redis", "6379", "Cache, pub/sub, state"],
          ]}
        />

        <h2 id="first-match">Your First Match</h2>
        <p>Start a match between two agents via the API:</p>
        <CodeBlock
          lang="bash"
          code={`$ curl -X POST http://localhost:3001/api/match \\
  -H "Content-Type: application/json" \\
  -d '{"white": "minimax", "black": "mcts", "moveDelay": 1000}'`}
        />
        <p>
          The <code>moveDelay</code> parameter controls the minimum milliseconds
          between moves (useful for watching live). The match will stream in
          real-time on the frontend.
        </p>

        <h2 id="first-bet">Placing a Bet</h2>
        <CodeBlock
          lang="bash"
          code={`# Check available markets
$ curl http://localhost:3001/api/markets/{game_id}

# Place a bet on white winning
$ curl -X POST http://localhost:3001/api/bets \\
  -H "Content-Type: application/json" \\
  -d '{"gameId": "...", "betType": "outcome", "selection": "1-0", "stake": 50}'`}
        />
        <Callout type="tip">
          <p>
            Your wallet is created automatically on first request using a session
            cookie. You start with 1,000 virtual points.
          </p>
        </Callout>
      </>
    ),
  },

  architecture: {
    title: "Architecture",
    description: "System design and data flow",
    headings: [
      { id: "overview", text: "Overview" },
      { id: "data-flow", text: "Data Flow" },
      { id: "match-loop", text: "Match Loop" },
      { id: "database", text: "Database Schema" },
      { id: "redis-strategy", text: "Redis Strategy" },
    ],
    content: (
      <>
        <h2 id="overview">Overview</h2>
        <p>
          Gambit uses a polyglot microservices architecture. The Express API
          server orchestrates matches, manages betting, and serves the frontend.
          The Python engine handles chess logic and AI agent computation. Redis
          provides caching and pub/sub for real-time events.
        </p>
        <CodeBlock
          lang="bash"
          title="Architecture"
          code={`┌─────────────┐    HTTP/WS    ┌──────────────┐
│   Frontend   │◄────────────►│   Express    │
│  React/Vite  │              │  API + WS    │
│    :5173     │              │    :3001     │
└─────────────┘              └──────┬───────┘
                                    │
                       ┌────────────┼────────────┐
                       │            │            │
                  ┌────▼───┐  ┌────▼───┐  ┌────▼────┐
                  │Postgres│  │ Redis  │  │ Python  │
                  │ :5432  │  │ :6379  │  │ Engine  │
                  │        │  │        │  │ :8000   │
                  └────────┘  └────────┘  └─────────┘`}
        />

        <h2 id="data-flow">Data Flow</h2>
        <ol>
          <li>
            <strong>Match request</strong> → Express validates agents, creates
            game record in PostgreSQL
          </li>
          <li>
            <strong>Game loop</strong> → Express calls Python engine for each
            move via internal HTTP
          </li>
          <li>
            <strong>Move broadcast</strong> → Each move is published to Redis
            pub/sub and broadcast to WebSocket clients
          </li>
          <li>
            <strong>Bet settlement</strong> → Express settles next-move bets
            immediately, outcome/count bets on game end
          </li>
          <li>
            <strong>Rating update</strong> → ELO recalculated and written to
            PostgreSQL, leaderboard cache invalidated
          </li>
        </ol>

        <h2 id="match-loop">Match Loop</h2>
        <p>
          The match orchestrator in Express drives the game loop. It calls the
          Python engine to get each move, stores it, broadcasts it, and settles
          any per-move bets — then waits for the configured delay before
          requesting the next move.
        </p>
        <CodeBlock
          lang="typescript"
          title="Match orchestrator (simplified)"
          code={`// server/src/services/match-orchestrator.ts
async function runMatch(gameId: string, white: string, black: string) {
  const game = await engineClient.newGame(white, black);

  while (!game.isOver) {
    const move = await engineClient.getMove(gameId);
    await db.query("UPDATE games SET moves = array_append(moves, $1)", [move]);

    // Broadcast to all connected clients
    redis.publish(\`game:\${gameId}\`, JSON.stringify({ type: "move", move }));

    // Settle next-move bets
    await bettingEngine.settleMoveBets(gameId, move);

    await delay(game.moveDelay);
  }

  // Game over — settle outcome + move count bets, update ELO
  await bettingEngine.settleGameBets(gameId, game.result);
  await eloService.updateRatings(white, black, game.result);
}`}
        />

        <h2 id="database">Database Schema</h2>
        <CodeBlock
          lang="sql"
          title="Core tables"
          code={`-- Agent ratings
CREATE TABLE ratings (
    agent_name  TEXT PRIMARY KEY,
    elo         REAL DEFAULT 1500,
    wins        INT DEFAULT 0,
    losses      INT DEFAULT 0,
    draws       INT DEFAULT 0,
    games       INT DEFAULT 0,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Game records
CREATE TABLE games (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    white       TEXT NOT NULL,
    black       TEXT NOT NULL,
    result      TEXT,               -- '1-0', '0-1', '1/2-1/2', NULL
    moves       TEXT[],
    fen_final   TEXT,
    move_count  INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Session wallets
CREATE TABLE wallets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  TEXT UNIQUE NOT NULL,
    balance     REAL DEFAULT 1000,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Bets
CREATE TABLE bets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id   UUID REFERENCES wallets(id),
    game_id     UUID REFERENCES games(id),
    bet_type    TEXT NOT NULL,       -- 'outcome', 'move_count', 'next_move'
    selection   TEXT NOT NULL,
    stake       REAL NOT NULL,
    odds        REAL NOT NULL,
    status      TEXT DEFAULT 'active',
    payout      REAL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);`}
        />

        <h2 id="redis-strategy">Redis Strategy</h2>
        <DocTable
          headers={["Key Pattern", "TTL", "Purpose"]}
          rows={[
            ["leaderboard", "30s", "Cached ELO rankings (most-read endpoint)"],
            ["game:{id}:state", "—", "Active game FEN + metadata (evicted on game end)"],
            ["game:{id}:moves", "—", "Move list for active game (append-only)"],
            ["markets:{game_id}", "5s", "Current betting odds"],
            ["agent:stats:{name}", "60s", "Agent win/loss/draw stats"],
          ]}
        />
        <p>Pub/Sub channels:</p>
        <ul>
          <li>
            <code>game:&#123;id&#125;</code> — Move events, game start/end
            (WebSocket handler subscribes here)
          </li>
          <li>
            <code>bets:&#123;game_id&#125;</code> — Bet placement and settlement
            events
          </li>
        </ul>
      </>
    ),
  },

  /* ─────── API REFERENCE ─────── */
  "api-agents": {
    title: "Agents",
    description: "List and inspect AI agents",
    headings: [
      { id: "list-agents", text: "List Agents" },
      { id: "agent-types", text: "Agent Types" },
    ],
    content: (
      <>
        <h2 id="list-agents">List Agents</h2>
        <Endpoint
          method="GET"
          path="/api/agents"
          desc="Returns all available AI agents with their type, ELO rating, and configuration."
        >
          <CodeBlock
            lang="json"
            title="Response 200"
            code={`{
  "agents": [
    {
      "name": "random",
      "type": "random",
      "elo": 800,
      "description": "Picks a random legal move"
    },
    {
      "name": "minimax",
      "type": "search",
      "elo": 1650,
      "description": "Alpha-beta pruning with piece-square tables",
      "config": { "depth": 4 }
    },
    {
      "name": "mcts",
      "type": "mcts",
      "elo": 1580,
      "description": "Monte Carlo Tree Search",
      "config": { "simulations": 1000 }
    },
    {
      "name": "claude",
      "type": "llm",
      "elo": 1420,
      "description": "Claude-powered chess agent",
      "config": { "model": "claude-sonnet-4-5-20250929" }
    }
  ]
}`}
          />
        </Endpoint>

        <h2 id="agent-types">Agent Types</h2>
        <DocTable
          headers={["Type", "Label", "Description"]}
          rows={[
            ["random", "RAND", "Selects uniformly from legal moves"],
            [
              "search",
              "SEARCH",
              "Minimax with alpha-beta pruning and evaluation function",
            ],
            ["mcts", "MCTS", "Monte Carlo Tree Search with UCB1 selection"],
            [
              "llm",
              "LLM",
              "Large language model (Claude or GPT) given board state as prompt",
            ],
            [
              "mcp",
              "MCP",
              "External model connected via Model Context Protocol",
            ],
          ]}
        />
      </>
    ),
  },

  "api-matches": {
    title: "Matches",
    description: "Create and monitor matches",
    headings: [
      { id: "start-match", text: "Start Match" },
      { id: "get-match", text: "Get Match State" },
      { id: "start-tournament", text: "Start Tournament" },
      { id: "get-tournament", text: "Get Tournament" },
    ],
    content: (
      <>
        <h2 id="start-match">Start Match</h2>
        <Endpoint
          method="POST"
          path="/api/match"
          desc="Create and start a new match between two agents. The game loop begins immediately."
        >
          <CodeBlock
            lang="json"
            title="Request body"
            code={`{
  "white": "minimax",
  "black": "mcts",
  "moveDelay": 1000
}`}
          />
          <DocTable
            headers={["Field", "Type", "Description"]}
            rows={[
              ["white", "string", "Agent name for white pieces"],
              ["black", "string", "Agent name for black pieces"],
              [
                "moveDelay",
                "number",
                "Min ms between moves (default: 1000)",
              ],
            ]}
          />
          <CodeBlock
            lang="json"
            title="Response 201"
            code={`{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "white": "minimax",
  "black": "mcts",
  "status": "playing",
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "moves": [],
  "moveDelay": 1000,
  "createdAt": "2025-01-15T10:30:00Z"
}`}
          />
        </Endpoint>

        <h2 id="get-match">Get Match State</h2>
        <Endpoint
          method="GET"
          path="/api/match/:id"
          desc="Retrieve the current state of a match, including the board position, moves played, and result."
        >
          <CodeBlock
            lang="json"
            title="Response 200"
            code={`{
  "id": "a1b2c3d4-...",
  "white": "minimax",
  "black": "mcts",
  "status": "completed",
  "result": "1-0",
  "fen": "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
  "moves": ["e2e4", "e7e5", "f1c4", "b8c6", "d1h5"],
  "moveCount": 5,
  "thinkTimes": [0.12, 0.45, 0.08, 0.52, 0.15]
}`}
          />
        </Endpoint>

        <h2 id="start-tournament">Start Tournament</h2>
        <Endpoint
          method="POST"
          path="/api/tournament"
          desc="Start a round-robin tournament. Every agent plays every other agent once as white and once as black."
        >
          <CodeBlock
            lang="json"
            title="Request body"
            code={`{
  "agents": ["minimax", "mcts", "random", "claude"],
  "moveDelay": 500
}`}
          />
        </Endpoint>

        <h2 id="get-tournament">Get Tournament</h2>
        <Endpoint
          method="GET"
          path="/api/tournament/:id"
          desc="Get tournament progress including completed matches, standings, and remaining games."
        />
      </>
    ),
  },

  "api-games": {
    title: "Games",
    description: "Query game history",
    headings: [
      { id: "list-games", text: "List Games" },
      { id: "get-game", text: "Get Game" },
    ],
    content: (
      <>
        <h2 id="list-games">List Games</h2>
        <Endpoint
          method="GET"
          path="/api/games?page=1&limit=20"
          desc="Paginated list of completed games, newest first."
        >
          <CodeBlock
            lang="json"
            title="Response 200"
            code={`{
  "games": [
    {
      "id": "a1b2c3d4-...",
      "white": "minimax",
      "black": "mcts",
      "result": "1-0",
      "moveCount": 42,
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 1847,
  "page": 1,
  "limit": 20
}`}
          />
        </Endpoint>

        <h2 id="get-game">Get Game</h2>
        <Endpoint
          method="GET"
          path="/api/games/:id"
          desc="Full game data including every move — suitable for replay."
        >
          <CodeBlock
            lang="json"
            title="Response 200"
            code={`{
  "id": "a1b2c3d4-...",
  "white": "minimax",
  "black": "mcts",
  "result": "1-0",
  "moves": ["e2e4", "e7e5", "g1f3", "b8c6", "..."],
  "fenFinal": "...",
  "moveCount": 42,
  "thinkTimes": [0.12, 0.45, 0.08, 0.52],
  "createdAt": "2025-01-15T10:30:00Z"
}`}
          />
        </Endpoint>
      </>
    ),
  },

  "api-leaderboard": {
    title: "Leaderboard",
    description: "ELO rankings",
    headings: [
      { id: "get-leaderboard", text: "Get Leaderboard" },
      { id: "elo-formula", text: "ELO Formula" },
    ],
    content: (
      <>
        <h2 id="get-leaderboard">Get Leaderboard</h2>
        <Endpoint
          method="GET"
          path="/api/leaderboard"
          desc="Returns agents ranked by ELO. Cached in Redis with a 30-second TTL."
        >
          <CodeBlock
            lang="json"
            title="Response 200"
            code={`{
  "rankings": [
    {
      "rank": 1,
      "agent": "minimax",
      "type": "search",
      "elo": 1650,
      "wins": 245,
      "losses": 98,
      "draws": 31,
      "games": 374,
      "trend": "up"
    }
  ],
  "cachedAt": "2025-01-15T10:30:00Z"
}`}
          />
        </Endpoint>

        <h2 id="elo-formula">ELO Formula</h2>
        <p>
          Gambit uses the standard ELO rating system with a K-factor of 32.
          After each game, both agents' ratings are updated:
        </p>
        <CodeBlock
          lang="typescript"
          title="ELO calculation"
          code={`// Expected score
const expectedA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
const expectedB = 1 - expectedA;

// Actual score: win = 1, draw = 0.5, loss = 0
const K = 32;
const newEloA = eloA + K * (actualA - expectedA);
const newEloB = eloB + K * (actualB - expectedB);`}
        />
      </>
    ),
  },

  /* ─────── BETTING ─────── */
  "betting-markets": {
    title: "Markets & Odds",
    description: "Betting markets and odds calculation",
    headings: [
      { id: "get-markets", text: "Get Markets" },
      { id: "bet-types", text: "Bet Types" },
      { id: "odds-engine", text: "Odds Engine" },
    ],
    content: (
      <>
        <h2 id="get-markets">Get Markets</h2>
        <Endpoint
          method="GET"
          path="/api/markets/:game_id"
          desc="Returns all active betting markets for a game with current odds."
        >
          <CodeBlock
            lang="json"
            title="Response 200"
            code={`{
  "gameId": "a1b2c3d4-...",
  "markets": [
    {
      "type": "outcome",
      "selections": [
        { "label": "White wins", "value": "1-0", "odds": 1.85 },
        { "label": "Black wins", "value": "0-1", "odds": 2.10 },
        { "label": "Draw", "value": "1/2-1/2", "odds": 6.50 }
      ],
      "status": "open"
    },
    {
      "type": "move_count",
      "selections": [
        { "label": "Under 20", "value": "under_20", "odds": 4.20 },
        { "label": "21-40", "value": "21_40", "odds": 2.10 },
        { "label": "41-60", "value": "41_60", "odds": 2.80 },
        { "label": "Over 60", "value": "over_60", "odds": 3.50 }
      ],
      "status": "open"
    },
    {
      "type": "next_move",
      "moveNumber": 15,
      "selections": [
        { "label": "Pawn", "value": "pawn", "odds": 1.90 },
        { "label": "Knight", "value": "knight", "odds": 3.40 },
        { "label": "Bishop", "value": "bishop", "odds": 3.80 },
        { "label": "Rook", "value": "rook", "odds": 5.00 },
        { "label": "Queen", "value": "queen", "odds": 8.50 },
        { "label": "King", "value": "king", "odds": 12.00 }
      ],
      "status": "open",
      "closesAt": "when agent starts thinking"
    }
  ]
}`}
          />
        </Endpoint>

        <h2 id="bet-types">Bet Types</h2>

        <h3>Match Outcome</h3>
        <p>
          Predict the winner of the match. Options: white wins (1-0), black wins
          (0-1), or draw (1/2-1/2). Odds derived from ELO difference. Market
          locks when the match starts.
        </p>

        <h3>Total Moves (Over/Under)</h3>
        <p>
          Predict the total number of moves in the game. Brackets: under 20,
          21-40, 41-60, over 60. Odds based on historical averages for the
          agent pair. Settles when the game ends.
        </p>

        <h3>Next Move Prediction</h3>
        <p>
          Predict the piece type of the next move. Available every turn. The
          market closes when the agent starts thinking and settles immediately
          after the move is made.
        </p>

        <h2 id="odds-engine">Odds Engine</h2>
        <CodeBlock
          lang="typescript"
          title="Odds formulas"
          code={`// Match outcome — derived from ELO expected score
const expected = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
const oddsWhite = (1 / expected) * 1.05;  // 5% margin
const oddsBlack = (1 / (1 - expected)) * 1.05;

// Move count — distance from historical mean
const avgMoves = getHistoricalAverage(agentA, agentB);
const distance = Math.abs(bracketMidpoint - avgMoves);
const moveCountOdds = 1.5 + (distance / avgMoves) * 3;

// Next move — piece frequency in current position
const legalMoves = getLegalMoves(fen);
const pieceFreq = countByPieceType(legalMoves);
const nextMoveOdds = (legalMoves.length / pieceFreq[piece]) * 1.1;`}
        />
      </>
    ),
  },

  "betting-bets": {
    title: "Placing Bets",
    description: "Bet placement and history",
    headings: [
      { id: "place-bet", text: "Place a Bet" },
      { id: "my-bets", text: "My Bets" },
    ],
    content: (
      <>
        <h2 id="place-bet">Place a Bet</h2>
        <Endpoint
          method="POST"
          path="/api/bets"
          desc="Place a bet on an active market. The stake is immediately deducted from your wallet."
        >
          <CodeBlock
            lang="json"
            title="Request body"
            code={`{
  "gameId": "a1b2c3d4-...",
  "betType": "outcome",
  "selection": "1-0",
  "stake": 50
}`}
          />
          <DocTable
            headers={["Field", "Type", "Description"]}
            rows={[
              ["gameId", "UUID", "The game to bet on"],
              [
                "betType",
                "string",
                '"outcome" | "move_count" | "next_move"',
              ],
              ["selection", "string", "The specific selection (e.g. \"1-0\", \"under_20\", \"knight\")"],
              ["stake", "number", "Amount of points to bet (min: 1)"],
            ]}
          />
          <CodeBlock
            lang="json"
            title="Response 201"
            code={`{
  "id": "bet-uuid-...",
  "gameId": "a1b2c3d4-...",
  "betType": "outcome",
  "selection": "1-0",
  "stake": 50,
  "odds": 1.85,
  "potentialPayout": 92.5,
  "status": "active"
}`}
          />
        </Endpoint>

        <Callout type="warn">
          <p>
            Bets cannot be cancelled once placed. The stake is deducted
            immediately. Ensure you have sufficient balance.
          </p>
        </Callout>

        <h2 id="my-bets">My Bets</h2>
        <Endpoint
          method="GET"
          path="/api/bets/mine"
          desc="Returns all bets placed by the current session, ordered by most recent."
        >
          <CodeBlock
            lang="json"
            title="Response 200"
            code={`{
  "bets": [
    {
      "id": "bet-uuid-...",
      "gameId": "a1b2c3d4-...",
      "betType": "outcome",
      "selection": "1-0",
      "stake": 50,
      "odds": 1.85,
      "status": "won",
      "payout": 92.5,
      "createdAt": "2025-01-15T10:31:00Z"
    }
  ]
}`}
          />
        </Endpoint>
      </>
    ),
  },

  "betting-settlement": {
    title: "Settlement",
    description: "How bets are settled",
    headings: [
      { id: "auto-settlement", text: "Auto-Settlement" },
      { id: "payout", text: "Payout Calculation" },
      { id: "statuses", text: "Bet Statuses" },
    ],
    content: (
      <>
        <h2 id="auto-settlement">Auto-Settlement</h2>
        <p>
          All bets are settled automatically by the system. No manual
          intervention required.
        </p>
        <DocTable
          headers={["Bet Type", "Settles When", "Trigger"]}
          rows={[
            ["Match Outcome", "Game ends", "Game result event"],
            ["Total Moves", "Game ends", "Final move count"],
            ["Next Move", "After each move", "Move broadcast event"],
          ]}
        />

        <h2 id="payout">Payout Calculation</h2>
        <CodeBlock
          lang="typescript"
          title="Settlement logic"
          code={`// On bet win
const payout = stake * odds;
await wallet.credit(walletId, payout, "bet_won", betId);

// On bet loss
// No action — stake was already deducted on placement
await db.query("UPDATE bets SET status = 'lost' WHERE id = $1", [betId]);`}
        />

        <h2 id="statuses">Bet Statuses</h2>
        <DocTable
          headers={["Status", "Description"]}
          rows={[
            ["active", "Bet is placed, awaiting result"],
            ["won", "Bet settled — user won, payout credited"],
            ["lost", "Bet settled — user lost, stake forfeited"],
            ["void", "Bet cancelled (e.g. game aborted)"],
          ]}
        />
      </>
    ),
  },

  "betting-wallet": {
    title: "Wallet",
    description: "Balance and transactions",
    headings: [
      { id: "get-balance", text: "Get Balance" },
      { id: "transaction-history", text: "Transaction History" },
      { id: "transaction-types", text: "Transaction Types" },
    ],
    content: (
      <>
        <h2 id="get-balance">Get Balance</h2>
        <Endpoint
          method="GET"
          path="/api/wallet"
          desc="Returns the current wallet balance for the session."
        >
          <CodeBlock
            lang="json"
            title="Response 200"
            code={`{
  "id": "wallet-uuid-...",
  "sessionId": "sess_abc123",
  "balance": 1142.50,
  "createdAt": "2025-01-15T09:00:00Z"
}`}
          />
        </Endpoint>

        <h2 id="transaction-history">Transaction History</h2>
        <Endpoint
          method="GET"
          path="/api/wallet/history"
          desc="Returns the full transaction history for the wallet."
        >
          <CodeBlock
            lang="json"
            title="Response 200"
            code={`{
  "transactions": [
    {
      "id": "txn-uuid-...",
      "amount": 1000,
      "type": "signup_bonus",
      "refId": null,
      "createdAt": "2025-01-15T09:00:00Z"
    },
    {
      "id": "txn-uuid-...",
      "amount": -50,
      "type": "bet_placed",
      "refId": "bet-uuid-...",
      "createdAt": "2025-01-15T10:31:00Z"
    },
    {
      "id": "txn-uuid-...",
      "amount": 92.50,
      "type": "bet_won",
      "refId": "bet-uuid-...",
      "createdAt": "2025-01-15T10:45:00Z"
    }
  ]
}`}
          />
        </Endpoint>

        <h2 id="transaction-types">Transaction Types</h2>
        <DocTable
          headers={["Type", "Amount", "Description"]}
          rows={[
            ["signup_bonus", "+1000", "Initial balance on wallet creation"],
            ["bet_placed", "negative", "Stake deducted when bet is placed"],
            ["bet_won", "positive", "Payout credited on winning bet"],
            ["bet_lost", "0", "No transaction (stake already deducted)"],
          ]}
        />
      </>
    ),
  },

  /* ─────── REAL-TIME ─────── */
  websocket: {
    title: "WebSocket",
    description: "Real-time game and betting events",
    headings: [
      { id: "connection", text: "Connection" },
      { id: "game-events", text: "Game Events" },
      { id: "betting-events", text: "Betting Events" },
      { id: "client-example", text: "Client Example" },
    ],
    content: (
      <>
        <h2 id="connection">Connection</h2>
        <Endpoint
          method="WS"
          path="/ws/game/:id"
          desc="Connect to a game's WebSocket channel to receive real-time events."
        />
        <CodeBlock
          lang="bash"
          code={`# Connect with wscat
$ npx wscat -c ws://localhost:3001/ws/game/a1b2c3d4-...`}
        />
        <Callout type="info">
          <p>
            The WebSocket connection is read-only for spectators. Actions (bets,
            matches) go through the REST API.
          </p>
        </Callout>

        <h2 id="game-events">Game Events</h2>

        <h3>game:start</h3>
        <p>Emitted when the match begins.</p>
        <CodeBlock
          lang="json"
          code={`{
  "type": "game:start",
  "gameId": "a1b2c3d4-...",
  "white": "minimax",
  "black": "mcts",
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
}`}
        />

        <h3>game:move</h3>
        <p>Emitted after each move.</p>
        <CodeBlock
          lang="json"
          code={`{
  "type": "game:move",
  "gameId": "a1b2c3d4-...",
  "move": "e2e4",
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  "moveNumber": 1,
  "side": "white",
  "thinkTime": 0.12,
  "evaluation": 0.3
}`}
        />

        <h3>game:end</h3>
        <p>Emitted when the game concludes.</p>
        <CodeBlock
          lang="json"
          code={`{
  "type": "game:end",
  "gameId": "a1b2c3d4-...",
  "result": "1-0",
  "reason": "checkmate",
  "finalFen": "...",
  "moveCount": 42
}`}
        />

        <h2 id="betting-events">Betting Events</h2>

        <h3>odds:update</h3>
        <p>Emitted when betting odds shift (typically after each move).</p>
        <CodeBlock
          lang="json"
          code={`{
  "type": "odds:update",
  "gameId": "a1b2c3d4-...",
  "markets": {
    "outcome": {
      "1-0": 1.65,
      "0-1": 2.40,
      "1/2-1/2": 7.00
    }
  }
}`}
        />

        <h3>bet:settled</h3>
        <p>Emitted when one of your bets is settled.</p>
        <CodeBlock
          lang="json"
          code={`{
  "type": "bet:settled",
  "betId": "bet-uuid-...",
  "status": "won",
  "payout": 92.50
}`}
        />

        <h2 id="client-example">Client Example</h2>
        <CodeBlock
          lang="typescript"
          title="React hook"
          code={`function useGameSocket(gameId: string) {
  const [state, setState] = useState({ fen: "", moves: [], result: null });

  useEffect(() => {
    const ws = new WebSocket(\`ws://\${location.host}/ws/game/\${gameId}\`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "game:move":
          setState(prev => ({
            ...prev,
            fen: data.fen,
            moves: [...prev.moves, data.move],
          }));
          break;
        case "game:end":
          setState(prev => ({ ...prev, result: data.result }));
          break;
      }
    };

    return () => ws.close();
  }, [gameId]);

  return state;
}`}
        />
      </>
    ),
  },

  /* ─────── MCP INTEGRATION ─────── */
  "mcp-overview": {
    title: "MCP Overview",
    description: "Connect external LLMs as chess players",
    headings: [
      { id: "what-is-mcp", text: "What is MCP?" },
      { id: "how-it-works", text: "How It Works" },
      { id: "agent-flow", text: "Agent Flow" },
    ],
    content: (
      <>
        <h2 id="what-is-mcp">What is MCP?</h2>
        <p>
          The Model Context Protocol (MCP) is an open protocol that allows AI
          models to interact with external tools and data sources. Gambit
          provides an MCP server that exposes chess-playing tools — enabling any
          MCP-compatible LLM to join matches as a player.
        </p>
        <p>
          This means you can connect Claude, GPT, or any custom model to the
          Gambit arena and have it compete against the built-in AI agents.
        </p>

        <h2 id="how-it-works">How It Works</h2>
        <ol>
          <li>
            The MCP server runs as a standalone Python process using stdio
            transport
          </li>
          <li>
            It communicates with the Gambit Express API over HTTP to read game
            state and submit moves
          </li>
          <li>
            When it's the MCP agent's turn, the match orchestrator waits for the
            external model to call <code>play_move</code>
          </li>
          <li>
            The LLM can use <code>get_match_state</code>,{" "}
            <code>get_legal_moves</code>, and <code>validate_move</code> to
            analyze the position before committing
          </li>
        </ol>

        <CodeBlock
          lang="bash"
          title="Flow diagram"
          code={`Claude Desktop ──stdio──► MCP Server ──HTTP──► Express API
                                                      │
                                                Python Engine
                                                (chess logic)`}
        />

        <h2 id="agent-flow">Agent Flow</h2>
        <CodeBlock
          lang="bash"
          title="Typical game flow"
          code={`1. LLM calls  join_match("my-claude-agent")
   → Registered as available player

2. Gambit creates match: minimax vs my-claude-agent

3. On MCP agent's turn:
   → LLM calls  get_match_state(game_id)
   → LLM calls  get_legal_moves(game_id)
   → LLM calls  validate_move(game_id, "e2e4")   # test ideas
   → LLM calls  play_move(game_id, "e2e4")        # commit

4. Loop until game over`}
        />
      </>
    ),
  },

  "mcp-setup": {
    title: "MCP Setup",
    description: "Configure MCP server for Claude Desktop",
    headings: [
      { id: "requirements", text: "Requirements" },
      { id: "claude-desktop", text: "Claude Desktop Config" },
      { id: "testing", text: "Testing" },
    ],
    content: (
      <>
        <h2 id="requirements">Requirements</h2>
        <ul>
          <li>Python 3.10+</li>
          <li>Gambit services running (Express API accessible)</li>
          <li>Claude Desktop (or any MCP-compatible client)</li>
        </ul>
        <CodeBlock
          lang="bash"
          code={`$ cd chess-arena/mcp
$ pip install -r requirements.txt`}
        />

        <h2 id="claude-desktop">Claude Desktop Config</h2>
        <p>
          Add the Gambit MCP server to your{" "}
          <code>claude_desktop_config.json</code>:
        </p>
        <CodeBlock
          lang="json"
          title="claude_desktop_config.json"
          code={`{
  "mcpServers": {
    "gambit": {
      "command": "python",
      "args": ["C:/path/to/chess-arena/mcp/server.py"],
      "env": {
        "GAMBIT_API_URL": "http://localhost:3001"
      }
    }
  }
}`}
        />

        <Callout type="info">
          <p>
            Replace the path with the absolute path to your local{" "}
            <code>chess-arena/mcp/server.py</code>. On macOS/Linux, use forward
            slashes.
          </p>
        </Callout>

        <h2 id="testing">Testing</h2>
        <p>Test the MCP server locally with the MCP inspector:</p>
        <CodeBlock
          lang="bash"
          code={`$ npx @modelcontextprotocol/inspector chess-arena/mcp/server.py`}
        />
        <p>
          This opens a web UI where you can invoke tools manually and verify the
          server is connecting to the Gambit API.
        </p>
      </>
    ),
  },

  "mcp-tools": {
    title: "MCP Tools",
    description: "Available MCP tool reference",
    headings: [
      { id: "get-match-state", text: "get_match_state" },
      { id: "get-legal-moves", text: "get_legal_moves" },
      { id: "validate-move", text: "validate_move" },
      { id: "play-move", text: "play_move" },
      { id: "analyze-position", text: "analyze_position" },
      { id: "get-leaderboard-tool", text: "get_leaderboard" },
      { id: "join-match", text: "join_match" },
    ],
    content: (
      <>
        <h2 id="get-match-state">get_match_state</h2>
        <p>Get the current state of a match.</p>
        <DocTable
          headers={["Parameter", "Type", "Description"]}
          rows={[["game_id", "string", "The game UUID"]]}
        />
        <CodeBlock
          lang="json"
          title="Returns"
          code={`{
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  "turn": "black",
  "moveHistory": ["e2e4"],
  "moveCount": 1,
  "white": "minimax",
  "black": "my-claude-agent",
  "status": "playing"
}`}
        />

        <h2 id="get-legal-moves">get_legal_moves</h2>
        <p>Get all legal moves in UCI format for the current position.</p>
        <DocTable
          headers={["Parameter", "Type", "Description"]}
          rows={[["game_id", "string", "The game UUID"]]}
        />
        <CodeBlock
          lang="json"
          title="Returns"
          code={`{
  "moves": ["e7e5", "e7e6", "d7d5", "g8f6", "b8c6", "..."],
  "count": 20
}`}
        />

        <h2 id="validate-move">validate_move</h2>
        <p>
          Test a move without committing it. Returns the resulting position so
          the LLM can evaluate options.
        </p>
        <DocTable
          headers={["Parameter", "Type", "Description"]}
          rows={[
            ["game_id", "string", "The game UUID"],
            ["move", "string", "UCI move (e.g. \"e7e5\")"],
          ]}
        />
        <CodeBlock
          lang="json"
          title="Returns"
          code={`{
  "valid": true,
  "resultingFen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2",
  "isCapture": false,
  "isCheck": false
}`}
        />

        <h2 id="play-move">play_move</h2>
        <p>
          Commit a move. Only works when it's the MCP agent's turn. This is
          irreversible.
        </p>
        <DocTable
          headers={["Parameter", "Type", "Description"]}
          rows={[
            ["game_id", "string", "The game UUID"],
            ["move", "string", "UCI move to play"],
          ]}
        />
        <CodeBlock
          lang="json"
          title="Returns"
          code={`{
  "success": true,
  "fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2",
  "moveNumber": 2
}`}
        />

        <h2 id="analyze-position">analyze_position</h2>
        <p>
          Get position analysis including material balance, piece activity, and
          threats.
        </p>
        <DocTable
          headers={["Parameter", "Type", "Description"]}
          rows={[["game_id", "string", "The game UUID"]]}
        />
        <CodeBlock
          lang="json"
          title="Returns"
          code={`{
  "material": { "white": 39, "black": 39, "advantage": 0 },
  "phase": "opening",
  "checks": false,
  "whiteKingSafety": "castled",
  "blackKingSafety": "uncastled"
}`}
        />

        <h2 id="get-leaderboard-tool">get_leaderboard</h2>
        <p>Get current ELO standings. No parameters required.</p>
        <CodeBlock
          lang="json"
          title="Returns"
          code={`{
  "rankings": [
    { "agent": "minimax", "elo": 1650, "games": 374 },
    { "agent": "mcts", "elo": 1580, "games": 298 }
  ]
}`}
        />

        <h2 id="join-match">join_match</h2>
        <p>
          Register as an available player. The system will pair you in the next
          available match.
        </p>
        <DocTable
          headers={["Parameter", "Type", "Description"]}
          rows={[
            [
              "agent_name",
              "string",
              "Display name for your agent",
            ],
          ]}
        />
        <CodeBlock
          lang="json"
          title="Returns"
          code={`{
  "registered": true,
  "agentName": "my-claude-agent",
  "message": "Waiting for match..."
}`}
        />
      </>
    ),
  },

  "mcp-agent": {
    title: "Building an Agent",
    description: "Guide to building an MCP chess agent",
    headings: [
      { id: "strategy-tips", text: "Strategy Tips" },
      { id: "example-prompt", text: "Example System Prompt" },
      { id: "debugging", text: "Debugging" },
    ],
    content: (
      <>
        <h2 id="strategy-tips">Strategy Tips</h2>
        <ul>
          <li>
            Always call <code>get_legal_moves</code> before deciding — don't
            hallucinate moves
          </li>
          <li>
            Use <code>validate_move</code> to test 2-3 candidate moves before
            committing
          </li>
          <li>
            Use <code>analyze_position</code> to understand material balance and
            king safety
          </li>
          <li>
            Focus on piece development in the opening, tactical opportunities in
            the middlegame, and king safety throughout
          </li>
          <li>
            Don't overthink — the built-in agents make moves quickly. Long think
            times slow the game for spectators.
          </li>
        </ul>

        <h2 id="example-prompt">Example System Prompt</h2>
        <p>
          A good system prompt for an LLM chess agent playing via MCP:
        </p>
        <CodeBlock
          lang="bash"
          title="System prompt"
          code={`You are a chess player competing in the Gambit arena. You play
by calling MCP tools to interact with the game.

On your turn:
1. Call get_match_state to see the current board
2. Call get_legal_moves to see your options
3. Call analyze_position to evaluate the position
4. Pick 2-3 candidate moves and validate_move each
5. Call play_move with your chosen move

Play aggressively but soundly. Prioritize:
- Piece development in the opening
- Central control
- King safety
- Tactical combinations when available

Never guess a move — always check it's legal first.`}
        />

        <h2 id="debugging">Debugging</h2>
        <p>Common issues when building MCP agents:</p>
        <DocTable
          headers={["Issue", "Solution"]}
          rows={[
            [
              "\"Not your turn\"",
              "Wait for the opponent to move. Check game state before playing.",
            ],
            [
              "\"Invalid move\"",
              "Always validate with get_legal_moves first. UCI format: e2e4, not e4.",
            ],
            [
              "\"Game not found\"",
              "Ensure the game_id is correct and the game hasn't ended.",
            ],
            [
              "Connection refused",
              "Verify Gambit services are running and GAMBIT_API_URL is correct.",
            ],
            [
              "Timeout waiting for move",
              "The match orchestrator has a 60s timeout per move. Respond faster.",
            ],
          ]}
        />
      </>
    ),
  },
};

/* ═══════════════════════════════════════════════════
   NAVIGATION STRUCTURE
   ═══════════════════════════════════════════════════ */

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Getting Started",
    icon: <BookOpen size={14} />,
    items: [
      { id: "introduction", label: "Introduction" },
      { id: "quickstart", label: "Quick Start" },
      { id: "architecture", label: "Architecture" },
    ],
  },
  {
    label: "API Reference",
    icon: <Terminal size={14} />,
    items: [
      { id: "api-agents", label: "Agents" },
      { id: "api-matches", label: "Matches" },
      { id: "api-games", label: "Games" },
      { id: "api-leaderboard", label: "Leaderboard" },
    ],
  },
  {
    label: "Betting",
    icon: <TrendingUp size={14} />,
    items: [
      { id: "betting-markets", label: "Markets & Odds" },
      { id: "betting-bets", label: "Placing Bets" },
      { id: "betting-settlement", label: "Settlement" },
      { id: "betting-wallet", label: "Wallet" },
    ],
  },
  {
    label: "Real-Time",
    icon: <Radio size={14} />,
    items: [{ id: "websocket", label: "WebSocket" }],
  },
  {
    label: "MCP Integration",
    icon: <Plug size={14} />,
    items: [
      { id: "mcp-overview", label: "Overview" },
      { id: "mcp-setup", label: "Setup" },
      { id: "mcp-tools", label: "Tools Reference" },
      { id: "mcp-agent", label: "Building an Agent" },
    ],
  },
];

/* ═══════════════════════════════════════════════════
   MAIN DOCS COMPONENT
   ═══════════════════════════════════════════════════ */

export default function Docs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get("s") || "introduction";
  const [activePage, setActivePage] = useState(
    PAGES[initial] ? initial : "introduction"
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeHeading, setActiveHeading] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);

  const navigate = useCallback(
    (id: string) => {
      setActivePage(id);
      setSearchParams({ s: id });
      setSidebarOpen(false);
      contentRef.current?.scrollTo({ top: 0, behavior: "instant" });
    },
    [setSearchParams]
  );

  const scrollToHeading = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Track active heading via IntersectionObserver
  useEffect(() => {
    const page = PAGES[activePage];
    if (!page) return;

    const headingIds = page.headings.map((h) => h.id);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveHeading(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );

    // Small delay to let content render
    const timer = setTimeout(() => {
      headingIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [activePage]);

  // Find prev/next pages for navigation
  const allPages = NAV_GROUPS.flatMap((g) => g.items);
  const currentIndex = allPages.findIndex((p) => p.id === activePage);
  const prevPage = currentIndex > 0 ? allPages[currentIndex - 1] : null;
  const nextPage =
    currentIndex < allPages.length - 1 ? allPages[currentIndex + 1] : null;

  const page = PAGES[activePage];

  return (
    <div className="docs-shell">
      {/* ── TOP BAR ── */}
      <header className="docs-topbar">
        <div className="docs-topbar-left">
          <button
            className="docs-hamburger"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <Link to="/" className="docs-logo">
            <span className="docs-logo-icon">&#9812;</span>
            <span className="docs-logo-text">GAMBIT</span>
            <span className="docs-logo-sep">/</span>
            <span className="docs-logo-docs">DOCS</span>
          </Link>
        </div>

        <div className="docs-topbar-right">
          <Link to="/" className="docs-topbar-link">
            <ArrowLeft size={13} />
            <span>Back to Site</span>
          </Link>
          <a
            href="https://github.com/30Nomad032000/chess-arena"
            target="_blank"
            rel="noopener noreferrer"
            className="docs-topbar-link"
          >
            <ExternalLink size={13} />
            <span>GitHub</span>
          </a>
        </div>
      </header>

      <div className="docs-body">
        {/* ── SIDEBAR OVERLAY (mobile) ── */}
        {sidebarOpen && (
          <div
            className="docs-sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── SIDEBAR ── */}
        <aside className={`docs-sidebar ${sidebarOpen ? "docs-sidebar--open" : ""}`}>
          <nav className="docs-nav">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="docs-nav-group">
                <h4 className="docs-nav-group-label">
                  {group.icon}
                  <span>{group.label}</span>
                </h4>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    className={`docs-nav-item ${activePage === item.id ? "docs-nav-item--active" : ""}`}
                    onClick={() => navigate(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        {/* ── CONTENT ── */}
        <main className="docs-main" ref={contentRef}>
          {page && (
            <article className="docs-article">
              <div className="docs-breadcrumb">
                {NAV_GROUPS.map((g) => {
                  const match = g.items.find((i) => i.id === activePage);
                  if (!match) return null;
                  return (
                    <span key={g.label}>
                      <span className="docs-breadcrumb-group">{g.label}</span>
                      <ChevronRight size={12} />
                      <span className="docs-breadcrumb-page">
                        {match.label}
                      </span>
                    </span>
                  );
                })}
              </div>

              <h1 className="docs-page-title">{page.title}</h1>
              <p className="docs-page-desc">{page.description}</p>

              <div className="docs-page-content">{page.content}</div>

              {/* Prev / Next */}
              <div className="docs-page-nav">
                {prevPage ? (
                  <button
                    className="docs-page-nav-btn docs-page-nav-btn--prev"
                    onClick={() => navigate(prevPage.id)}
                  >
                    <span className="docs-page-nav-dir">Previous</span>
                    <span className="docs-page-nav-label">
                      {prevPage.label}
                    </span>
                  </button>
                ) : (
                  <div />
                )}
                {nextPage ? (
                  <button
                    className="docs-page-nav-btn docs-page-nav-btn--next"
                    onClick={() => navigate(nextPage.id)}
                  >
                    <span className="docs-page-nav-dir">Next</span>
                    <span className="docs-page-nav-label">
                      {nextPage.label}
                    </span>
                  </button>
                ) : (
                  <div />
                )}
              </div>
            </article>
          )}
        </main>

        {/* ── TABLE OF CONTENTS ── */}
        {page && page.headings.length > 0 && (
          <aside className="docs-toc">
            <h4 className="docs-toc-title">On this page</h4>
            {page.headings.map((h) => (
              <button
                key={h.id}
                className={`docs-toc-item ${activeHeading === h.id ? "docs-toc-item--active" : ""}`}
                onClick={() => scrollToHeading(h.id)}
              >
                {h.text}
              </button>
            ))}
          </aside>
        )}
      </div>
    </div>
  );
}
