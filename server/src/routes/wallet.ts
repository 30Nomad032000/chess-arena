import { Router } from "express";
import * as walletService from "../services/wallet-service.js";

const router = Router();

/**
 * GET /api/wallet
 *
 * Get the balance for the current session's wallet.
 * The session middleware guarantees that req.walletId is set.
 *
 * Returns: { wallet_id, balance }
 */
router.get("/", async (req, res) => {
  try {
    const balance = await walletService.getBalance(req.walletId);

    res.json({
      wallet_id: req.walletId,
      balance,
    });
  } catch (err) {
    console.error("Failed to get wallet:", err);
    res.status(500).json({ error: "Failed to retrieve wallet" });
  }
});

/**
 * GET /api/wallet/history
 *
 * Get the transaction history for the current session's wallet.
 * Returns the 50 most recent transactions, ordered by date descending.
 *
 * Returns: Array<{ id, wallet_id, amount, type, ref_id, created_at }>
 */
router.get("/history", async (req, res) => {
  try {
    const transactions = await walletService.getHistory(req.walletId);

    res.json({
      wallet_id: req.walletId,
      transactions,
    });
  } catch (err) {
    console.error("Failed to get wallet history:", err);
    res.status(500).json({ error: "Failed to retrieve transaction history" });
  }
});

export default router;
