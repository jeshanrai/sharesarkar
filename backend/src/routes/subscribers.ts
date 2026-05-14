import { Router } from "express";
import pool from "../db.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { sendSubscriptionConfirmation, sendBulkMail } from "../services/email.js";

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
    signals:    "Signals activated!",
  };
  res.status(201).json({ success: true, message: messages[type] });

  // Send confirmation email in the background — don't await so the response
  // is immediate even if the SMTP relay is slow.
  if (email) {
    sendSubscriptionConfirmation(email, type).catch((err: unknown) =>
      console.warn("[subscribers] Confirmation email failed:", (err as Error).message)
    );
  }
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

// ─── Admin: broadcast newsletter ──────────────────────────────────────────────
// Sends `body_html` to all email subscribers of the given `subscription_type`
// (defaults to "newsletter"). Batches in groups of 50 to be polite to the relay.
router.post("/admin/send-newsletter", requireAuth, async (req: AuthRequest, res) => {
  const subject   = typeof req.body?.subject   === "string" ? req.body.subject.trim()   : "";
  const body_html = typeof req.body?.body_html === "string" ? req.body.body_html.trim() : "";
  const type      = ALLOWED_TYPES.has(req.body?.subscription_type)
    ? req.body.subscription_type
    : "newsletter";

  if (!subject || !body_html) {
    res.status(400).json({ error: "subject and body_html are required" });
    return;
  }

  // Fetch all email subscribers for this type
  const { rows } = await pool.query(
    "SELECT email FROM subscribers WHERE subscription_type = $1 AND email IS NOT NULL",
    [type]
  );
  const emails = rows.map((r: { email: string }) => r.email).filter(Boolean);

  if (emails.length === 0) {
    res.json({ sent: 0, failed: 0, message: "No email subscribers found for this type." });
    return;
  }

  // Send immediately — for large lists consider moving to a background job
  const { sent, failed } = await sendBulkMail(emails, subject, body_html);

  res.json({
    sent,
    failed,
    total: emails.length,
    message: `Newsletter sent to ${sent} of ${emails.length} subscribers.`,
  });
});

export default router;
