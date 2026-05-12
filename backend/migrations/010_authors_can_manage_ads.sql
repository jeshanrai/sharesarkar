-- 010_authors_can_manage_ads.sql
-- Grant authors a per-account permission to manage advertisements,
-- mirroring the existing can_manage_videos flag. Admins control this
-- from /admin/authors; the ads route checks it before any write.

ALTER TABLE authors
  ADD COLUMN IF NOT EXISTS can_manage_ads BOOLEAN NOT NULL DEFAULT FALSE;
