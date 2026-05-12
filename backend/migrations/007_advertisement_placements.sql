-- 007_advertisement_placements.sql
-- Split the single "news_article" bucket into three discrete slots
-- (sidebar / inline / footer) so admins can target each surface
-- independently. Adds a `variant` column for layout hints (banner /
-- sidebar / inline) without imposing IAB sizes — creatives are still
-- static images that adapt to the slot's container.
--
-- Legacy keys (`news_article`, `all_news`, `news_listing`) remain
-- accepted by the API as aliases for one release cycle. Existing rows
-- with `placement = 'news_article'` are backfilled to `article_sidebar`,
-- which matches today's rendering behavior.

ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS variant TEXT NOT NULL DEFAULT 'banner';

-- Backfill: anything tagged news_article today renders in the sidebar,
-- so map it there. `all_news` is left untouched — the API expands it at
-- query time across both listing and article surfaces.
UPDATE advertisements
SET placement = 'article_sidebar'
WHERE placement = 'news_article';

-- Refresh the helper index to include the new column shape. Postgres'
-- IF NOT EXISTS makes this safe to re-run.
DROP INDEX IF EXISTS idx_ads_active_placement;
CREATE INDEX IF NOT EXISTS idx_ads_active_placement
  ON advertisements(is_active, placement, sort_order);
