-- Media library — central catalog of images for articles.
-- Apply with:  psql -d sharesanskar -f migrations/002_media.sql

CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY,
  -- Filename inside the storage adapter (e.g. "<uuid>.jpg"). NULL for items
  -- catalogued from external URLs (we don't copy the bytes).
  storage_key TEXT,
  -- Set when the row references an off-site image. Mutually exclusive with
  -- storage_key in spirit; one of the two is always populated.
  external_url TEXT,
  -- Original filename at upload time, for display only. Never used to build a path.
  original_name TEXT,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT,
  width INTEGER,
  height INTEGER,
  -- sha256 of the file contents — enables dedup on re-upload of identical images.
  -- NULL for external entries we never read.
  checksum TEXT,
  alt_text TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  uploaded_by INTEGER,           -- admin or author user id (FK skipped — refs cross-table)
  uploader_role TEXT,            -- 'admin' | 'author' | 'system'
  -- 'upload' = new admin upload, 'imported' = materialised from an article body,
  -- 'external' = catalogued URL, no bytes stored.
  source TEXT NOT NULL DEFAULT 'upload',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Dedup safety net — same image bytes uploaded twice resolve to the same row.
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_checksum_unique
  ON media(checksum)
  WHERE checksum IS NOT NULL;

-- Search ergonomics — admin library searches by filename and alt text.
CREATE INDEX IF NOT EXISTS idx_media_original_name ON media(original_name);
CREATE INDEX IF NOT EXISTS idx_media_alt_text ON media(alt_text);
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at DESC);
