-- Migration 011: Full-Text Search index on the news table
-- Adds a generated tsvector column, a GIN index, and a trigger to keep the
-- vector current whenever title / excerpt / category / tags change.
-- The 'nepali' dictionary doesn't exist on most Postgres installs; we use
-- 'simple' as a safe universal fallback (no stop-words, no stemming — still
-- orders of magnitude faster than multi-column ILIKE at scale).

-- 1. Add the search vector column
ALTER TABLE news ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Populate it for all existing rows
UPDATE news
SET search_vector =
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(category, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(excerpt, '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(array_to_string(tags, ' '), '')), 'D');

-- 3. GIN index — makes ts_rank + @@ tsquery O(log n) instead of O(n)
CREATE INDEX IF NOT EXISTS idx_news_search_vector ON news USING GIN (search_vector);

-- 4. Trigger function — fires on INSERT and UPDATE of the indexed columns
CREATE OR REPLACE FUNCTION news_search_vector_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.category, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.excerpt, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.tags, ' '), '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Drop-and-recreate the trigger so re-running this migration is safe
DROP TRIGGER IF EXISTS news_search_vector_update ON news;
CREATE TRIGGER news_search_vector_update
  BEFORE INSERT OR UPDATE OF title, category, excerpt, tags
  ON news
  FOR EACH ROW EXECUTE FUNCTION news_search_vector_trigger();
