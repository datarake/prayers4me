# Website (stillflame.app)

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

## Publishing (not done yet)

Firebase Hosting in the existing project is free for this size.

```bash
cd site && pnpm build:release
firebase deploy --only hosting --project prayers4me     # with the burdibox@gmail.com login
```

Then connect the domain in the Firebase console (Hosting, Add custom domain) for `stillflame.app` and `www.stillflame.app`. At GoDaddy this means replacing the parked `A @` record with the addresses Firebase shows and pointing `www` at Firebase. Keep the `api` CNAME and the Google verification TXT record untouched.

## Before it can go public

0. **Confirm in the consoles** the retention promised in the privacy policy: in Google Analytics (Admin, Data collection and modification, Data retention) event data retention must be **2 months**, and Crashlytics keeps crash reports 90 days. The policy states both.

1. Have a lawyer check `docs/legal/privacy-policy.md` and `docs/legal/terms.md`, then delete the draft note and the word DRAFT from both. The decisions are made (retention 30 and 90 days and one year, minimum age 16, Romanian law, no optional contact details). **Open point:** no operator name or address is stated, on purpose; the GDPR normally requires the controller's identity and contact details, so ask the lawyer whether the support email alone is enough.
2. Choose the support email and put it in `site/config.json`.
3. The site is English only. Add Spanish, French, Romanian, Ukrainian and Russian versions later, with the app's text.
