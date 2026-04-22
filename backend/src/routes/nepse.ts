import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import {
  getCached, refreshNow, getSetting, setSetting, restartScheduler,
} from "../services/nepse.js";

const router = Router();

// ─── Public (all read from in-memory cache — O(1) per request) ────

router.get("/summary", (_req, res) => {
  const c = getCached();
  res.json({
    tradeDate: c.tradeDate,
    updatedAt: c.updatedAt,
    index: c.index,
  });
});

router.get("/prices", (_req, res) => {
  const c = getCached();
  res.json({ tradeDate: c.tradeDate, updatedAt: c.updatedAt, data: c.prices });
});

router.get("/sectors", (_req, res) => {
  const c = getCached();
  res.json({ tradeDate: c.tradeDate, updatedAt: c.updatedAt, data: c.sectors });
});

router.get("/gainers", (_req, res) => {
  const c = getCached();
  res.json({ tradeDate: c.tradeDate, updatedAt: c.updatedAt, data: c.gainers });
});

router.get("/losers", (_req, res) => {
  const c = getCached();
  res.json({ tradeDate: c.tradeDate, updatedAt: c.updatedAt, data: c.losers });
});

router.get("/turnover", (_req, res) => {
  const c = getCached();
  res.json({ tradeDate: c.tradeDate, updatedAt: c.updatedAt, data: c.turnover });
});

router.get("/ticker", (_req, res) => {
  const c = getCached();
  res.json({ tradeDate: c.tradeDate, updatedAt: c.updatedAt, data: c.ticker });
});

router.get("/stock/:symbol", (req, res) => {
  const c = getCached();
  const row = c.prices.find(
    (p) => p.symbol.toUpperCase() === req.params.symbol.toUpperCase()
  );
  if (!row) {
    res.status(404).json({ error: "Symbol not found" });
    return;
  }
  res.json({ tradeDate: c.tradeDate, updatedAt: c.updatedAt, data: row });
});

// ─── Admin ────────────────────────────────────────────────────────

router.get("/admin/settings", requireAuth, async (_req: AuthRequest, res) => {
  const [url, mins] = await Promise.all([
    getSetting("nepse_api_url", ""),
    getSetting("nepse_refresh_minutes", "5"),
  ]);
  const c = getCached();
  res.json({
    nepse_api_url: url,
    nepse_refresh_minutes: Number(mins) || 5,
    last_trade_date: c.tradeDate,
    last_updated_at: c.updatedAt,
    cached_symbols: c.prices.length,
    cached_sectors: c.sectors.length,
  });
});

router.put("/admin/settings", requireAuth, async (req: AuthRequest, res) => {
  const { nepse_api_url, nepse_refresh_minutes } = req.body ?? {};

  if (nepse_api_url !== undefined) {
    const url = String(nepse_api_url).trim();
    if (!/^https?:\/\//i.test(url)) {
      res.status(400).json({ error: "URL must start with http:// or https://" });
      return;
    }
    await setSetting("nepse_api_url", url);
  }

  if (nepse_refresh_minutes !== undefined) {
    const n = Number(nepse_refresh_minutes);
    if (!Number.isFinite(n) || n < 1 || n > 1440) {
      res.status(400).json({ error: "Refresh minutes must be between 1 and 1440" });
      return;
    }
    await setSetting("nepse_refresh_minutes", String(Math.floor(n)));
  }

  await restartScheduler();
  res.json({ success: true });
});

router.post("/admin/refresh", requireAuth, async (_req: AuthRequest, res) => {
  try {
    const c = await refreshNow();
    res.json({
      success: true,
      tradeDate: c.tradeDate,
      updatedAt: c.updatedAt,
      symbols: c.prices.length,
      sectors: c.sectors.length,
    });
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

export default router;
