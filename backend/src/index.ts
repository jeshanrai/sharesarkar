import "dotenv/config";
import express from "express";
import cors from "cors";
import stockRoutes from "./routes/stocks.js";
import authRoutes from "./routes/auth.js";

import newsRoutes from "./routes/news.js";
import ipoRoutes from "./routes/ipo.js";
import subscriberRoutes from "./routes/subscribers.js";
import nepseRoutes from "./routes/nepse.js";
import { startNepseScheduler } from "./services/nepse.js";

const app = express();
const PORT = process.env.PORT || 5000;

const stripSlash = (s: string) => s.replace(/\/+$/, "");
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((o) => stripSlash(o.trim()))
  .filter(Boolean);

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
app.use(express.json());

app.use("/api/stocks", stockRoutes);
app.use("/api/admin", authRoutes);

app.use("/api/news", newsRoutes);
app.use("/api/ipo", ipoRoutes);
app.use("/api/subscribers", subscriberRoutes);
app.use("/api/nepse", nepseRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startNepseScheduler();
});
