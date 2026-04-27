import { Router } from "express";
import pool from "../db.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

const ALLOWED_TYPES = new Set(["newsletter", "ipo_alerts", "signals"]);

router.post("/", async (req, res) => {
  const email = (req.body?.email || "").trim() || null;
  const phone = (req.body?.phone || "").trim() || null;
  const type = ALLOWED_TYPES.has(req.body?.subscription_type)
    ? req.body.subscription_type
    : "newsletter";

  if (!email && !phone) {
    res.status(400).json({ error: "Email or phone is required" });
    return;
  }

  // Dedupe by (identifier, type)
  if (email) {
    const { rows } = await pool.query(
      "SELECT id FROM subscribers WHERE email = $1 AND subscription_type = $2",
      [email, type]
    );
    if (rows.length > 0) {
      res.json({ success: true, message: "Already subscribed" });
      return;
    }
  } else if (phone) {
    const { rows } = await pool.query(
      "SELECT id FROM subscribers WHERE phone = $1 AND subscription_type = $2",
      [phone, type]
    );
    if (rows.length > 0) {
      res.json({ success: true, message: "Already subscribed" });
      return;
    }
  }

  await pool.query(
    "INSERT INTO subscribers (email, phone, subscription_type) VALUES ($1, $2, $3)",
    [email, phone, type]
  );

  const messages: Record<string, string> = {
    newsletter: "Subscribed! You'll receive weekly insights.",
    ipo_alerts: "You'll get IPO WhatsApp alerts.",
    signals: "Signals activated!",
  };
  res.status(201).json({ success: true, message: messages[type] });
});

router.get("/admin/all", requireAuth, async (req: AuthRequest, res) => {
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  if (type && !ALLOWED_TYPES.has(type)) {
    res.status(400).json({ error: "Invalid subscription type" });
    return;
  }

  const sql = type
    ? "SELECT * FROM subscribers WHERE subscription_type = $1 ORDER BY created_at DESC"
    : "SELECT * FROM subscribers ORDER BY created_at DESC";
  const params = type ? [type] : [];
  const { rows } = await pool.query(sql, params);
  res.json(rows);
});

router.get("/admin/stats", requireAuth, async (_req: AuthRequest, res) => {
  const { rows } = await pool.query(
    "SELECT subscription_type, COUNT(*)::int AS count FROM subscribers GROUP BY subscription_type"
  );
  const stats: Record<string, number> = { newsletter: 0, ipo_alerts: 0, signals: 0 };
  for (const r of rows) stats[r.subscription_type] = r.count;
  res.json(stats);
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await pool.query("DELETE FROM subscribers WHERE id = $1", [id]);
  res.json({ success: true });
});

export default router;
