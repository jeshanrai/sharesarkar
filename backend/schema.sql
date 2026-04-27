-- ShareSanskar Database Schema (PostgreSQL)
-- 1. Create database:  createdb sharesanskar
-- 2. Run schema:       psql -d sharesanskar -f schema.sql
-- 3. Seed data:        npm run seed

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);



CREATE TABLE IF NOT EXISTS news (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  excerpt TEXT NOT NULL,
  content TEXT DEFAULT '',
  author TEXT DEFAULT 'ShareSanskar Team',
  image_url TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Market',
  section TEXT NOT NULL DEFAULT 'latest',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  read_time TEXT DEFAULT NULL,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- section values: hero_main, hero_stories, latest, trending, featured

CREATE INDEX IF NOT EXISTS idx_news_section ON news(section);
CREATE INDEX IF NOT EXISTS idx_news_published ON news(is_published);
CREATE INDEX IF NOT EXISTS idx_news_sort ON news(section, sort_order);
CREATE INDEX IF NOT EXISTS idx_news_slug ON news(slug);
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);

CREATE TABLE IF NOT EXISTS ipo_listings (
  id SERIAL PRIMARY KEY,
  company_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  sector TEXT NOT NULL DEFAULT 'Others',
  share_type TEXT NOT NULL DEFAULT 'IPO',
  units BIGINT DEFAULT 0,
  price_per_unit NUMERIC(10,2) DEFAULT 100,
  total_amount TEXT DEFAULT '',
  open_date DATE,
  close_date DATE,
  listing_date DATE,
  status TEXT NOT NULL DEFAULT 'upcoming',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- status values: upcoming, open, closed, listed
CREATE INDEX IF NOT EXISTS idx_ipo_status ON ipo_listings(status);

CREATE TABLE IF NOT EXISTS subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT,
  phone TEXT,
  subscription_type TEXT NOT NULL DEFAULT 'newsletter',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscribers_type ON subscribers(subscription_type);

-- ─── NEPSE live data ─────────────────────────────────────────────
-- Admin-configurable runtime settings (NEPSE scraper URL, refresh interval, etc.)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO app_settings (key, value) VALUES
  ('nepse_api_url', 'https://nepsescraper.onrender.com/data'),
  ('nepse_refresh_minutes', '5')
ON CONFLICT (key) DO NOTHING;

-- Per-symbol daily snapshot (one row per symbol per trade_date)
CREATE TABLE IF NOT EXISTS nepse_prices (
  trade_date DATE NOT NULL,
  symbol TEXT NOT NULL,
  open NUMERIC(14,2) DEFAULT 0,
  high NUMERIC(14,2) DEFAULT 0,
  low NUMERIC(14,2) DEFAULT 0,
  close NUMERIC(14,2) DEFAULT 0,
  ltp NUMERIC(14,2) DEFAULT 0,
  vwap NUMERIC(14,2) DEFAULT 0,
  volume BIGINT DEFAULT 0,
  prev_close NUMERIC(14,2) DEFAULT 0,
  turnover NUMERIC(18,2) DEFAULT 0,
  transactions INTEGER DEFAULT 0,
  diff_pct NUMERIC(8,2) DEFAULT 0,
  high_52w NUMERIC(14,2) DEFAULT 0,
  low_52w NUMERIC(14,2) DEFAULT 0,
  scraped_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (trade_date, symbol)
);

CREATE INDEX IF NOT EXISTS idx_nepse_prices_date ON nepse_prices(trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_nepse_prices_symbol ON nepse_prices(symbol);

-- Per-sector / sub-index daily snapshot
CREATE TABLE IF NOT EXISTS nepse_sectors (
  trade_date DATE NOT NULL,
  index_id INTEGER NOT NULL,
  index_name TEXT NOT NULL,
  open NUMERIC(14,2) DEFAULT 0,
  high NUMERIC(14,2) DEFAULT 0,
  low NUMERIC(14,2) DEFAULT 0,
  close NUMERIC(14,2) DEFAULT 0,
  change_abs NUMERIC(14,2) DEFAULT 0,
  change_pct NUMERIC(8,2) DEFAULT 0,
  turnover NUMERIC(18,2) DEFAULT 0,
  scraped_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (trade_date, index_id)
);

CREATE INDEX IF NOT EXISTS idx_nepse_sectors_date ON nepse_sectors(trade_date DESC);
