-- An evening reminder that new prayer requests are waiting, for people who ask for it.
-- digest_language is NULL when the person has not turned it on. The phone's offset from UTC
-- (in minutes) places "evening" in the person's own time zone; the app sends it again at every
-- launch, so travel and daylight saving follow along.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS digest_language TEXT
    CHECK (digest_language IN ('en', 'es', 'fr', 'ro', 'uk', 'ru')),
  ADD COLUMN IF NOT EXISTS digest_utc_offset INTEGER NOT NULL DEFAULT 0
    CHECK (digest_utc_offset BETWEEN -840 AND 840),
  ADD COLUMN IF NOT EXISTS last_digest_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS users_digest
  ON users (digest_language)
  WHERE digest_language IS NOT NULL AND push_token IS NOT NULL;
