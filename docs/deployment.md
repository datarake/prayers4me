# Deployment (Google Cloud)

Everything runs in the Firebase project `prayers4me` (it is also a Google Cloud project, number `799342684788`), so sign-in, attestation, the API and the database share one place and one bill.

| Piece | Service | Notes |
|-------|---------|-------|
| API | Cloud Run service `stillflame-api` | scales to zero, one container image |
| Database | Cloud SQL for PostgreSQL 16 | smallest shared-core instance, daily backups, no high availability for the beta |
| Migrations | Cloud Run job `stillflame-migrate` | same image, run before each release |
| Housekeeping | Cloud Run job `stillflame-maintain` + Cloud Scheduler (every 6 hours) | prunes old rate-limit counters. A service that scales to zero cannot rely on an in-process timer |
| Secrets | Secret Manager | `DATABASE_URL`, `IP_HASH_SECRET` |
| Domain | `api.stillflame.app` mapped to the service | DNS records are added at GoDaddy |
| Images | Artifact Registry | built with Cloud Build |

## The image

`Dockerfile` at the repository root builds one image for all three uses:

```bash
docker build -t stillflame-api .
docker run --rm -e DATABASE_URL=... stillflame-api node apps/api/dist/db/migrate.js     # migrations
docker run --rm -e DATABASE_URL=... stillflame-api node apps/api/dist/db/maintain.js    # housekeeping
docker run -p 8080:8080 -e ... stillflame-api                                          # the API
```

It was tested locally: migrations apply, a weak production configuration is refused with every problem listed, and a correct one starts, answers `/health`, and refuses unauthenticated and dev-token calls.

## Environment of the API in production

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `AUTH_MODE` | `firebase` |
| `FIREBASE_PROJECT_ID` | `prayers4me` |
| `FIREBASE_PROJECT_NUMBER` | `799342684788` |
| `APP_CHECK` | `enforce` (needs App Check set up for real devices, see `docs/development.md`; use `log` for a first smoke test only, and the API refuses `log` in production unless you change the code, so test with a staging service) |
| `CORS_ORIGIN` | `https://stillflame.app` |
| `TRUSTED_PROXY_HOPS` | `1` (Cloud Run puts one proxy in front) |
| `IP_HASH_SECRET` | long random value, from Secret Manager |
| `DATABASE_URL` | Cloud SQL socket URL, from Secret Manager |
| `PUSH_MODE` | `expo` |

## Order of work

1. Enable billing on the project and set a budget alert.
2. Enable the APIs (Cloud Run, Cloud SQL Admin, Artifact Registry, Cloud Build, Secret Manager, Cloud Scheduler).
3. Create the database instance, the database and a user. Store the connection string and the hash secret as secrets.
4. Build and push the image, create and run the migration job, deploy the service.
5. Map `api.stillflame.app`, add the DNS records at GoDaddy, wait for the certificate.
6. Create the housekeeping job and its schedule.
7. Build the app with `EXPO_PUBLIC_API_URL=https://api.stillflame.app` and `EXPO_PUBLIC_AUTH_MODE=firebase`.
