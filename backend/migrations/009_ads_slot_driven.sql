-- 009_ads_slot_driven.sql
-- Move to slot-driven rendering (industry standard): each ad targets
-- exactly one placement, with no wildcard fallback inventory and no
-- variant-level layout hint. The slot decides the layout, not the ad.
--
-- Changes:
--   1. Adds `article_top` to the supported placement vocabulary by
--      backfilling the surface — no schema change needed since the
--      column is free-form TEXT, validation lives in the API.
--   2. Rebuckets any existing `all_news` ads into `article_sidebar`
--      so we don't lose paid inventory. Admins can re-target them
--      from /admin/ads if they meant a different slot.
--   3. Drops the `variant` column. Layout is now derived from the
--      slot in the renderer; storing it per-ad was duplicated state.

-- Rebucket all_news inventory before adding the unique constraint
-- collisions could happen with — UPDATE first, then check.
UPDATE advertisements
SET placement = 'article_sidebar'
WHERE placement = 'all_news';

-- Resolve any (placement, sort_order) collisions the rebucketing
-- might have introduced. Same row-number bump pattern as 008.
WITH ranked AS (
  SELECT
    id,
    placement,
    sort_order,
    ROW_NUMBER() OVER (
      PARTITION BY placement, sort_order
      ORDER BY created_at, id
    ) - 1 AS bump
  FROM advertisements
)
UPDATE advertisements a
SET sort_order = a.sort_order + r.bump
FROM ranked r
WHERE a.id = r.id AND r.bump > 0;

-- Drop the variant column. Postgres requires CASCADE if anything
-- references it; nothing does in this codebase, so a plain DROP
-- is enough. IF EXISTS keeps the migration idempotent.
ALTER TABLE advertisements
  DROP COLUMN IF EXISTS variant;
