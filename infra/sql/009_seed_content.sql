-- Starter content: a small set of example requests so the first visitors do not see an empty
-- feed. Every seeded row is marked, so it can be counted, kept out of the metrics, and removed
-- in one statement once there is enough real content:
--   DELETE FROM prayer_requests WHERE is_seed;  DELETE FROM users WHERE is_seed;

ALTER TABLE users            ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE prayer_requests  ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS prayer_requests_seed_idx ON prayer_requests (language) WHERE is_seed;
