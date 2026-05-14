import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import stockRoutes from "./routes/stocks.js";
import authRoutes from "./routes/auth.js";

import newsRoutes from "./routes/news.js";
import ipoRoutes from "./routes/ipo.js";
import subscriberRoutes from "./routes/subscribers.js";
import nepseRoutes from "./routes/nepse.js";
import mediaRoutes from "./routes/media.js";
import adsRoutes from "./routes/ads.js";
import categoryRoutes from "./routes/categories.js";
import videoRoutes from "./routes/videos.js";
import { startNepseScheduler } from "./services/nepse.js";
import { applyEmailSettings } from "./services/newsletterScheduler.js";
import { getStorage } from "./services/storage.js";

const app = express();
const PORT = process.env.PORT || 5000;

const stripSlash = (s: string) => s.replace(/\/+$/, "");
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((o) => stripSlash(o.trim()))
  .filter(Boolean);

// Sized to comfortably exceed our per-field article caps (~10 MB total) with
// headroom. Override via BODY_LIMIT if you ever need to accept larger payloads.
const bodyLimit = process.env.BODY_LIMIT || "12mb";

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.length === 0) return cb(null, true);
      if (allowedOrigins.includes(stripSlash(origin))) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);
// Article drafts can include inline base64 media, so keep the parser limit above the default.
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

// ─── Rate limiting ────────────────────────────────────────────────────────────
//
// Three tiers:
//   loginLimiter   — strict, per-IP brute-force protection on the login endpoint.
//   publicLimiter  — moderate cap on unauthenticated read endpoints.
//   writeLimiter   — relaxed cap for authenticated admin/write endpoints.
//
// All limiters use the standard X-RateLimit-* headers so the frontend can
// display a friendly message before the user hits the wall.

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 20,                   // 20 attempts per window per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
  skipSuccessfulRequests: true, // don't count successful logins against the limit
});

const publicLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1-minute window
  max: 120,             // 120 req/min per IP — generous for read traffic
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down and try again shortly." },
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1-minute window
  max: 200,             // 200 req/min — authenticated users get more headroom
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down and try again shortly." },
});

// Apply rate limiters before route handlers
app.use("/api/admin/login", loginLimiter);
app.use("/api/admin",       writeLimiter);
app.use("/api/news",        publicLimiter);
app.use("/api/ipo",         publicLimiter);
app.use("/api/nepse",       publicLimiter);
app.use("/api/categories",  publicLimiter);
app.use("/api/subscribers", writeLimiter);
app.use("/api/media",       writeLimiter);
app.use("/api/ads",         writeLimiter);
app.use("/api/videos",      writeLimiter);
app.use("/api/stocks",      publicLimiter);

// ─── Route registration ───────────────────────────────────────────────────────
app.use("/api/stocks", stockRoutes);
app.use("/api/admin", authRoutes);

app.use("/api/news", newsRoutes);
app.use("/api/ipo", ipoRoutes);
app.use("/api/subscribers", subscriberRoutes);
app.use("/api/nepse", nepseRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/ads", adsRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/videos", videoRoutes);

// Serve uploaded media as static files. Long-lived cache header is safe
// because filenames are content-derived UUIDs that never change.
//
// We re-resolve the storage adapter inside the middleware so a config
// change (and singleton recreation) is picked up without needing a
// full server restart. The express.static handler itself is cached
// per-directory to avoid recompiling on every request.
const initialStorage = getStorage();
const staticHandlerCache = new Map<string, express.RequestHandler>();
function staticHandlerFor(dir: string): express.RequestHandler {
  let handler = staticHandlerCache.get(dir);
  if (!handler) {
    handler = express.static(dir, {
      maxAge: "30d",
      immutable: true,
      fallthrough: true,
    });
    staticHandlerCache.set(dir, handler);
  }
  return handler;
}
app.use(initialStorage.urlPrefix, (req, res, next) => {
  staticHandlerFor(getStorage().directory)(req, res, next);
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Polite root response so anyone landing on the API server's root URL
// (e.g. after clicking a relative link in an unsubscribe email) doesn't
// see Express's bare "Cannot GET /" page. Redirects to the frontend.
app.get("/", (_req, res) => {
  const frontendUrl =
    ((process.env.FRONTEND_URL || "").split(",")[0].trim().replace(/\/+$/, "")) ||
    null;
  if (frontendUrl) {
    res.redirect(302, frontendUrl);
    return;
  }
  res.json({
    service: "sharesanskar-api",
    message: "This is the API server. Visit the website instead.",
  });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// Catches any error thrown (or passed to next()) inside route handlers and
// converts it to a structured JSON response instead of an HTML stack trace.
// Express requires the 4-argument signature to identify this as an error handler.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // PayloadTooLargeError → clean 413
  if (
    err &&
    typeof err === "object" &&
    "type" in err &&
    (err as { type?: string }).type === "entity.too.large"
  ) {
    res.status(413).json({
      error: `Request body is too large. Limit: ${bodyLimit}. Try shortening the article or hosting media externally.`,
    });
    return;
  }

  // Log unhandled server errors with a stack trace for debugging
  console.error("[server error]", err);

  const status =
    err && typeof err === "object" && "status" in err
      ? (err as { status: number }).status
      : 500;
  const message =
    err && typeof err === "object" && "message" in err
      ? (err as { message: string }).message
      : "Internal server error";

  res.status(status).json({ error: message });
});

// ─── Startup config validation ────────────────────────────────────────────────
// Called after dotenv has had a chance to populate process.env (which happens
// when index.ts's top-level code runs, AFTER all static imports are evaluated).
function validateConfig(): void {
  const secret = process.env.JWT_SECRET;
  const DEFAULT = "sharesanskar-admin-secret-change-in-production";
  if (!secret || secret === DEFAULT) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "\n❌ [startup] FATAL: JWT_SECRET is not set or is the default placeholder.\n" +
        "   Set a strong, unique secret via the JWT_SECRET environment variable.\n"
      );
      process.exit(1);
    }
    console.warn(
      "\n⚠️  [startup] JWT_SECRET is missing or is the default placeholder.\n" +
      "   Set a strong secret in .env before going to production.\n"
    );
  }

  // Email deliverability sanity check. A common silent failure mode is
  // sending via Gmail SMTP with a From: address whose domain has no
  // matching SPF/DKIM records — the SMTP relay accepts the message but
  // Gmail's inbox filters drop it. Warn explicitly so this isn't debugged
  // for hours.
  const smtpUser = process.env.SMTP_USER || "";
  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || "";
  const smtpHost = process.env.SMTP_HOST || "";
  if (smtpHost && from) {
    // Extract bare address from "Display Name <addr@host>" form
    const fromAddrMatch = from.match(/<([^>]+)>/);
    const fromAddr = fromAddrMatch ? fromAddrMatch[1] : from;
    const fromDomain = fromAddr.split("@")[1]?.toLowerCase() ?? "";
    const userDomain = smtpUser.split("@")[1]?.toLowerCase() ?? "";

    if (smtpHost.includes("gmail.com") && fromDomain && fromDomain !== userDomain && fromDomain !== "gmail.com") {
      console.warn(
        "\n⚠️  [email] Possible deliverability issue:\n" +
        `   SMTP_HOST is Gmail (${smtpHost}) but EMAIL_FROM/SMTP_FROM is "${from}".\n` +
        `   Gmail will rewrite the envelope From to ${smtpUser}, and recipients'\n` +
        `   spam filters will often quarantine messages whose From: domain has\n` +
        `   no matching SPF/DKIM. Either set EMAIL_FROM to use the @${userDomain}\n` +
        `   address you authenticated with, or configure SPF+DKIM for ${fromDomain}.\n`
      );
    }
  }
}

app.listen(PORT, () => {
  validateConfig();
  console.log(`Server running on port ${PORT}`);
  startNepseScheduler();
  // Newsletter scheduler honours the admin-configured weekly_digest_enabled
  // toggle — if disabled in DB, this is a no-op until an admin enables it.
  applyEmailSettings().catch((err) =>
    console.error("[newsletter] Failed to apply email settings:", (err as Error).message)
  );
});

