import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db/client.js";

const SESSION_COOKIE = "arena_session";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Extend the Express Request to carry the session_id. */
declare global {
  namespace Express {
    interface Request {
      sessionId: string;
      walletId: string;
    }
  }
}

/**
 * Session middleware:
 * 1. Reads session_id from the "arena_session" cookie.
 * 2. If absent, generates a new UUID and sets it as a cookie.
 * 3. Ensures a wallet row exists in Postgres for the session.
 * 4. Attaches sessionId and walletId to the request object.
 */
export async function sessionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    let sessionId: string | undefined = req.cookies?.[SESSION_COOKIE];
    let isNewSession = false;

    if (!sessionId) {
      sessionId = uuidv4();
      isNewSession = true;

      res.cookie(SESSION_COOKIE, sessionId, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        secure: process.env["NODE_ENV"] === "production",
      });
    }

    req.sessionId = sessionId;

    // Upsert wallet: create if it doesn't exist, otherwise fetch existing
    const result = await query<{ id: string }>(
      `INSERT INTO wallets (session_id)
       VALUES ($1)
       ON CONFLICT (session_id) DO UPDATE SET session_id = EXCLUDED.session_id
       RETURNING id`,
      [sessionId],
    );

    const wallet = result.rows[0];
    if (!wallet) {
      throw new Error("Failed to resolve wallet for session");
    }

    req.walletId = wallet.id;

    if (isNewSession) {
      // Record the initial balance grant as a transaction
      await query(
        `INSERT INTO transactions (wallet_id, amount, type, ref_id)
         VALUES ($1, 1000, 'initial_grant', $1)`,
        [wallet.id],
      );
    }

    next();
  } catch (err) {
    next(err);
  }
}
