-- Push notifications when someone prays.
-- Notifications are throttled per request: the first prayer is delivered at once,
-- later prayers are counted and delivered together once the window has passed.

ALTER TABLE prayer_requests
  ADD COLUMN IF NOT EXISTS last_notified_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unnotified_prayers INTEGER NOT NULL DEFAULT 0
    CHECK (unnotified_prayers >= 0);
