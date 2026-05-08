-- Multi-category, tags, and SEO fields for news articles.
-- Apply with:  psql -d sharesanskar -f migrations/002_article_taxonomy_seo.sql
--
-- The existing single `category` column is kept as the *primary* category
-- (used for hero badges, breadcrumbs, and related-article lookups). The new
-- `categories` array stores any additional categories an editor selects so
-- multi-category filtering and discovery work without breaking older code.

ALTER TABLE news ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE news ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE news ADD COLUMN IF NOT EXISTS meta_title TEXT NOT NULL DEFAULT '';
ALTER TABLE news ADD COLUMN IF NOT EXISTS meta_description TEXT NOT NULL DEFAULT '';
ALTER TABLE news ADD COLUMN IF NOT EXISTS og_image_url TEXT NOT NULL DEFAULT '';
ALTER TABLE news ADD COLUMN IF NOT EXISTS canonical_url TEXT NOT NULL DEFAULT '';
ALTER TABLE news ADD COLUMN IF NOT EXISTS noindex BOOLEAN NOT NULL DEFAULT FALSE;

-- GIN indexes so `WHERE $1 = ANY(categories)` and `WHERE $1 = ANY(tags)`
-- can use an index instead of a sequential scan once volumes grow.
CREATE INDEX IF NOT EXISTS idx_news_categories ON news USING GIN (categories);
CREATE INDEX IF NOT EXISTS idx_news_tags ON news USING GIN (tags);

-- Backfill: any existing article's primary category should also live in the
-- categories array so multi-category queries return it. Idempotent — re-running
-- does not duplicate entries.
UPDATE news
SET categories = ARRAY[category]
WHERE category IS NOT NULL
  AND category <> ''
  AND NOT (category = ANY(categories));
