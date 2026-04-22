import "dotenv/config";
import express from "express";
import cors from "cors";
import stockRoutes from "./routes/stocks.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import portfolioRoutes from "./routes/portfolio.js";
import newsRoutes from "./routes/news.js";
import ipoRoutes from "./routes/ipo.js";
import subscriberRoutes from "./routes/subscribers.js";
import nepseRoutes from "./routes/nepse.js";
import { startNepseScheduler } from "./services/nepse.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/stocks", stockRoutes);
app.use("/api/admin", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/portfolio", portfolioRoutes);
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
