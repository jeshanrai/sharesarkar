import { Router } from "express";
import { randomBytes } from "crypto";
import pool from "../db.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { sendSubscriptionConfirmation, sendBulkMail } from "../services/email.js";
import {
  getEmailSettings,
  getDigestArticles,
  sendDigest,
  renderDigestHtml,
  type EmailSettings,
} from "../services/newsletter.js";
import { applyEmailSettings, describeSchedule } from "../services/newsletterScheduler.js";

const router = Router();

const ALLOWED_TYPES = new Set(["newsletter", "ipo_alerts", "signals"]);

/**
 * Compact URL-safe unsubscribe token. 24 bytes (192 bits) of entropy —
 * cryptographically safe against guessing — encoded base64url for short URLs.
 * The "u_" prefix makes them visually distinguishable in DB and logs.
 */
function generateUnsubscribeToken(): string {
  return "u_" + randomBytes(24).toString("base64url");
}

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

  // Dedupe by (identifier, type). If a previously-unsubscribed row is
  // found we reactivate it rather than creating a duplicate — and reissue
  // a fresh unsubscribe token so old links don't reactivate them again.
  if (email) {
    const { rows } = await pool.query(
      "SELECT id, is_active FROM subscribers WHERE email = $1 AND subscription_type = $2",
      [email, type]
    );
    if (rows.length > 0) {
      if (!rows[0].is_active) {
        await pool.query(
          "UPDATE subscribers SET is_active = TRUE, unsubscribe_token = $1 WHERE id = $2",
          [generateUnsubscribeToken(), rows[0].id]
        );
        res.json({ success: true, message: "Welcome back — you're resubscribed." });
        return;
      }
      res.json({ success: true, message: "Already subscribed" });
      return;
    }
  } else if (phone) {
    const { rows } = await pool.query(
      "SELECT id, is_active FROM subscribers WHERE phone = $1 AND subscription_type = $2",
      [phone, type]
    );
    if (rows.length > 0) {
      if (!rows[0].is_active) {
        await pool.query("UPDATE subscribers SET is_active = TRUE WHERE id = $1", [rows[0].id]);
        res.json({ success: true, message: "Welcome back — you're resubscribed." });
        return;
      }
      res.json({ success: true, message: "Already subscribed" });
      return;
    }
  }

  // Email subscribers get a unique unsubscribe token so every digest can
  // include a one-click opt-out link without leaking other subscriber identifiers.
  // Phone-only rows get NULL here (they unsubscribe via different channels).
  const token = email ? generateUnsubscribeToken() : null;
  await pool.query(
    "INSERT INTO subscribers (email, phone, subscription_type, unsubscribe_token) VALUES ($1, $2, $3, $4)",
    [email, phone, type, token]
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

// ═══════════════════════════════════════════════════════════════════════
// Newsletter / digest
// ═══════════════════════════════════════════════════════════════════════

// ─── Public: one-click unsubscribe ─────────────────────────────────
// CAN-SPAM / GDPR friendly. Single GET, no auth, no re-confirmation form.
// Returns a small self-contained HTML page rather than redirecting to the
// frontend, so unsubscribe always works even if the frontend is down.
router.get("/unsubscribe", async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token.trim() : "";

  if (!token) {
    res.status(400).send(renderUnsubscribePage({
      ok: false,
      message: "Missing unsubscribe token. The link you followed may be malformed.",
    }));
    return;
  }

  const { rows } = await pool.query(
    "SELECT id, email, is_active FROM subscribers WHERE unsubscribe_token = $1",
    [token]
  );

  if (rows.length === 0) {
    res.status(404).send(renderUnsubscribePage({
      ok: false,
      message: "We couldn't find a subscription matching that link. It may have already been used.",
    }));
    return;
  }

  if (!rows[0].is_active) {
    res.status(200).send(renderUnsubscribePage({
      ok: true,
      message: "You were already unsubscribed. No further emails will be sent.",
      email: rows[0].email,
    }));
    return;
  }

  await pool.query("UPDATE subscribers SET is_active = FALSE WHERE id = $1", [rows[0].id]);
  res.status(200).send(renderUnsubscribePage({
    ok: true,
    message: "You've been unsubscribed. We're sorry to see you go.",
    email: rows[0].email,
  }));
});

function renderUnsubscribePage(opts: { ok: boolean; message: string; email?: string }): string {
  const color = opts.ok ? "#009429" : "#dc2626";
  const icon = opts.ok ? "✓" : "✕";
  const emailLine = opts.email
    ? `<p style="color:#6b7280;font-size:13px;margin:8px 0 0;">${opts.email}</p>`
    : "";
  // Resolve the frontend origin so the "back" link doesn't bounce the
  // user to the API server's root (which has no homepage and returns 404).
  // FRONTEND_URL may be a comma-separated list for CORS; first entry wins.
  const frontendUrl =
    ((process.env.FRONTEND_URL || "").split(",")[0].trim().replace(/\/+$/, "")) ||
    "https://sharesanskar.com";
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>${opts.ok ? "Unsubscribed" : "Unsubscribe error"} — ShareSanskar</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
</head><body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:480px;margin:80px auto;padding:32px 24px;background:#fff;border-radius:12px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
  <div style="width:48px;height:48px;border-radius:50%;background:${color}15;color:${color};display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;margin-bottom:16px;">${icon}</div>
  <h1 style="font-size:20px;color:#111827;margin:0 0 8px;">${opts.ok ? "Unsubscribed" : "Couldn't unsubscribe"}</h1>
  <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0;">${opts.message}</p>
  ${emailLine}
  <a href="${frontendUrl}" style="display:inline-block;margin-top:24px;color:#009429;font-size:13px;text-decoration:none;font-weight:600;">← Back to ShareSanskar</a>
</div>
</body></html>`;
}

// ─── Admin: get / update email settings ────────────────────────────

router.get("/admin/email-settings", requireAuth, async (_req: AuthRequest, res) => {
  const settings = await getEmailSettings();
  res.json({
    ...settings,
    schedule_label: describeSchedule(
      settings.weekly_digest_day_of_week,
      settings.weekly_digest_hour,
      settings.weekly_digest_enabled
    ),
  });
});

router.put("/admin/email-settings", requireAuth, async (req: AuthRequest, res) => {
  const body = req.body || {};

  const enabled = typeof body.weekly_digest_enabled === "boolean" ? body.weekly_digest_enabled : undefined;
  const day = Number.isInteger(body.weekly_digest_day_of_week) ? body.weekly_digest_day_of_week : undefined;
  const hour = Number.isInteger(body.weekly_digest_hour) ? body.weekly_digest_hour : undefined;
  const mode = body.digest_curation_mode === "auto" || body.digest_curation_mode === "manual"
    ? body.digest_curation_mode
    : undefined;

  if (day !== undefined && (day < 0 || day > 6)) {
    res.status(400).json({ error: "day_of_week must be 0–6 (Sunday–Saturday)." });
    return;
  }
  if (hour !== undefined && (hour < 0 || hour > 23)) {
    res.status(400).json({ error: "hour must be 0–23." });
    return;
  }

  // Build the UPDATE dynamically so callers can patch one field at a time.
  const updates: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (enabled !== undefined) {
    updates.push(`weekly_digest_enabled = $${idx++}`);
    params.push(enabled);
  }
  if (day !== undefined) {
    updates.push(`weekly_digest_day_of_week = $${idx++}`);
    params.push(day);
  }
  if (hour !== undefined) {
    updates.push(`weekly_digest_hour = $${idx++}`);
    params.push(hour);
  }
  if (mode !== undefined) {
    updates.push(`digest_curation_mode = $${idx++}`);
    params.push(mode);
  }
  if (updates.length === 0) {
    res.status(400).json({ error: "No valid fields to update." });
    return;
  }
  updates.push(`updated_at = NOW()`);

  const { rows } = await pool.query<EmailSettings>(
    `UPDATE email_settings SET ${updates.join(", ")} WHERE id = 1 RETURNING *`,
    params
  );

  // Reschedule cron task to match new settings. Awaited so the response
  // doesn't lie about activation state.
  await applyEmailSettings();

  res.json({
    ...rows[0],
    schedule_label: describeSchedule(
      rows[0].weekly_digest_day_of_week,
      rows[0].weekly_digest_hour,
      rows[0].weekly_digest_enabled
    ),
  });
});

// ─── Admin: preview the next digest ────────────────────────────────
// Returns the articles that would be included plus a rendered HTML body
// (with a placeholder unsubscribe URL) so the admin can review before sending.
router.get("/admin/digest-preview", requireAuth, async (_req: AuthRequest, res) => {
  const articles = await getDigestArticles();
  const { html, text } = renderDigestHtml({
    articles,
    unsubscribeUrl: "#preview-unsubscribe",
    previewBanner: "Preview — recipients will see a personal unsubscribe link in place of this banner.",
  });
  res.json({ articles, html, text });
});

// ─── Admin: send a test digest to one address ──────────────────────
router.post("/admin/send-test-digest", requireAuth, async (req: AuthRequest, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "A valid email address is required." });
    return;
  }
  const result = await sendDigest({ testRecipients: [email] });
  res.json(result);
});

// ─── Admin: trigger the live digest immediately ────────────────────
// Same code path the cron uses. Subject to the same skip rules (no articles,
// no recipients, etc.).
router.post("/admin/send-digest-now", requireAuth, async (_req: AuthRequest, res) => {
  const result = await sendDigest();
  res.json(result);
});

// ─── Admin: manual curation (newsletter_picks CRUD) ────────────────

router.get("/admin/newsletter-picks", requireAuth, async (_req: AuthRequest, res) => {
  const { rows } = await pool.query(
    `SELECT p.news_id, p.sort_order, n.title, n.category, n.is_published, n.created_at
       FROM newsletter_picks p
       JOIN news n ON n.id = p.news_id
       ORDER BY p.sort_order ASC, p.added_at ASC`
  );
  res.json(rows);
});

router.post("/admin/newsletter-picks", requireAuth, async (req: AuthRequest, res) => {
  const ids: unknown = req.body?.news_ids;
  if (!Array.isArray(ids)) {
    res.status(400).json({ error: "news_ids must be an array of integers." });
    return;
  }
  const clean = ids.filter((x): x is number => Number.isInteger(x)).slice(0, 20);
  if (clean.length === 0) {
    res.status(400).json({ error: "At least one valid news_id is required." });
    return;
  }

  // Replace the entire pick list atomically. Simpler API than per-row CRUD
  // and matches the "admin curates a fresh batch each week" mental model.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM newsletter_picks");
    for (let i = 0; i < clean.length; i++) {
      await client.query(
        "INSERT INTO newsletter_picks (news_id, sort_order) VALUES ($1, $2) ON CONFLICT (news_id) DO UPDATE SET sort_order = EXCLUDED.sort_order",
        [clean[i], i]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  res.json({ success: true, count: clean.length });
});

export default router;
