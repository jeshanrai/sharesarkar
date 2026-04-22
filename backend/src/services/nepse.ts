import pool from "../db.js";

// ─── Types matching https://nepsescraper.onrender.com/data ────────
export interface NepsePriceRow {
  trade_date: string;
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  ltp: number;
  vwap: number;
  volume: number;
  prev_close: number;
  turnover: number;
  transactions: number;
  diff_pct: number;
  high_52w: number;
  low_52w: number;
  scraped_at: string;
}

export interface NepseSectorRow {
  trade_date: string;
  index_id: number;
  index_name: string;
  open: number;
  high: number;
  low: number;
  close: number;
  change_abs: number;
  change_pct: number;
  turnover: number;
  scraped_at: string;
}

interface NepseApiPayload {
  prices: { trade_date: string; count: number; data: NepsePriceRow[] };
  sectors: { trade_date: string; count: number; data: NepseSectorRow[] };
}

// ─── In-memory cache of the derived, display-ready shape ──────────
// We fetch once (on interval) and pre-compute gainers/losers/turnover/summary.
// Every public request reads from this object — O(1), no DB hit.
interface MarketSummary {
  tradeDate: string | null;
  updatedAt: string | null;
  index: {
    value: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    prevClose: number;
    turnover: number;
    transactions: number;
    volume: number;
    advances: number;
    declines: number;
    unchanged: number;
  };
  prices: NepsePriceRow[];
  sectors: NepseSectorRow[];
  gainers: NepsePriceRow[];
  losers: NepsePriceRow[];
  turnover: NepsePriceRow[];
  ticker: NepsePriceRow[];
}

const emptySummary: MarketSummary = {
  tradeDate: null,
  updatedAt: null,
  index: {
    value: 0, change: 0, changePercent: 0,
    high: 0, low: 0, prevClose: 0,
    turnover: 0, transactions: 0, volume: 0,
    advances: 0, declines: 0, unchanged: 0,
  },
  prices: [], sectors: [], gainers: [], losers: [], turnover: [], ticker: [],
};

let cache: MarketSummary = emptySummary;
let refreshTimer: NodeJS.Timeout | null = null;
let inFlight: Promise<MarketSummary> | null = null;

// ─── Settings helpers ─────────────────────────────────────────────
// Treat "relation does not exist" (42P01) as "not configured yet" so the
// server can boot even before schema.sql has been applied.
function isMissingTable(err: unknown): boolean {
  return !!err && typeof err === "object" && (err as { code?: string }).code === "42P01";
}

export async function getSetting(key: string, fallback = ""): Promise<string> {
  try {
    const { rows } = await pool.query("SELECT value FROM app_settings WHERE key = $1", [key]);
    return rows[0]?.value ?? fallback;
  } catch (err) {
    if (isMissingTable(err)) return fallback;
    throw err;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  await pool.query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value]
  );
}

// ─── Derivation: turn raw payload into the display shape ──────────
function buildSummary(payload: NepseApiPayload): MarketSummary {
  const prices = payload.prices?.data ?? [];
  const sectors = payload.sectors?.data ?? [];
  const tradeDate = payload.prices?.trade_date ?? payload.sectors?.trade_date ?? null;

  let advances = 0, declines = 0, unchanged = 0;
  let totalTurnover = 0, totalVolume = 0, totalTxns = 0;
  for (const p of prices) {
    if (p.diff_pct > 0) advances++;
    else if (p.diff_pct < 0) declines++;
    else unchanged++;
    totalTurnover += Number(p.turnover) || 0;
    totalVolume += Number(p.volume) || 0;
    totalTxns += Number(p.transactions) || 0;
  }

  // NEPSE composite: look for "NEPSE Index" sector first, else fallback to weighted
  const composite = sectors.find((s) =>
    /nepse/i.test(s.index_name) && !/float|sens/i.test(s.index_name)
  ) ?? sectors[0];

  const index = composite ? {
    value: Number(composite.close) || 0,
    change: Number(composite.change_abs) || 0,
    changePercent: Number(composite.change_pct) || 0,
    high: Number(composite.high) || 0,
    low: Number(composite.low) || 0,
    prevClose: (Number(composite.close) || 0) - (Number(composite.change_abs) || 0),
    turnover: totalTurnover,
    transactions: totalTxns,
    volume: totalVolume,
    advances, declines, unchanged,
  } : { ...emptySummary.index, advances, declines, unchanged, turnover: totalTurnover, volume: totalVolume, transactions: totalTxns };

  // Sort once, slice for each view
  const byPctDesc = [...prices].sort((a, b) => Number(b.diff_pct) - Number(a.diff_pct));
  const byTurnoverDesc = [...prices].sort((a, b) => Number(b.turnover) - Number(a.turnover));

  const gainers = byPctDesc.filter((p) => Number(p.diff_pct) > 0).slice(0, 20);
  const losers = byPctDesc.filter((p) => Number(p.diff_pct) < 0).reverse().slice(0, 20);
  const turnover = byTurnoverDesc.slice(0, 20);
  const ticker = byTurnoverDesc.slice(0, 30);

  return {
    tradeDate,
    updatedAt: new Date().toISOString(),
    index, prices, sectors,
    gainers, losers, turnover, ticker,
  };
}

// ─── Persist to DB (UPSERT per trade_date/symbol) ─────────────────
async function persist(payload: NepseApiPayload): Promise<void> {
  const prices = payload.prices?.data ?? [];
  const sectors = payload.sectors?.data ?? [];
  const client = await pool.connect();
  try {
    // Skip cleanly if schema hasn't been applied yet
    const { rows } = await client.query(
      "SELECT to_regclass('public.nepse_prices') IS NOT NULL AS has_tables"
    );
    if (!rows[0]?.has_tables) {
      client.release();
      console.warn("[nepse] skipping persist — run schema.sql to create nepse_prices/nepse_sectors");
      return;
    }

    await client.query("BEGIN");

    for (const p of prices) {
      await client.query(
        `INSERT INTO nepse_prices (trade_date, symbol, open, high, low, close, ltp, vwap, volume, prev_close, turnover, transactions, diff_pct, high_52w, low_52w, scraped_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, NOW())
         ON CONFLICT (trade_date, symbol) DO UPDATE SET
           open=EXCLUDED.open, high=EXCLUDED.high, low=EXCLUDED.low, close=EXCLUDED.close,
           ltp=EXCLUDED.ltp, vwap=EXCLUDED.vwap, volume=EXCLUDED.volume, prev_close=EXCLUDED.prev_close,
           turnover=EXCLUDED.turnover, transactions=EXCLUDED.transactions, diff_pct=EXCLUDED.diff_pct,
           high_52w=EXCLUDED.high_52w, low_52w=EXCLUDED.low_52w, scraped_at=NOW()`,
        [
          p.trade_date, p.symbol,
          p.open ?? 0, p.high ?? 0, p.low ?? 0, p.close ?? 0,
          p.ltp ?? 0, p.vwap ?? 0, p.volume ?? 0, p.prev_close ?? 0,
          p.turnover ?? 0, p.transactions ?? 0, p.diff_pct ?? 0,
          p.high_52w ?? 0, p.low_52w ?? 0,
        ]
      );
    }

    for (const s of sectors) {
      await client.query(
        `INSERT INTO nepse_sectors (trade_date, index_id, index_name, open, high, low, close, change_abs, change_pct, turnover, scraped_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW())
         ON CONFLICT (trade_date, index_id) DO UPDATE SET
           index_name=EXCLUDED.index_name, open=EXCLUDED.open, high=EXCLUDED.high, low=EXCLUDED.low,
           close=EXCLUDED.close, change_abs=EXCLUDED.change_abs, change_pct=EXCLUDED.change_pct,
           turnover=EXCLUDED.turnover, scraped_at=NOW()`,
        [
          s.trade_date, s.index_id, s.index_name,
          s.open ?? 0, s.high ?? 0, s.low ?? 0, s.close ?? 0,
          s.change_abs ?? 0, s.change_pct ?? 0, s.turnover ?? 0,
        ]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ─── Hydrate cache from DB (cold start) ───────────────────────────
async function hydrateFromDb(): Promise<void> {
  try {
    const { rows: priceDate } = await pool.query("SELECT MAX(trade_date) AS d FROM nepse_prices");
    return await hydrateWithLatest(priceDate[0]?.d);
  } catch (err) {
    if (isMissingTable(err)) {
      console.warn("[nepse] schema not applied yet — tables will be created after running schema.sql");
      return;
    }
    throw err;
  }
}

async function hydrateWithLatest(latest: unknown): Promise<void> {
  if (!latest) return;

  const { rows: prices } = await pool.query(
    "SELECT * FROM nepse_prices WHERE trade_date = $1",
    [latest]
  );
  const { rows: sectors } = await pool.query(
    "SELECT * FROM nepse_sectors WHERE trade_date = $1 ORDER BY index_id",
    [latest]
  );
  if (!prices.length) return;

  const payload: NepseApiPayload = {
    prices: { trade_date: String(latest), count: prices.length, data: prices as NepsePriceRow[] },
    sectors: { trade_date: String(latest), count: sectors.length, data: sectors as NepseSectorRow[] },
  };
  cache = buildSummary(payload);
}

// ─── Fetch from the upstream scraper URL ──────────────────────────
async function fetchUpstream(): Promise<NepseApiPayload> {
  const url = await getSetting("nepse_api_url", "https://nepsescraper.onrender.com/data");
  if (!url) throw new Error("NEPSE API URL is not configured");

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Upstream returned ${res.status}`);
  return (await res.json()) as NepseApiPayload;
}

// ─── Public refresh (single-flight) ───────────────────────────────
export async function refreshNow(): Promise<MarketSummary> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const payload = await fetchUpstream();
      await persist(payload).catch((e) => console.error("[nepse] persist failed:", e));
      cache = buildSummary(payload);
      return cache;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function getCached(): MarketSummary {
  return cache;
}

// ─── Scheduler ────────────────────────────────────────────────────
async function scheduleNext(): Promise<void> {
  if (refreshTimer) clearTimeout(refreshTimer);
  let mins = 5;
  try {
    const minsRaw = await getSetting("nepse_refresh_minutes", "5");
    mins = Math.max(1, Number(minsRaw) || 5);
  } catch (e) {
    console.error("[nepse] failed to read refresh interval, defaulting to 5 min:", (e as Error).message);
  }
  refreshTimer = setTimeout(() => {
    refreshNow()
      .catch((e) => console.error("[nepse] scheduled refresh failed:", (e as Error).message))
      .finally(() => {
        scheduleNext().catch((e) =>
          console.error("[nepse] reschedule failed:", (e as Error).message)
        );
      });
  }, mins * 60 * 1000);
}

export async function startNepseScheduler(): Promise<void> {
  try {
    await hydrateFromDb();
    if (cache.prices.length) console.log("[nepse] cache hydrated from DB");
  } catch (e) {
    console.error("[nepse] hydrate failed:", (e as Error).message);
  }
  refreshNow().catch((e) => console.error("[nepse] initial refresh failed:", e.message));
  scheduleNext().catch((e) =>
    console.error("[nepse] initial scheduling failed:", (e as Error).message)
  );
}

export async function restartScheduler(): Promise<void> {
  await scheduleNext();
}
