-- The optional phone and email on a request were never shown to anyone but the author and had
-- no use, so they are gone: collecting less is the safer default. This erases what was stored.

ALTER TABLE prayer_requests
  DROP COLUMN IF EXISTS contactable,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS email;

ALTER TABLE request_edits
  DROP COLUMN IF EXISTS contactable,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS email;
