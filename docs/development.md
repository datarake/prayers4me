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
- Apply: `pnpm db:migrate`

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
