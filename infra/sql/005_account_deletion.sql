-- Deleting an account must not be blocked by a moderator having banned someone:
-- if the moderator's account goes, the ban stays and only the "who banned" link is cleared.

ALTER TABLE bans DROP CONSTRAINT IF EXISTS bans_created_by_fkey;
ALTER TABLE bans
  ADD CONSTRAINT bans_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
