-- Migration 014: Newsletter — Phase 1
-- Adds support for scheduled weekly digest emails with one-click
-- unsubscribe links. Schedule and curation strategy are admin-configurable.

-- ─── Subscribers: lifecycle and per-recipient tokens ───────────────
ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Unique opaque token used in unsubscribe links. NULL initially for
-- existing rows; backfilled below. NULLs are allowed by the UNIQUE
-- constraint, so the partial-index pattern isn't needed.
ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT UNIQUE;

ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS last_emailed_at TIMESTAMP;

-- Backfill unsubscribe tokens for any existing rows that don't have one.
-- We use gen_random_uuid() rather than encode(gen_random_bytes(),…) to
-- avoid requiring pgcrypto — uuid-ossp is already standard on PG 13+.
-- The hyphens are stripped and 'u_' prefixed to keep URLs compact.
UPDATE subscribers
   SET unsubscribe_token = 'u_' || replace(gen_random_uuid()::text, '-', '')
 WHERE unsubscribe_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_subscribers_active
  ON subscribers(is_active);

-- ─── Email settings (single-row config) ────────────────────────────
-- One row, id=1, enforced by a CHECK. Pattern is simpler than a
-- key/value table for typed scalar settings and lets the app rely on
-- `SELECT * FROM email_settings` always returning exactly one row.
CREATE TABLE IF NOT EXISTS email_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  -- Master kill switch. Defaults OFF so a fresh deploy never accidentally
  -- emails subscribers before the admin reviews the digest preview.
  weekly_digest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  -- Day of week the cron fires (0=Sunday … 6=Saturday). Default = Monday.
  weekly_digest_day_of_week SMALLINT NOT NULL DEFAULT 1
    CHECK (weekly_digest_day_of_week BETWEEN 0 AND 6),
  -- Hour of day in Asia/Kathmandu local time (0–23). Default = 6 AM.
  weekly_digest_hour SMALLINT NOT NULL DEFAULT 6
    CHECK (weekly_digest_hour BETWEEN 0 AND 23),
  -- 'auto' = pull last 7 days of published news; 'manual' = use curated picks.
  digest_curation_mode TEXT NOT NULL DEFAULT 'auto'
    CHECK (digest_curation_mode IN ('auto', 'manual')),
  -- Audit trail
  weekly_digest_last_sent_at TIMESTAMP,
  weekly_digest_last_sent_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed the single row if missing
INSERT INTO email_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ─── Manual curation picks (for the next digest only) ──────────────
-- When digest_curation_mode = 'manual', the digest builder pulls article
-- ids from this table instead of the last-7-days query. Rows are cleared
-- automatically after a successful send.
CREATE TABLE IF NOT EXISTS newsletter_picks (
  news_id  INTEGER PRIMARY KEY REFERENCES news(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_picks_sort
  ON newsletter_picks(sort_order);
