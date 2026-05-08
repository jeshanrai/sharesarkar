-- Advertisements — admin-curated promotional creatives shown on news pages.
-- Apply with:  psql -d sharesanskar -f migrations/003_advertisements.sql

CREATE TABLE IF NOT EXISTS advertisements (
  id SERIAL PRIMARY KEY,
  -- Display name shown only in the admin panel, never to readers.
  name TEXT NOT NULL,
  -- Public URL of the creative. Supports static images (jpg/png/webp) and
  -- animated GIFs. Can be a backend-served path (/uploads/...) or a fully
  -- qualified external URL.
  image_url TEXT NOT NULL,
  -- Optional click-through destination. NULL = creative is non-interactive.
  link_url TEXT,
  -- Alt text for screen readers; falls back to `name` if blank.
  alt_text TEXT NOT NULL DEFAULT '',
  -- Where the ad should appear. v1 supports:
  --   'news_listing'  → /news index, below the article grid
  --   'news_article'  → /news/[id] sidebar, below the related rail
  --   'all_news'      → both of the above (default for convenience)
  placement TEXT NOT NULL DEFAULT 'all_news',
  -- Only ads with is_active=true are returned to the public site. The admin
  -- can stage drafts without exposing them.
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  -- Lower numbers render first when multiple active ads share a placement.
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ads_active_placement
  ON advertisements(is_active, placement, sort_order);
