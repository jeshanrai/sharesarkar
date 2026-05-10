-- 005_videos.sql
-- Embedded short-form videos shown in the "ShareSanskar Shorts" rail.
-- Admin manages the list via /admin/videos; the public site reads
-- from /api/videos. Embeds are rendered client-side using the
-- platform's official embed script (TikTok/Instagram/Facebook).

CREATE TABLE IF NOT EXISTS videos (
  id SERIAL PRIMARY KEY,
  -- Platform driving the embed format. Free-form so future platforms
  -- (YouTube Shorts, etc.) can be added without a schema change, but
  -- the API validates against a known list.
  platform TEXT NOT NULL,
  -- Canonical URL of the post on the source platform. We re-derive
  -- the embed payload at render time from this URL.
  url TEXT NOT NULL,
  -- Optional caption shown beneath the embed in the rail.
  caption TEXT NOT NULL DEFAULT '',
  -- Lower numbers render first.
  sort_order INTEGER NOT NULL DEFAULT 0,
  -- Drafts can be saved without exposing them to the public site.
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_active_sort
  ON videos(is_active, sort_order);
