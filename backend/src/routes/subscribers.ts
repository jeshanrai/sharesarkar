import { Router } from "express";
import pool from "../db.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.post("/", async (req, res) => {
  const { email, phone, subscription_type } = req.body;

  if (!email && !phone) {
    res.status(400).json({ error: "Email or phone is required" });
    return;
  }

  // Check for duplicates
  if (email) {
    const { rows: existing } = await pool.query(
      "SELECT id FROM subscribers WHERE email = $1 AND subscription_type = $2",
      [email, subscription_type || "newsletter"]
    );
    if (existing.length > 0) {
      res.json({ success: true, message: "Already subscribed" });
      return;
    }
  }

  await pool.query(
    "INSERT INTO subscribers (email, phone, subscription_type) VALUES ($1, $2, $3)",
    [email || null, phone || null, subscription_type || "newsletter"]
  );

  res.status(201).json({ success: true, message: "Subscribed successfully" });
});

router.get("/admin/all", requireAuth, async (_req: AuthRequest, res) => {
  const { rows } = await pool.query("SELECT * FROM subscribers ORDER BY created_at DESC");
  res.json(rows);
});

export default router;
