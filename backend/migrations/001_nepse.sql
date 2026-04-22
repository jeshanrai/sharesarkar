-- NEPSE live-data migration
-- Apply with:  psql -d sharesanskar -f migrations/001_nepse.sql

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO app_settings (key, value) VALUES
  ('nepse_api_url', 'https://nepsescraper.onrender.com/data'),
  ('nepse_refresh_minutes', '5')
ON CONFLICT (key) DO NOTHING;

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
