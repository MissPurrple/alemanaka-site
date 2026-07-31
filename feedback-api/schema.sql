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

  -- What the person is bringing:
  --   keletso     : advice
  --   litlatsetso : additions
  --   likopo      : requests and questions
  kind          TEXT NOT NULL DEFAULT 'keletso',

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
CREATE INDEX IF NOT EXISTS idx_suggestions_kind    ON suggestions(kind, status);
CREATE INDEX IF NOT EXISTS idx_suggestions_email   ON suggestions(email);
CREATE INDEX IF NOT EXISTS idx_suggestions_ip      ON suggestions(ip_hash);
CREATE INDEX IF NOT EXISTS idx_suggestions_token   ON suggestions(verify_token);

-- Mailing list for the printed calendar. Double opt-in: an address only counts
-- as subscribed once the link in the email has been clicked, so nobody can be
-- signed up by somebody else.
CREATE TABLE IF NOT EXISTS subscribers (
  email          TEXT PRIMARY KEY,
  created_at     TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',  -- pending | subscribed | unsubscribed
  confirmed_at   TEXT,
  ip_hash        TEXT,
  verify_token   TEXT
);

CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscribers_token  ON subscribers(verify_token);
