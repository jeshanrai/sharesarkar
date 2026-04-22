import { Router } from "express";
import pool from "../db.js";
import { requireUser, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.use(requireUser);

router.get("/", async (req: AuthRequest, res) => {
  const { rows } = await pool.query(
    `SELECT id, symbol, name, quantity,
            buy_price::float AS buy_price,
            current_price::float AS current_price,
            sector, created_at
     FROM portfolio_holdings
     WHERE user_id = $1
     ORDER BY created_at ASC`,
    [req.userId]
  );
  res.json(rows);
});

router.post("/", async (req: AuthRequest, res) => {
  const { symbol, name, quantity, buy_price, current_price, sector } = req.body ?? {};
  if (!symbol || quantity == null || buy_price == null || current_price == null) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const { rows } = await pool.query(
    `INSERT INTO portfolio_holdings (user_id, symbol, name, quantity, buy_price, current_price, sector)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, symbol, name, quantity,
               buy_price::float AS buy_price,
               current_price::float AS current_price,
               sector, created_at`,
    [
      req.userId,
      String(symbol).toUpperCase(),
      name || "",
      parseInt(quantity, 10) || 0,
      parseFloat(buy_price) || 0,
      parseFloat(current_price) || 0,
      sector || "Others",
    ]
  );
  res.status(201).json(rows[0]);
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const result = await pool.query(
    "DELETE FROM portfolio_holdings WHERE id = $1 AND user_id = $2",
    [id, req.userId]
  );
  if (result.rowCount === 0) {
    res.status(404).json({ error: "Holding not found" });
    return;
  }
  res.json({ ok: true });
});

export default router;
