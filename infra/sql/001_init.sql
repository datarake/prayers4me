-- Prayers4me core schema
-- Moderation is first-class: status, reports, bans, rate buckets.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid  TEXT NOT NULL UNIQUE,
  language      TEXT NOT NULL DEFAULT 'en'
                  CHECK (language IN ('en', 'es', 'fr', 'ro', 'uk', 'ru')),
  display_name  TEXT,
  push_token    TEXT,
  role          TEXT NOT NULL DEFAULT 'user'
                  CHECK (role IN ('user', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ,
  UNIQUE (user_id)
);

CREATE TABLE prayer_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       UUID NOT NULL REFERENCES users(id),
  language        TEXT NOT NULL
                    CHECK (language IN ('en', 'es', 'fr', 'ro', 'uk', 'ru')),
  display_name    TEXT NOT NULL,
  message         TEXT NOT NULL,
  contactable     BOOLEAN NOT NULL DEFAULT false,
  phone           TEXT,
  email           TEXT,
  prayers_count   INTEGER NOT NULL DEFAULT 0 CHECK (prayers_count >= 0),
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'hidden', 'removed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX prayer_requests_feed_idx
  ON prayer_requests (language, status, created_at DESC);

CREATE INDEX prayer_requests_author_idx
  ON prayer_requests (author_id, created_at DESC);

CREATE TABLE prayers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, user_id)
);

CREATE INDEX prayers_user_idx ON prayers (user_id, created_at DESC);

CREATE TABLE reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   UUID NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
  reporter_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL
                 CHECK (reason IN ('spam', 'scripture_dump', 'harassment', 'off_topic', 'other')),
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, reporter_id)
);

CREATE INDEX reports_request_idx ON reports (request_id, created_at DESC);

-- Simple rolling counters for rate limits (action + subject + day bucket)
CREATE TABLE rate_limit_buckets (
  subject_key  TEXT NOT NULL,
  action       TEXT NOT NULL,
  bucket_day   DATE NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (subject_key, action, bucket_day)
);
