-- Reports carry a network fingerprint and a trust flag, so a handful of throwaway
-- accounts cannot hide someone else's request. The fingerprint is a salted hash that
-- changes daily: good enough to count distinct networks within a day, useless for tracking.

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS ip_hash TEXT,
  ADD COLUMN IF NOT EXISTS counts_toward_hide BOOLEAN NOT NULL DEFAULT true;
