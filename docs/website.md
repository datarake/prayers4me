# Website (stillflame.app)

**Status (2026-11-09):** live at `https://stillflame.app` (and `https://www.stillflame.app`, which redirects there) on Firebase Hosting in the project `prayers4me`. DNS at GoDaddy: `A @ 199.36.158.100`, `TXT @ hosting-site=prayers4me`, `CNAME www prayers4me.web.app`. The `api` CNAME (Cloud Run) and the Google verification TXT stay as they are.

A small static site in `site/`: home, community guidelines, privacy policy and terms. There are no scripts, no cookies and no third-party requests (fonts are served from the site), which fits the product's promise. The stores need public privacy and terms URLs, and the app's share link needs somewhere to go.

## Build and preview

```bash
cd site
pnpm build            # preview build: drafts are allowed and marked
pnpm preview          # builds and serves http://localhost:4173
pnpm build:release    # the build to publish
```

The privacy policy and terms come from `docs/legal/*.md`. **`build:release` refuses to build** while those files still contain `[placeholders]`, a "DRAFT" marker, or while `site/config.json` has no `supportEmail`, and it lists everything left to finish. A preview build puts a visible "Draft for legal review" banner on those pages, tells search engines not to index them, and serves `robots.txt` with `Disallow: /`.

`site/config.json` holds the name, domain, support email and the store links. Fill `stores.ios` and `stores.android` when the listings exist, and the "Coming soon" buttons become real links.

## Publishing

Firebase Hosting in the existing project is free for this size.

```bash
cd site && pnpm build:release
firebase deploy --only hosting --project prayers4me --account burdibox@gmail.com   # needs Node 22 and `firebase login:add` once
```

Then connect the domain in the Firebase console (Hosting, Add custom domain) for `stillflame.app` and `www.stillflame.app`. At GoDaddy this means replacing the parked `A @` record with the addresses Firebase shows and pointing `www` at Firebase. Keep the `api` CNAME and the Google verification TXT record untouched.

## Before it can go public

0. **Confirm in the consoles** the retention promised in the privacy policy: in Google Analytics (Admin, Data collection and modification, Data retention) event data retention must be **2 months**, and Crashlytics keeps crash reports 90 days. The policy states both.

1. Have a lawyer check `docs/legal/privacy-policy.md` and `docs/legal/terms.md`, then delete the draft note and the word DRAFT from both. The decisions are made (retention 30 and 90 days and one year, minimum age 16, Romanian law, no optional contact details). **Open point:** no operator name or address is stated, on purpose; the GDPR normally requires the controller's identity and contact details, so ask the lawyer whether the support email alone is enough.
2. Choose the support email and put it in `site/config.json`.
3. The site is English only. Add Spanish, French, Romanian, Ukrainian and Russian versions later, with the app's text.

## Moderation page (`/admin`)

A small page for moderators, served by the same Firebase Hosting site at `https://stillflame.app/admin/`. Source: `site/src/admin` (plain HTML, CSS and JavaScript, no build step beyond `node build.mjs`, which copies it and writes `admin/config.js` from `site/config.json`). It is not linked from the public pages, is blocked in `robots.txt`, sends `noindex`, and is never cached. The public pages keep their strict Content-Security-Policy; `/admin/**` gets its own (see `site/firebase.json`) that allows only Google's sign-in scripts and `api.stillflame.app`.

How access works: a moderator signs in with Google in the browser; the page sends the Firebase ID token to the API; the API grants admin only when the token's **verified email** is in `ADMIN_EMAILS` (Cloud Run environment variable). The page itself holds no secret. Nobody else can do anything with it, because every action is checked by the API.

Using it day to day is described in `docs/operations.md`. Locally, open `http://localhost:4173/admin/` (`node site/serve.mjs`) against a local dev API: a "Dev sign-in" box appears only on localhost.

### Live since 2026-11-09

The page is live at `https://stillflame.app/admin/`. What was done:

1. API `v6` deployed with migration `008_moderation_workflow.sql`, and `ADMIN_EMAILS=burdibox@gmail.com` set on the Cloud Run service.
2. Firebase Authentication: **Google** sign-in enabled (Anonymous stays on for the app), `stillflame.app` added to Authorized domains.
3. Firebase web app `Stillflame admin` registered. Its `apiKey` and `appId` are in `site/config.json` under `admin.firebase` (public identifiers, not secrets).
4. Site deployed. Signing in as `burdibox@gmail.com` opens the queue; Health answers from production.

To add a moderator: add the Google address to `ADMIN_EMAILS` (`gcloud run services update stillflame-api --region=europe-west1 --update-env-vars=^@^ADMIN_EMAILS=a@x.com,b@y.com`, the `^@^` makes gcloud accept the comma). To remove one, do the same without it.

The homepage hero was left as it was on purpose: the committed tweak in `6bb3cb2` is not in this deployment (the built `style.css` kept the old hero line). Decide about it separately.

Tested by hand on the live site: Google sign-in popup, empty queue, Health. Not yet tried on live data: the review actions (nothing has been reported yet). They were tested in a browser against a local API and by the automated tests.
