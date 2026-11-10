-- Scheduled starter posts: an admin switch and a daily limit for each language, and a marker
-- on the requests the scheduler publishes (they are also is_seed, see 009).

CREATE TABLE IF NOT EXISTS autopost_settings (
  language    TEXT PRIMARY KEY CHECK (language IN ('en', 'es', 'fr', 'ro', 'uk', 'ru')),
  enabled     BOOLEAN NOT NULL DEFAULT false,
  daily_max   INTEGER NOT NULL DEFAULT 2 CHECK (daily_max BETWEEN 0 AND 20),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO autopost_settings (language) VALUES ('en'), ('es'), ('fr'), ('ro'), ('uk'), ('ru')
ON CONFLICT (language) DO NOTHING;

ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS autoposted BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS prayer_requests_autopost_idx ON prayer_requests (language, created_at) WHERE autoposted;
