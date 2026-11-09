-- Moderation workflow: a report can be reviewed (so the queue empties), and every moderator
-- action is recorded. The audit log holds ids only, never request text, and goes with the
-- moderator's or the request's account when either is deleted.

ALTER TABLE reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS reports_unreviewed_idx ON reports (created_at) WHERE reviewed_at IS NULL;

CREATE TABLE IF NOT EXISTS moderation_actions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL CHECK (action IN ('hide', 'restore', 'dismiss', 'remove', 'ban', 'unban')),
  request_id  UUID REFERENCES prayer_requests(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS moderation_actions_created_idx ON moderation_actions (created_at DESC);
