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

- `https://prayers4me.app` — web  
- `https://api.prayers4me.app` — API  

## Data model (core)

| Table | Role |
|-------|------|
| `users` | Identity (`firebase_uid`), language, role, push token |
| `prayer_requests` | Asks: language, name, message, optional contact, `prayers_count`, `status` |
| `prayers` | One row per user/request (`UNIQUE(request_id, user_id)`) |
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
| GET | `/v1/requests?language=&cursor=` | For-others feed |
| GET | `/v1/requests/me` | My asks |
| POST | `/v1/requests` | Create ask (rate-limited + heuristics) |
| POST | `/v1/requests/:id/pray` | Pray once (idempotent) |
| POST | `/v1/requests/:id/report` | Report (may auto-hide) |
| GET/POST | `/v1/admin/...` | Reports queue, hide/restore, ban |

## Moderation controls

Configured in `@prayers4me/shared` (`RATE_LIMITS`) and enforced in the API:

- Cap new requests per user per day  
- Cap pray / report actions per day  
- Reject dump-like messages (too many lines, huge paste, link spam)  
- Auto-hide after enough distinct reports  
- Admin ban hides that user’s active content  

## Auth model

- **Production:** Firebase anonymous auth → Bearer ID token → API verifies and upserts `users`  
- **Local:** `Authorization: Bearer dev:<stable-id>` (`AUTH_MODE=dev`)

## Clients

### Mobile

- Welcome with brand, short product explanation, ask/pray paths, language  
- For others: intro copy, feed, pray, report  
- For me: intro copy, list, compose form  
- Device id stored locally for stable dev sessions  

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
