-- 006_admin_full_name.sql
-- Give admin accounts an editable display name so the byline shown on
-- articles they publish can be customized from /admin/settings instead
-- of being hardcoded to "ShareSanskar Team".

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT 'ShareSanskar';
