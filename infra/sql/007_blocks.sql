-- "Block this person": a viewer stops seeing everything from one author. Accounts are anonymous,
-- so the app blocks through a request ("block the author of this request") and never learns who it is.
-- Rows go away with either account (ON DELETE CASCADE), so deleting an account erases its blocks.

CREATE TABLE IF NOT EXISTS blocks (
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
