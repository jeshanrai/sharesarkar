/**
 * Email delivery service — thin wrapper around nodemailer.
 *
 * Configuration (all optional — if SMTP_HOST is absent the service
 * logs a warning and silently no-ops every send call, so the app
 * boots and runs without email configured):
 *
 *   SMTP_HOST   — e.g. smtp.gmail.com
 *   SMTP_PORT   — default 587 (STARTTLS)
 *   SMTP_USER   — SMTP login username
 *   SMTP_PASS   — SMTP login password / app-password
 *   EMAIL_FROM  — "Display Name <address@domain.com>"
 */

import nodemailer, { Transporter } from "nodemailer";

let _transport: Transporter | null = null;
let _warned = false;

function getTransport(): Transporter | null {
  if (_transport) return _transport;

  const host = process.env.SMTP_HOST;
  if (!host) {
    if (!_warned) {
      console.warn(
        "[email] SMTP_HOST is not configured — email delivery is disabled. " +
        "Set SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / EMAIL_FROM to enable it."
      );
      _warned = true;
    }
    return null;
  }

  _transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, STARTTLS otherwise
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return _transport;
}

const FROM = process.env.EMAIL_FROM || "ShareSanskar <no-reply@sharesanskar.com>";

export interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send a single email. Returns true on success, false if email is
 * not configured or if the send fails (error is logged but not thrown
 * so callers don't need to handle it specially).
 */
export async function sendMail(opts: MailOptions): Promise<boolean> {
  const transport = getTransport();
  if (!transport) return false;

  try {
    await transport.sendMail({
      from: FROM,
      to: Array.isArray(opts.to) ? opts.to.join(", ") : opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return true;
  } catch (err) {
    console.error("[email] Failed to send mail:", (err as Error).message);
    return false;
  }
}

/**
 * Send to a list of recipients in batches to avoid overwhelming the SMTP
 * relay and hitting per-message recipient limits.
 *
 * Returns { sent, failed } counts.
 */
export async function sendBulkMail(
  recipients: string[],
  subject: string,
  html: string,
  text?: string,
  batchSize = 50
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    const ok = await sendMail({ to: batch, subject, html, text });
    if (ok) sent += batch.length;
    else failed += batch.length;

    // Small pause between batches to be polite to the relay
    if (i + batchSize < recipients.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return { sent, failed };
}

/**
 * Send a welcome / confirmation email to a new subscriber.
 * No-ops silently if email is not configured.
 */
export async function sendSubscriptionConfirmation(
  email: string,
  type: string
): Promise<void> {
  const typeLabels: Record<string, string> = {
    newsletter: "Weekly Newsletter",
    ipo_alerts: "IPO Alerts",
    signals:    "Market Signals",
  };
  const label = typeLabels[type] || "ShareSanskar Updates";

  await sendMail({
    to: email,
    subject: `You're subscribed to ${label} — ShareSanskar`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <h2 style="color:#009429;margin-bottom:8px;">Welcome to ShareSanskar!</h2>
        <p style="color:#374151;font-size:16px;line-height:1.6;">
          You've successfully subscribed to <strong>${label}</strong>.
          We'll keep you updated with the latest Nepal stock market news, IPO listings,
          and investment insights.
        </p>
        <p style="color:#6b7280;font-size:14px;margin-top:24px;">
          — The ShareSanskar Team
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#9ca3af;font-size:12px;">
          You received this because you subscribed at sharesanskar.com.
        </p>
      </div>
    `,
    text: `Welcome to ShareSanskar!\n\nYou've subscribed to ${label}.\n\n— The ShareSanskar Team`,
  });
}
