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

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_holdings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  buy_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sector TEXT NOT NULL DEFAULT 'Others',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio_holdings(user_id);

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
