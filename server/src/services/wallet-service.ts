import { query, getClient } from "../db/client.js";

interface WalletInfo {
  id: string;
  balance: number;
}

interface Transaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: string;
  ref_id: string | null;
  created_at: string;
}

/**
 * Get an existing wallet by session ID, or create a new one with the default
 * balance of 1000.
 */
export async function getOrCreateWallet(sessionId: string): Promise<WalletInfo> {
  const existing = await query<{ id: string; balance: number }>(
    "SELECT id, balance FROM wallets WHERE session_id = $1",
    [sessionId],
  );

  if (existing.rows.length > 0) {
    return existing.rows[0]!;
  }

  const inserted = await query<{ id: string; balance: number }>(
    `INSERT INTO wallets (session_id)
     VALUES ($1)
     ON CONFLICT (session_id) DO UPDATE SET session_id = EXCLUDED.session_id
     RETURNING id, balance`,
    [sessionId],
  );

  return inserted.rows[0]!;
}

/**
 * Return the current balance for a wallet.
 */
export async function getBalance(walletId: string): Promise<number> {
  const result = await query<{ balance: number }>(
    "SELECT balance FROM wallets WHERE id = $1",
    [walletId],
  );

  if (result.rows.length === 0) {
    throw new Error(`Wallet ${walletId} not found`);
  }

  return result.rows[0]!.balance;
}

/**
 * Debit (subtract) an amount from a wallet.
 * Creates a transaction record. Throws if the wallet has insufficient funds.
 * Uses a transaction with row-level locking to prevent race conditions.
 */
export async function debit(
  walletId: string,
  amount: number,
  type: string,
  refId?: string,
): Promise<void> {
  if (amount <= 0) {
    throw new Error("Debit amount must be positive");
  }

  const client = await getClient();
  try {
    await client.query("BEGIN");

    // Lock the wallet row and read current balance.
    const walletResult = await client.query<{ balance: number }>(
      "SELECT balance FROM wallets WHERE id = $1 FOR UPDATE",
      [walletId],
    );

    if (walletResult.rows.length === 0) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    const currentBalance = walletResult.rows[0]!.balance;

    if (currentBalance < amount) {
      throw new Error(
        `Insufficient balance: have ${currentBalance}, need ${amount}`,
      );
    }

    // Deduct the amount.
    await client.query(
      "UPDATE wallets SET balance = balance - $1 WHERE id = $2",
      [amount, walletId],
    );

    // Record the transaction (negative amount for debits).
    await client.query(
      `INSERT INTO transactions (wallet_id, amount, type, ref_id)
       VALUES ($1, $2, $3, $4)`,
      [walletId, -amount, type, refId ?? null],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Credit (add) an amount to a wallet and record the transaction.
 */
export async function credit(
  walletId: string,
  amount: number,
  type: string,
  refId?: string,
): Promise<void> {
  if (amount <= 0) {
    throw new Error("Credit amount must be positive");
  }

  const client = await getClient();
  try {
    await client.query("BEGIN");

    await client.query(
      "UPDATE wallets SET balance = balance + $1 WHERE id = $2",
      [amount, walletId],
    );

    await client.query(
      `INSERT INTO transactions (wallet_id, amount, type, ref_id)
       VALUES ($1, $2, $3, $4)`,
      [walletId, amount, type, refId ?? null],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Return the most recent transactions for a wallet.
 */
export async function getHistory(
  walletId: string,
  limit: number = 50,
): Promise<Transaction[]> {
  const result = await query<Transaction>(
    `SELECT id, wallet_id, amount, type, ref_id, created_at::text
     FROM transactions
     WHERE wallet_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [walletId, limit],
  );

  return result.rows;
}
