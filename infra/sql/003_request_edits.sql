-- Authors can fix typos. Each edit is capped, marked as edited, and the previous
-- version is kept so moderators can see what a reported request used to say.

ALTER TABLE prayer_requests
  ADD COLUMN IF NOT EXISTS edit_count INTEGER NOT NULL DEFAULT 0 CHECK (edit_count >= 0),
  ADD COLUMN IF NOT EXISTS edited_at  TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS request_edits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  message       TEXT NOT NULL,
  contactable   BOOLEAN NOT NULL,
  phone         TEXT,
  email         TEXT,
  replaced_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS request_edits_request_idx
  ON request_edits (request_id, replaced_at DESC);
