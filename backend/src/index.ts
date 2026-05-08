import "dotenv/config";
import express from "express";
import cors from "cors";
import stockRoutes from "./routes/stocks.js";
import authRoutes from "./routes/auth.js";

import newsRoutes from "./routes/news.js";
import ipoRoutes from "./routes/ipo.js";
import subscriberRoutes from "./routes/subscribers.js";
import nepseRoutes from "./routes/nepse.js";
import mediaRoutes from "./routes/media.js";
import adsRoutes from "./routes/ads.js";
import { startNepseScheduler } from "./services/nepse.js";
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

app.use("/api/stocks", stockRoutes);
app.use("/api/admin", authRoutes);

app.use("/api/news", newsRoutes);
app.use("/api/ipo", ipoRoutes);
app.use("/api/subscribers", subscriberRoutes);
app.use("/api/nepse", nepseRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/ads", adsRoutes);

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

// Convert body-parser's "PayloadTooLargeError" into a clean JSON 413 so the
// admin UI can show the API's error message instead of an HTML stack trace.
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
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
  next(err);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startNepseScheduler();
});
