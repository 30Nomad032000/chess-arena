export interface Agent {
  name: string;
  description: string;
  elo: number;
}

export interface GameEvent {
  type: "game_start" | "move" | "game_end" | "error";
  game_id: string;
  move?: string;
  fen?: string;
  move_number?: number;
  elapsed?: number;
  agent?: string;
  white?: string;
  black?: string;
  result?: string;
  move_count?: number;
}

export interface GameSummary {
  id: string;
  white: string;
  black: string;
  result: string | null;
  move_count: number;
  created_at: string;
}

export interface GameDetail extends GameSummary {
  moves: string[];
  timestamps: number[];
  fen_final: string;
}

export interface LeaderboardEntry {
  name: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  games: number;
}

export interface BetRequest {
  game_id: string;
  bet_type: "outcome" | "move_count" | "next_move";
  selection: string;
  stake: number;
}

export interface Bet {
  id: string;
  wallet_id: string;
  game_id: string;
  bet_type: string;
  selection: string;
  stake: number;
  odds: number;
  status: "active" | "won" | "lost" | "void";
  payout: number;
  created_at: string;
}

export interface Wallet {
  id: string;
  session_id: string;
  balance: number;
}

export interface MarketOdds {
  outcome: Record<string, number>;
  move_count: Record<string, number>;
  next_move: Record<string, number>;
}
