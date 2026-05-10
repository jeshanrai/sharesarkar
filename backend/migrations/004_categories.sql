-- 004_categories.sql
-- Hierarchical category tree for news articles.
-- Each category can have a parent_id referencing another category,
-- enabling nested structures like: Sports → Football → Women's Football.
-- ON DELETE RESTRICT prevents deleting a parent that still has children.

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  parent_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- Seed root-level categories from the existing SEED_CATEGORIES list
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Market',     'market',     0),
  ('Banking',    'banking',    1),
  ('Hydropower', 'hydropower', 2),
  ('IPO',        'ipo',        3),
  ('Insurance',  'insurance',  4),
  ('Analysis',   'analysis',   5),
  ('Education',  'education',  6),
  ('Regulation', 'regulation', 7),
  ('Breaking',   'breaking',   8)
ON CONFLICT (slug) DO NOTHING;
