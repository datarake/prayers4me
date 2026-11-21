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
curl http://localhost:8080/health   # {"ok":true,"service":"Stillflame","db":"up"}
curl -H "Authorization: Bearer dev:alice" http://localhost:8080/v1/session
```

### Mobile notes

- Simulator can use `EXPO_PUBLIC_API_URL=http://localhost:8080` (see `apps/mobile/.env`).
- On a physical device, point that URL at your machine’s LAN IP.
- Expo Go’s blue gear button is Expo tooling, not an app setting.

## Analytics and crash reporting (Firebase)

Firebase Analytics and Crashlytics are in the app, and **on for everyone from launch**: there is no opt-in or toggle in Settings (removed 2026-11-21; the privacy policy says so). The code is in `apps/mobile/src/telemetry`:

- `core.ts`: the rules. Collection is switched on in `init()` at start-up. Events come from a fixed list with fixed values (`EVENTS`), so no free text, name or id can leave the phone. Errors are scrubbed of ids, emails and phone numbers. It has no Firebase dependency and is fully tested.
- `firebase.ts`: the Firebase adapter. It loads the native modules on demand, so **in Expo Go and on the web it quietly does nothing**.
- `apps/mobile/firebase.json`: native settings that keep collection off until `init()` switches it on, and turn off advertising and device identifiers.

**The Firebase project** is `prayers4me` (free Spark plan, owner: the Google account that created it). It has an iOS app ("Stillflame iOS") and an Android app ("Stillflame Android"), both with the id `app.stillflame.mobile`. The two older apps (`app.prayers4me.mobile`) were removed on 2026-11-08 and are permanently deleted by Firebase after 30 days; until then they can be restored from "Pending delete apps" in Project settings, and its own Google Analytics account called Prayers4me (these names date from before the app became Stillflame) with every optional Google data-sharing setting turned off. Analytics location: Romania (can be changed in Google Analytics settings). To get the config files again: Firebase console, Project settings, General, Your apps, download `GoogleService-Info.plist` and `google-services.json` into `apps/mobile/firebase/`.

To add an event: add it to `EVENTS` with the exact values it may take, then call `telemetry.track("name", { ... })`. A test fails if an event could carry free text or an identifier.

**These are native modules, so they need a development build, not Expo Go.** With the config files in `apps/mobile/firebase/` (`GoogleService-Info.plist`, `google-services.json`, kept out of git):

```bash
cd apps/mobile
npx expo run:ios       # or run:android. Builds a development app with Firebase inside
npx expo start --dev-client
```

For cloud builds, upload the two files as EAS file secrets and set `GOOGLE_SERVICES_PLIST` and `GOOGLE_SERVICES_JSON` to them (see `app.config.js`). `crashlytics_debug_enabled` is `true` in `firebase.json` so crashes in development builds are reported while the integration is being verified; set it to `false` afterwards.

## Tests

```bash
pnpm typecheck   # all packages, including the test files
pnpm test        # shared, app text and safety, and the API
```

The API tests (`apps/api/test`) run against a real Postgres, in a throwaway database called `prayers4me_test` that is dropped and rebuilt from the real migrations on every run. They call the app in process, so no server needs to be running, but the Postgres container does (`pnpm dev:db`). The database name must end in `_test`: setup refuses to touch anything else.

What is covered, and why it matters: pagination (no request is ever skipped or repeated), the content checks, edit and delete rules, prayer counting, the per-account and per-network limits, report weighting for auto-hide, account deletion, moderation, the metrics, notification throttling, and the configuration guards. The app tests check that every language has every string, that no text contains a long or short dash, and that crisis wording is recognised in all six languages.

When you fix a bug, add the test that would have caught it first. CI (`.github/workflows/ci.yml`) runs typecheck and tests on every push and pull request.

## Sign-in and attestation

Nobody signs in. On first launch the app asks Firebase for an **anonymous account** and sends its signed token with every call; the API verifies it against Google's published keys (`apps/api/src/firebaseAuth.ts`) and ties the account to the token's user id. A second token, **App Check**, shows the call comes from a genuine copy of the app (App Attest or DeviceCheck on iPhone, Play Integrity on Android).

| Setting | Where | Meaning |
|---------|-------|---------|
| `AUTH_MODE=dev` or `firebase` | API | `dev` accepts `Bearer dev:<id>`, never in production |
| `FIREBASE_PROJECT_ID`, `FIREBASE_PROJECT_NUMBER` | API | which project's tokens count (`prayers4me`, `799342684788`) |
| `APP_CHECK=off`, `log` or `enforce` | API | `log` checks and logs without blocking, `enforce` refuses calls without a valid token. Production requires `enforce`. Admin routes are exempt (a browser cannot attest; they need the admin role) |
| `EXPO_PUBLIC_AUTH_MODE=firebase` | app | use anonymous sign-in. Unset means the dev header. Needs a development or release build, not Expo Go |
| `EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN` | app | a fixed token for simulators, registered once under App Check, Apps, Manage debug tokens |

To try it locally, run a second API with `AUTH_MODE=firebase FIREBASE_PROJECT_ID=prayers4me PORT=8092`, and start Metro with `EXPO_PUBLIC_AUTH_MODE=firebase EXPO_PUBLIC_API_URL=http://localhost:8092` (these values are baked in when Metro bundles, so restart it after changing them).

Anonymous sign-in is enabled in the Firebase console. **Leave "Auto clean-up" off**: it deletes anonymous accounts older than 30 days, and people would lose their requests. Deleting data in Settings deletes the server account first and then the Firebase one.

**Done in the console (2026-11-09):** both apps are registered under App Check (App Attest on iOS, Play Integrity on Android), and the Apple Team ID is saved on the Firebase iOS app. **Still to do:** add the Play app signing key's SHA-256 under the Android registration once the app exists in Play Console. The iOS App Attest entitlement (`com.apple.developer.devicecheck.appattest-environment`, set in `app.json` under `ios.entitlements`) is already in the config. The paid Apple account is active (Team ID `HM348ZXGU4`, set in `app.json` as `ios.appleTeamId`). Also register the App ID `app.stillflame.mobile` with the App Attest capability. Until then, simulators and development builds use the debug provider. Run `expo prebuild` again to put the entitlement into the native project.

## Configuration that fails safe

`AUTH_MODE` has no default: the API will not start without it. With `NODE_ENV=production` it also refuses to start with dev auth, the development hash secret, `CORS_ORIGIN=*`, or abuse protection turned off, and lists every problem at once. `/health` checks the database and answers 503 when it cannot reach it.

## Abuse protection settings

| Variable | Default | Notes |
|----------|---------|-------|
| `IP_LIMITS` | `on` | Per-network limits. The local `.env.example` turns it off because everything shares one address. |
| `NEW_ACCOUNT_PROBATION` | `on` | Stricter limits for accounts under 24 hours old. Off locally so test accounts are not throttled. |
| `ADMIN_EMAILS` | empty | Google addresses (comma separated) that count as admin in `AUTH_MODE=firebase`. In dev mode the database `role` column decides instead: `UPDATE users SET role='admin' WHERE firebase_uid='dev:mod'`. |
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

## Naming

The app is called **Stillflame** (domain `stillflame.app`, bought). The name lives in `packages/shared/src/constants.ts` (`APP_NAME`, `APP_DOMAIN`), `apps/mobile/app.json`, the welcome wordmark and the app strings.

These still say `prayers4me` on purpose, because changing them costs more than it gives before launch:
- the workspace package scope (`@prayers4me/shared`, `@prayers4me/api`), the repository folder and the local database name and user;
- the on-device storage keys (`prayers4me.*`);
- the Firebase project id and name (a project id cannot be renamed).

The iOS bundle id and Android package are `app.stillflame.mobile`. Set them before any store listing exists, because they cannot change afterwards.

**Share link:** the share message ends with `https://stillflame.app` (from `APP_DOMAIN`). `EXPO_PUBLIC_SHARE_URL` overrides it for a build, and an empty value removes the link.

