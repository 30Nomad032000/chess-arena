import { config } from "../config.js";

interface AgentInfo {
  name: string;
  description: string;
}

interface MoveResult {
  move: string;
  fen: string;
  is_over: boolean;
  result: string | null;
  elapsed: number;
}

interface GameState {
  fen: string;
  legal_moves: string[];
  moves: string[];
  turn: "white" | "black";
  is_over: boolean;
  result: string | null;
  fullmove_number: number;
  white: string;
  black: string;
}

interface ValidateMoveResult {
  valid: boolean;
  resulting_fen: string | null;
}

class EngineClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.ENGINE_URL;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Engine request failed: ${response.status} ${response.statusText} — ${body}`,
      );
    }

    return response.json() as Promise<T>;
  }

  async getAgents(): Promise<AgentInfo[]> {
    return this.request<AgentInfo[]>("/agents");
  }

  async newGame(white: string, black: string): Promise<string> {
    const result = await this.request<{ game_id: string }>(
      "/game/new",
      {
        method: "POST",
        body: JSON.stringify({ white, black }),
      },
    );
    return result.game_id;
  }

  async getMove(gameId: string): Promise<MoveResult> {
    return this.request<MoveResult>(`/game/${gameId}/move`, {
      method: "POST",
    });
  }

  async getState(gameId: string): Promise<GameState> {
    return this.request<GameState>(`/game/${gameId}/state`);
  }

  async validateMove(
    gameId: string,
    move: string,
  ): Promise<ValidateMoveResult> {
    return this.request<ValidateMoveResult>(`/game/${gameId}/validate`, {
      method: "POST",
      body: JSON.stringify({ move }),
    });
  }

  async analyzePosition(gameId: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/game/${gameId}/analyze`, {
      method: "POST",
    });
  }
}

export const engineClient = new EngineClient();
