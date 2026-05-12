-- 008_advertisement_sizes.sql
-- Add enforced size metadata so each creative declares its rendered
-- dimensions (300x250, 728x90, etc.). The API and admin upload pipeline
-- validate the file's actual pixel dimensions against this value, and
-- the slot routing layer uses it to pick only size-compatible creatives.
--
-- Also enforces UNIQUE (placement, sort_order): two ads in the same
-- placement can't share a sort_order anymore, so rotation order is
-- always deterministic when ORDER BY sort_order is the primary key.

ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS size TEXT NOT NULL DEFAULT '300x250';

-- Resolve any existing sort_order collisions within a placement before
-- we add the constraint, otherwise the migration fails on the first
-- duplicate. We bump colliding rows by row_number, preserving the
-- original order via created_at as a tiebreaker.
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

-- Constraint name kept short and explicit so future migrations can
-- reference it by name when dropping/altering.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'advertisements_placement_sort_order_key'
  ) THEN
    ALTER TABLE advertisements
      ADD CONSTRAINT advertisements_placement_sort_order_key
      UNIQUE (placement, sort_order);
  END IF;
END
$$;
