export interface Agent {
  id: string;
  name: string;
  description: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  created_at: string;
}

export interface GameEvent {
  type: "move" | "game_start" | "game_end" | "error" | "info";
  data: {
    move?: string;
    fen?: string;
    winner?: string | null;
    result?: string;
    reason?: string;
    white?: string;
    black?: string;
    message?: string;
    [key: string]: unknown;
  };
  timestamp: number;
}

export interface GameSummary {
  id: string;
  white_agent: string;
  black_agent: string;
  status: "pending" | "in_progress" | "completed" | "aborted";
  result: string | null;
  winner: string | null;
  total_moves: number;
  created_at: string;
}

export interface GameDetail extends GameSummary {
  pgn: string;
  final_fen: string;
  events: GameEvent[];
  white_agent_name: string;
  black_agent_name: string;
  white_elo_change: number | null;
  black_elo_change: number | null;
}

export interface LeaderboardEntry {
  agent_id: string;
  agent_name: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  total_games: number;
  win_rate: number;
}

export interface Bet {
  id: string;
  game_id: string;
  user_id: string;
  agent_id: string;
  amount: number;
  odds: number;
  payout: number | null;
  status: "pending" | "won" | "lost" | "refunded";
  created_at: string;
}

export interface MarketOdds {
  game_id: string;
  white_agent: string;
  black_agent: string;
  white_odds: number;
  black_odds: number;
  draw_odds: number;
  total_pool: number;
}

export interface Wallet {
  user_id: string;
  balance: number;
  total_wagered: number;
  total_won: number;
  total_lost: number;
}
