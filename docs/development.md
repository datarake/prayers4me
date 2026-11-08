# Development

## Requirements

- Node.js 22+ (`nvm use` reads `.nvmrc`)
- pnpm 9+
- Docker (for local Postgres)

## First-time setup

```bash
nvm use
pnpm install
pnpm --filter @prayers4me/shared build
pnpm dev:db
pnpm db:migrate
cp apps/api/.env.example apps/api/.env   # if needed
```

## Run

```bash
pnpm dev:api      # http://localhost:8080
pnpm dev:mobile   # Expo
```

Useful API checks:

```bash
curl http://localhost:8080/health
curl -H "Authorization: Bearer dev:alice" http://localhost:8080/v1/session
```

### Mobile notes

- Simulator can use `EXPO_PUBLIC_API_URL=http://localhost:8080` (see `apps/mobile/.env`).
- On a physical device, point that URL at your machine’s LAN IP.
- Expo Go’s blue gear button is Expo tooling, not an app setting.

## Abuse protection settings

| Variable | Default | Notes |
|----------|---------|-------|
| `IP_LIMITS` | `on` | Per-network limits. The local `.env.example` turns it off because everything shares one address. |
| `NEW_ACCOUNT_PROBATION` | `on` | Stricter limits for accounts under 24 hours old. Off locally so test accounts are not throttled. |
| `TRUSTED_PROXY_HOPS` | `0` | Set to `1` behind Cloud Run. The client address is the Nth entry from the right of `X-Forwarded-For`, so a client cannot choose its own. |
| `IP_HASH_SECRET` | dev value | Set a long random value in production. |

To test the protections locally, start a second API instance with them on: `PORT=8091 IP_LIMITS=on NEW_ACCOUNT_PROBATION=on TRUSTED_PROXY_HOPS=1 pnpm --filter @prayers4me/api dev`, then send `X-Forwarded-For: <address>` to simulate different networks.

## Push notifications

When someone prays, the server notifies the author (see `apps/api/src/notifications/push.ts`).

- `PUSH_MODE=log` (default) prints the notification instead of sending it. Use `PUSH_MODE=expo` to send through Expo's push service.
- The first prayer on a request is delivered at once. Further prayers are counted and delivered together once three hours have passed.
- Notifications never name who prayed and never repeat the request text.
- The app asks only after the person has a request and taps "Turn on" on its own card. Tokens are registered with `PUT /v1/session/push-token`.

To receive real pushes on a device:

1. Link the app to an EAS project once: `npx eas-cli init`. This writes `extra.eas.projectId` into `apps/mobile/app.json`. Without it the app cannot get a push token.
2. Use a physical device. Simulators cannot receive remote pushes.
3. On Android, use a development build (`npx expo run:android` or `eas build --profile development`). Expo Go on Android does not support remote push.
4. Run the API with `PUSH_MODE=expo`.

## Workspace packages

| Package | Name | Role |
|---------|------|------|
| `packages/shared` | `@prayers4me/shared` | Languages, zod, rate-limit constants, public types |
| `apps/api` | `@prayers4me/api` | Hono server |
| `apps/mobile` | `mobile` | Expo client |

After changing shared source, rebuild before consumers pick up `dist`:

```bash
pnpm --filter @prayers4me/shared build
```

## Database

- Compose file: `infra/docker/docker-compose.yml`
- Migration: `infra/sql/001_init.sql`
- Apply: `pnpm db:migrate` (runs every `infra/sql/NNN_*.sql` once, in order, and records it in `schema_migrations`). Add a schema change as a new numbered file, never edit an applied one.

Default local URL:

```text
postgres://prayers4me:prayers4me@localhost:5432/prayers4me
```

## Auth in development

Set `AUTH_MODE=dev` and send:

```http
Authorization: Bearer dev:<any-stable-user-id>
```

The API upserts a user for that id. Mobile stores a device UUID and uses it as the dev subject.

## Scripts (root)

| Script | What it does |
|--------|----------------|
| `pnpm dev:db` | Start Postgres container |
| `pnpm db:migrate` | Apply SQL migration |
| `pnpm dev:api` | API watch mode |
| `pnpm dev:mobile` | Expo start |
| `pnpm typecheck` | Typecheck workspace packages that define it |
| `pnpm build` | Build workspace packages |

## Product languages (picker order)

1. English  
2. Spanish  
3. French  
4. Romanian  
5. Ukrainian  
6. Russian  

Defined in `packages/shared/src/languages.ts` and mirrored in mobile i18n.
