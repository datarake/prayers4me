# Architecture

## Goals

- One product on **iOS**, **Android**, and later **web**
- Shared domain types and validation
- **GCP** for web/API hosting
- Moderation and anti-flood built into the data model and API

## Stack

| Layer | Choice |
|-------|--------|
| Mobile | Expo (React Native) + TypeScript + Expo Router |
| Web (planned) | Next.js on Cloud Run |
| API | Hono + TypeScript on Cloud Run |
| Database | Cloud SQL Postgres (Docker Postgres locally) |
| Auth | Firebase Auth / Identity Platform — anonymous-first (dev tokens locally) |
| Shared | `@prayers4me/shared` — languages, zod schemas, constants, types |
| Infra | Docker Compose (local), Terraform planned for GCP |

## Repository layout

```text
prayers4me/
  apps/
    api/          Hono API
    mobile/       Expo app
  packages/
    shared/       Cross-app contracts
  infra/
    docker/       Local Postgres
    sql/          Migrations
  docs/           Product & engineering docs
```

## Runtime shape

```text
Mobile (Expo)  ──┐
                 ├──  HTTPS + Firebase ID token ──►  Cloud Run API  ──►  Cloud SQL
Web (Next.js)  ──┘                                         │
                                                           ▼
                                              reports / bans / rate buckets
                                                           │
                                                           ▼
                                              Expo Push / FCM (notify on pray)
```

**Suggested production hosts**

- `https://stillflame.app` — web  
- `https://api.stillflame.app` — API  

## Data model (core)

| Table | Role |
|-------|------|
| `users` | Identity (`firebase_uid`), language, role, push token |
| `prayer_requests` | Asks: language, name, message, optional contact, `prayers_count`, `status` |
| `prayers` | One row per user/request (`UNIQUE(request_id, user_id)`) |
| `request_edits` | Previous versions of edited requests, kept for moderation |
| `reports` | User reports with reason |
| `bans` | Blocked users |
| `rate_limit_buckets` | Daily counters per user/action |

**Request status:** `active` | `hidden` | `removed`  
Feeds only show `active`. Hidden rows stay for audit.

## API surface (v1)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness |
| GET | `/v1/session` | Upsert/return current user |
| GET | `/v1/requests?language=&cursor=&filter=` | For-others feed. `filter=newest` (default) or `waiting` (only requests with no prayers yet, never your own) |
| GET | `/v1/requests/me` | My asks |
| POST | `/v1/requests` | Create ask (rate-limited + heuristics) |
| POST | `/v1/requests/:id/pray` | Pray once (idempotent) |
| POST | `/v1/requests/:id/report` | Report (may auto-hide) |
| PATCH | `/v1/requests/:id` | Author edits name, text or contact (max 3 edits, content checks apply, not while under review) |
| DELETE | `/v1/session` | Delete the whole account: requests, prayers, reports, token (counts on other requests are corrected) |
| DELETE | `/v1/requests/:id` | Author removes their own request (soft delete) |
| PUT | `/v1/session/push-token` | Register or clear the device's Expo push token |
| GET/POST | `/v1/admin/...` | Reports queue, hide/restore, ban, `GET /v1/admin/metrics` (first-prayer rate, time to first prayer, supply and demand) |

## Moderation controls

Configured in `@prayers4me/shared` (`RATE_LIMITS`) and enforced in the API:

- Cap new requests per user per day (1 for accounts under 24 hours old)  
- Per-network caps across all accounts, using a salted fingerprint that changes daily  
- Cap pray / report actions per day  
- Reject dump-like messages (too many lines, huge paste, link spam)  
- Auto-hide after three reports from established accounts on distinct networks. Reports from accounts under 24 hours old are kept for moderators but do not count  
- Admin ban hides that user’s active content  

## Auth model

- **Production:** Firebase anonymous auth → Bearer ID token → API verifies and upserts `users`  
- **Local:** `Authorization: Bearer dev:<stable-id>` (`AUTH_MODE=dev`)

## Clients

### Mobile

- **First launch:** a welcome screen (brand, the tagline, ask or pray, language). After that the app opens on the feed
- **Tabs:** Pray (feed with Newest and Needs prayer), My requests (own requests, edit, delete), Settings (language, notifications, guidelines)
- **Modals and pushes:** compose and edit form, language picker, community guidelines
- Device id stored locally for stable dev sessions

Routes live in `apps/mobile/app`: `index` (welcome gate), `(tabs)/pray`, `(tabs)/mine`, `(tabs)/settings`, `for-me/compose`, `languages`, `guidelines`.

### Web (planned)

- Peer experience of ask/pray  
- `/admin` for staff moderation  

## Environments

| Env | Notes |
|-----|--------|
| Local | Docker Postgres + API `:8080` + Expo |
| Staging | Cloud Run + Cloud SQL |
| Production | Same, locked IAM, backups, custom domain |

## Out of scope for the first architecture cut

- Multi-region active-active  
- ML spam classifiers (heuristics + human reports first)  
- Redis (Postgres buckets are enough initially)  
