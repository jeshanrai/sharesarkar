/**
 * Newsletter digest service.
 *
 * Renders and sends the weekly digest of recently-published articles to all
 * active newsletter subscribers, with a personalized one-click unsubscribe
 * link in every footer.
 *
 * Public entry points:
 *   - getDigestArticles()           — preview which articles will be sent
 *   - sendDigest({ recipients? })   — actually send (or send to a test list)
 *   - renderDigestHtml(...)         — pure HTML render (used by preview API)
 */

import pool from "../db.js";
import { sendPersonalizedBulkMail, sendMail } from "./email.js";

// ─── Types ────────────────────────────────────────────────────────────

export interface EmailSettings {
  id: 1;
  weekly_digest_enabled: boolean;
  weekly_digest_day_of_week: number; // 0–6, Sunday=0
  weekly_digest_hour: number;        // 0–23
  digest_curation_mode: "auto" | "manual";
  weekly_digest_last_sent_at: string | null;
  weekly_digest_last_sent_count: number;
  updated_at: string;
}

export interface DigestArticle {
  id: number;
  title: string;
  slug: string | null;
  excerpt: string;
  category: string;
  image_url: string;
  author: string;
  created_at: string;
}

export interface DigestRecipient {
  id: number;
  email: string;
  unsubscribe_token: string;
}

// ─── Configuration helpers ────────────────────────────────────────────

/**
 * Load the single-row email_settings record. Created by migration 014;
 * if missing for any reason, return safe defaults rather than crashing.
 */
export async function getEmailSettings(): Promise<EmailSettings> {
  const { rows } = await pool.query<EmailSettings>(
    "SELECT * FROM email_settings WHERE id = 1"
  );
  if (rows.length > 0) return rows[0];
  // Defensive fallback — migration may not have run yet
  return {
    id: 1,
    weekly_digest_enabled: false,
    weekly_digest_day_of_week: 1,
    weekly_digest_hour: 6,
    digest_curation_mode: "auto",
    weekly_digest_last_sent_at: null,
    weekly_digest_last_sent_count: 0,
    updated_at: new Date().toISOString(),
  };
}

/** Maximum articles to include per digest. Keeps emails skimmable. */
const MAX_ARTICLES_PER_DIGEST = 10;

/** Lookback window for auto-curation mode. */
const AUTO_DIGEST_WINDOW_DAYS = 7;

// ─── Article fetching ─────────────────────────────────────────────────

/**
 * Resolve which articles should be in the next digest, based on the
 * admin's curation mode. In auto mode we pull the last 7 days of
 * published articles; in manual mode we read from newsletter_picks.
 */
export async function getDigestArticles(): Promise<DigestArticle[]> {
  const settings = await getEmailSettings();

  if (settings.digest_curation_mode === "manual") {
    const { rows } = await pool.query<DigestArticle>(
      `SELECT n.id, n.title, n.slug, n.excerpt, n.category, n.image_url,
              n.author, n.created_at
         FROM newsletter_picks p
         JOIN news n ON n.id = p.news_id
        WHERE n.is_published = TRUE
        ORDER BY p.sort_order ASC, p.added_at ASC
        LIMIT $1`,
      [MAX_ARTICLES_PER_DIGEST]
    );
    return rows;
  }

  // Auto mode
  const { rows } = await pool.query<DigestArticle>(
    `SELECT id, title, slug, excerpt, category, image_url, author, created_at
       FROM news
      WHERE is_published = TRUE
        AND created_at >= NOW() - INTERVAL '${AUTO_DIGEST_WINDOW_DAYS} days'
      ORDER BY created_at DESC
      LIMIT $1`,
    [MAX_ARTICLES_PER_DIGEST]
  );
  return rows;
}

// ─── HTML rendering ───────────────────────────────────────────────────

/**
 * Escape user-supplied content for safe HTML inclusion.
 * Article titles/excerpts come from admin-authored content but defending
 * against accidental `<script>` characters costs us nothing.
 */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function frontendBase(): string {
  // FRONTEND_URL is comma-separated for CORS; take the first entry as canonical.
  const raw = (process.env.FRONTEND_URL || "").split(",")[0].trim();
  return raw.replace(/\/+$/, "") || "https://sharesanskar.com";
}

function backendBase(): string {
  // Used for the unsubscribe link AND for absolutizing media URLs stored
  // as relative paths (e.g. "/uploads/abc.jpg") — those resolve fine in
  // the browser but break in email clients which have no base origin.
  const raw = (process.env.BACKEND_URL || "").trim();
  if (raw) return raw.replace(/\/+$/, "");
  // If BACKEND_URL isn't set, fall back to the frontend origin's API path —
  // works in deployments where /api and /uploads are proxied.
  return frontendBase();
}

/**
 * Convert a possibly-relative URL into a fully-qualified absolute one.
 * Email clients have no concept of a base origin, so every <img src> and
 * <a href> in the message must already be absolute. We treat anything
 * starting with `/` as a path on the backend (where /uploads is served);
 * anything else that isn't already absolute is left alone (likely external).
 */
function absolutize(url: string, base: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) return `${base}${url}`;
  return url;
}

export interface RenderDigestOptions {
  articles: DigestArticle[];
  unsubscribeUrl: string;
  /** Optional preview banner, shown only for admin previews. */
  previewBanner?: string;
}

/**
 * Pure render function. Produces an email-safe HTML string using inline
 * styles only (most clients strip <style>). Returns both HTML and a
 * plaintext fallback for accessibility / spam-score balance.
 */
export function renderDigestHtml(opts: RenderDigestOptions): { html: string; text: string } {
  const { articles, unsubscribeUrl, previewBanner } = opts;
  const base = frontendBase();

  // Plain text fallback — many providers (Gmail, Outlook) raise spam score
  // for HTML-only messages, so we always include both.
  const textLines = [
    "ShareSanskar Weekly Digest",
    "",
    "Here's a roundup of stories from ShareSanskar this week:",
    "",
  ];
  for (const a of articles) {
    textLines.push(`• ${a.title}`);
    if (a.excerpt) textLines.push(`  ${a.excerpt}`);
    textLines.push(`  Read: ${base}/news/${a.id}`);
    textLines.push("");
  }
  textLines.push("");
  textLines.push(`Unsubscribe: ${unsubscribeUrl}`);
  textLines.push("ShareSanskar — sharesanskar.com");
  const text = textLines.join("\n");

  // HTML version. Table-based layout because Gmail/Outlook still butcher
  // flex/grid in many clients. Inline styles, no external CSS, no JS.
  // Hero images use the backend origin since /uploads is served there —
  // email clients have no concept of a relative base.
  const mediaBase = backendBase();
  const articleCards = articles
    .map((a) => {
      const link = `${base}/news/${a.id}`;
      const heroUrl = absolutize(a.image_url, mediaBase);
      const hero = heroUrl
        ? `<img src="${esc(heroUrl)}" alt="${esc(a.title)}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border-radius:8px;margin-bottom:12px;border:0;">`
        : "";
      return `
        <tr>
          <td style="padding:16px 0;border-bottom:1px solid #e5e7eb;">
            ${hero}
            <div style="font-size:11px;font-weight:600;color:#009429;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">${esc(a.category || "News")}</div>
            <a href="${link}" style="text-decoration:none;color:#111827;">
              <div style="font-size:18px;font-weight:700;line-height:1.35;margin-bottom:8px;">${esc(a.title)}</div>
            </a>
            <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 12px;">${esc(a.excerpt || "")}</p>
            <a href="${link}" style="font-size:13px;font-weight:600;color:#009429;text-decoration:none;">Read article →</a>
          </td>
        </tr>`;
    })
    .join("");

  const banner = previewBanner
    ? `<div style="background:#fef3c7;border:1px solid #f59e0b;color:#92400e;padding:12px 16px;font-size:13px;border-radius:6px;margin-bottom:16px;">⚠ ${esc(previewBanner)}</div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>ShareSanskar Weekly Digest</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb;padding:24px 0;">
  <tr>
    <td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;padding:32px 24px;">
        <tr>
          <td>
            ${banner}
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${base}" style="display:inline-block;text-decoration:none;">
                <img src="${base}/assets/logos/png/sharesanskar-logo.png" alt="ShareSanskar" width="200" style="display:inline-block;width:200px;max-width:80%;height:auto;border:0;">
              </a>
              <div style="font-size:13px;color:#6b7280;margin-top:8px;">Weekly Digest</div>
            </div>
            <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 8px;">Here's a roundup of stories from ShareSanskar this week.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${articleCards || `<tr><td style="padding:32px 0;text-align:center;color:#9ca3af;">No new articles to share this week.</td></tr>`}
            </table>
            <div style="text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb;">
              <a href="${base}" style="display:inline-block;background:#009429;color:#ffffff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Visit ShareSanskar</a>
            </div>
            <div style="margin-top:32px;text-align:center;color:#9ca3af;font-size:12px;line-height:1.6;">
              <p style="margin:0 0 4px;">You're receiving this because you subscribed at sharesanskar.com.</p>
              <p style="margin:0;">
                <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
                &nbsp;·&nbsp;
                <a href="${base}" style="color:#9ca3af;text-decoration:underline;">Visit site</a>
              </p>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { html, text };
}

// ─── Recipient resolution ─────────────────────────────────────────────

/** Active newsletter subscribers who have both an email and a token. */
async function getNewsletterRecipients(): Promise<DigestRecipient[]> {
  const { rows } = await pool.query<DigestRecipient>(
    `SELECT id, email, unsubscribe_token
       FROM subscribers
      WHERE subscription_type = 'newsletter'
        AND is_active = TRUE
        AND email IS NOT NULL
        AND unsubscribe_token IS NOT NULL`
  );
  return rows;
}

// ─── Send ─────────────────────────────────────────────────────────────

export interface SendDigestResult {
  sent: number;
  failed: number;
  total: number;
  articles: number;
  reason?: string; // populated only when skipped (e.g. no articles)
}

export interface SendDigestOptions {
  /**
   * If provided, send only to these specific addresses (for admin previews).
   * Each preview message uses a placeholder unsubscribe URL pointing at the
   * site root, since previews aren't real subscribers and we don't want a
   * preview click to corrupt a real subscriber's state.
   */
  testRecipients?: string[];
  /** Optional banner shown at the top of the rendered email. */
  previewBanner?: string;
}

/**
 * Build and send the digest. Returns counts; never throws (errors logged).
 */
export async function sendDigest(opts: SendDigestOptions = {}): Promise<SendDigestResult> {
  const articles = await getDigestArticles();
  if (articles.length === 0) {
    return {
      sent: 0,
      failed: 0,
      total: 0,
      articles: 0,
      reason: "No articles available for the digest window — nothing was sent.",
    };
  }

  const subject = buildSubject();

  // ── Test/preview path ──
  if (opts.testRecipients && opts.testRecipients.length > 0) {
    const base = frontendBase();
    const previewUnsub = `${base}/?preview=unsubscribe`;
    const { html, text } = renderDigestHtml({
      articles,
      unsubscribeUrl: previewUnsub,
      previewBanner: opts.previewBanner ?? "PREVIEW — this is a test send, not a live broadcast.",
    });

    let sent = 0;
    let failed = 0;
    for (const addr of opts.testRecipients) {
      const ok = await sendMail({ to: addr, subject: `[Preview] ${subject}`, html, text });
      if (ok) sent++;
      else failed++;
    }
    return { sent, failed, total: opts.testRecipients.length, articles: articles.length };
  }

  // ── Live broadcast path ──
  const recipients = await getNewsletterRecipients();
  if (recipients.length === 0) {
    return {
      sent: 0,
      failed: 0,
      total: 0,
      articles: articles.length,
      reason: "No active newsletter subscribers — nothing was sent.",
    };
  }

  const personalized = recipients.map((r) => {
    const unsubscribeUrl = `${backendBase()}/api/subscribers/unsubscribe?token=${encodeURIComponent(r.unsubscribe_token)}`;
    const { html, text } = renderDigestHtml({ articles, unsubscribeUrl });
    return { email: r.email, ref: r.id, html, text };
  });

  const { sent, failed } = await sendPersonalizedBulkMail(personalized, subject);

  // Update audit columns and mark recipients as emailed.
  // We mark even failed recipients so a relay outage doesn't cause double-sends
  // on retry — operators can manually clear last_emailed_at if needed.
  await pool.query(
    `UPDATE email_settings
        SET weekly_digest_last_sent_at = NOW(),
            weekly_digest_last_sent_count = $1,
            updated_at = NOW()
      WHERE id = 1`,
    [sent]
  );
  await pool.query(
    "UPDATE subscribers SET last_emailed_at = NOW() WHERE id = ANY($1::int[])",
    [recipients.map((r) => r.id)]
  );

  // If we were in manual mode, clear the curated picks so the admin can
  // build a fresh list for next week. We do this even on partial-failure
  // because the picks have already been "used".
  const settings = await getEmailSettings();
  if (settings.digest_curation_mode === "manual") {
    await pool.query("DELETE FROM newsletter_picks");
  }

  return { sent, failed, total: recipients.length, articles: articles.length };
}

/** Localized subject with the current ISO week date. Recipients see the week clearly. */
function buildSubject(): string {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kathmandu",
  });
  return `ShareSanskar Weekly Digest — ${fmt.format(now)}`;
}
