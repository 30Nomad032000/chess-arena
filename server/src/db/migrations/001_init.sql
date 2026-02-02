CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE ratings (
    agent_name TEXT PRIMARY KEY,
    elo REAL DEFAULT 1500,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    draws INT DEFAULT 0,
    games INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    white TEXT NOT NULL,
    black TEXT NOT NULL,
    result TEXT,
    moves TEXT[] DEFAULT '{}',
    timestamps REAL[] DEFAULT '{}',
    fen_final TEXT,
    move_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT UNIQUE NOT NULL,
    balance REAL DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id),
    game_id UUID REFERENCES games(id),
    bet_type TEXT NOT NULL,
    selection TEXT NOT NULL,
    stake REAL NOT NULL,
    odds REAL NOT NULL,
    status TEXT DEFAULT 'active',
    payout REAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id),
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    ref_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bets_game ON bets(game_id);
CREATE INDEX idx_bets_wallet ON bets(wallet_id);
CREATE INDEX idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX idx_games_created ON games(created_at DESC);
