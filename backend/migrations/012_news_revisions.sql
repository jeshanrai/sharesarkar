-- Migration 012: Article Revision History
-- Creates a news_revisions table that stores a snapshot of every article
-- before it is overwritten. Admins can browse and restore past versions.

CREATE TABLE IF NOT EXISTS news_revisions (
  id            SERIAL PRIMARY KEY,
  news_id       INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  -- Snapshot of the key editorial fields at the time of the edit
  title         TEXT    NOT NULL DEFAULT '',
  slug          TEXT    NOT NULL DEFAULT '',
  excerpt       TEXT    NOT NULL DEFAULT '',
  content       TEXT    NOT NULL DEFAULT '',
  author        TEXT    NOT NULL DEFAULT '',
  image_url     TEXT    NOT NULL DEFAULT '',
  category      TEXT    NOT NULL DEFAULT '',
  categories    TEXT[]  NOT NULL DEFAULT '{}',
  tags          TEXT[]  NOT NULL DEFAULT '{}',
  section       TEXT    NOT NULL DEFAULT 'latest',
  is_published  BOOLEAN NOT NULL DEFAULT TRUE,
  -- Who made the change that caused this snapshot to be created
  changed_by_id   INTEGER,
  changed_by_role TEXT    NOT NULL DEFAULT 'admin',
  -- When the snapshot was captured (i.e. when the update was saved)
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_revisions_news_id
  ON news_revisions (news_id, created_at DESC);
