# Deployment (Google Cloud)

**Status (2026-11-09):** running image `v5` (revision `stillflame-api-00003-zqk`) in `europe-west1` (Belgium), with migrations up to 007 (Block). The API answers at `https://api.stillflame.app` (also `https://stillflame-api-799342684788.europe-west1.run.app`). Real phones cannot use it yet, because App Check is enforced and needs the Apple and Google developer accounts.

## What exists

| Resource | Name |
|----------|------|
| Cloud Run service | `stillflame-api` (public invoker, max 3 instances, scales to zero, 512 MiB) |
| Cloud Run jobs | `stillflame-migrate`, `stillflame-maintain` |
| Cloud Scheduler | `stillflame-maintain-every-6h` (europe-west1) |
| Cloud SQL | `stillflame-db`, Postgres 16, `db-f1-micro`, 10 GB SSD, daily backup 03:00, deletion protection on; database and user `stillflame` |
| Secrets | `database-url`, `ip-hash-secret` (Secret Manager) |
| Service accounts | `stillflame-api` (Cloud SQL client, secret reader), `stillflame-scheduler` (invokes the maintain job) |
| Image registry | `europe-west1-docker.pkg.dev/prayers4me/stillflame/api` |
| Budget | 20 USD a month with emails at 50%, 90% and 100% (warns only, it does not stop anything) |
| DNS (GoDaddy) | `api` CNAME to `ghs.googlehosted.com`; TXT `google-site-verification=...` on `@` (keep it, removing it loses domain ownership in Google) |

Everything is in the Firebase project `prayers4me` (project number `799342684788`). A project id cannot be renamed, so the older name stays internal.

## Releasing a new version

Use the account `burdibox@gmail.com` and the project `prayers4me` explicitly (the machine has other Google accounts):

```bash
export CLOUDSDK_CORE_ACCOUNT=burdibox@gmail.com CLOUDSDK_CORE_PROJECT=prayers4me
TAG=v6   # a new tag each time (v5 is live)
IMG=europe-west1-docker.pkg.dev/prayers4me/stillflame/api:$TAG
gcloud builds submit . --tag $IMG --region=europe-west1
gcloud run jobs update stillflame-migrate --image=$IMG --region=europe-west1
gcloud run jobs execute stillflame-migrate --region=europe-west1 --wait      # before the new code runs
gcloud run jobs update stillflame-maintain --image=$IMG --region=europe-west1
gcloud run deploy stillflame-api --image=$IMG --region=europe-west1          # keeps the existing settings
```

## Things learned

- The database URL for Cloud Run is `postgres://stillflame:PASSWORD@localhost/stillflame?host=/cloudsql/prayers4me:europe-west1:stillflame-db`. The driver ignores a `host` parameter, so `connect()` in `apps/api/src/db/client.ts` reads it and opens the socket itself (tested).
- A failed connection can print the full URL, password included, into the logs. If that happens, rotate the password (`gcloud sql users set-password`) and add a new secret version.
- Deleting a Google Cloud project does not free its slot in the project quota for 30 days.
- Anonymous Firebase accounts must not be auto-cleaned (see `docs/development.md`).

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
| `APP_CHECK` | `enforce`. Production refuses anything else. Real phones can only pass it once App Check is set up with the Apple and Google developer accounts (see `docs/development.md`), so until then a production deploy is reachable but the app cannot use it |
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
