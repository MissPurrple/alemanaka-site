-- Adds the kind column to an existing installation.
-- Fresh installs get it from schema.sql and do not need this.
--
-- Apply with:
--   npx wrangler d1 execute alemanaka-feedback --file=./migrations/001-add-kind.sql --remote

ALTER TABLE suggestions ADD COLUMN kind TEXT NOT NULL DEFAULT 'keletso';
CREATE INDEX IF NOT EXISTS idx_suggestions_kind ON suggestions(kind, status);
