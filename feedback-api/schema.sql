-- Alemanaka suggestion box — D1 (SQLite) schema.
-- Apply with:  npx wrangler d1 execute alemanaka-feedback --file=./schema.sql --remote

CREATE TABLE IF NOT EXISTS suggestions (
  id            TEXT PRIMARY KEY,
  created_at    TEXT NOT NULL,

  -- unverified : submitted, email link not yet clicked (never shown in the dashboard)
  -- new        : email confirmed, waiting for review
  -- accepted   : reviewed and acted on
  -- declined   : reviewed and set aside
  -- spam       : marked as abuse
  status        TEXT NOT NULL DEFAULT 'unverified',

  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  section       TEXT,
  body          TEXT NOT NULL,

  -- Salted hash, never the raw address. Used only to spot one person
  -- submitting under several names.
  ip_hash       TEXT,
  user_agent    TEXT,

  verify_token  TEXT,
  verified_at   TEXT,
  reviewed_at   TEXT,
  review_note   TEXT
);

CREATE INDEX IF NOT EXISTS idx_suggestions_status  ON suggestions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suggestions_email   ON suggestions(email);
CREATE INDEX IF NOT EXISTS idx_suggestions_ip      ON suggestions(ip_hash);
CREATE INDEX IF NOT EXISTS idx_suggestions_token   ON suggestions(verify_token);
