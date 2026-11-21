-- Expo answers a send with a ticket. Whether the phone's push service (FCM or APNs) accepted
-- it is only known later, from a receipt. Tickets are kept until their receipt is checked, so
-- tokens of uninstalled apps can be forgotten.

CREATE TABLE IF NOT EXISTS push_tickets (
  ticket_id   TEXT PRIMARY KEY,
  token       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_tickets_created_at ON push_tickets (created_at);

-- Finding the requests whose held prayers are due.
CREATE INDEX IF NOT EXISTS prayer_requests_unnotified
  ON prayer_requests (last_notified_at)
  WHERE unnotified_prayers > 0;
