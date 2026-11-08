# Roadmap

Ordered by user value against effort, and by what blocks a public launch. Each phase should ship on its own.

Principles that decide scope: presence without intimacy, quiet by default, low friction in crisis, trust is product (see [Product](./product.md)). Anything that adds a feed, chat or social graph is out.

## Launch plan (from the product review)

The order below is the order to work in. P0 blocks any public beta. P1 decides whether people come back. P2 is growth and sustainability once the loop works.

Status: `done`, `in progress`, `todo`, or `needs you` (needs an account, a decision or an expert outside this repository).

### P0: before a closed beta

| # | Task | Why | Status |
|---|------|-----|--------|
| P0.1 | **Abuse limits that survive free identities**: per-IP limits next to per-user limits, stricter limits for accounts under 24 hours old, and auto-hide that counts only reports from established accounts on distinct IPs | A new install is a new identity, so per-user limits alone allow flooding, brigading and ban evasion. This is the failure that killed v1. | done (the network and account limits are in place and tested) |
| P0.2 | **Device attestation** (Firebase App Check, Apple DeviceCheck, Play Integrity) and real Firebase auth (`AUTH_MODE=firebase`) | Only real installs of the app should reach the API. | code done and tested; anonymous sign-in enabled. Needs you: Apple and Google developer accounts to turn on App Check for real devices |
| P0.3 | **Account and data deletion** in Settings and `DELETE /v1/session` | Required by the app stores and by GDPR. | done (one gap: requests deleted one by one are only hidden, see `docs/operations.md`) |
| P0.4 | **Privacy policy, terms and consent for sensitive data** (health and religion are special category data in the EU) | Legal requirement. Drafts live in `docs/legal`. | draft written, needs a lawyer |
| P0.5 | **Support contact** shown in the app and the store listing | Apple requires one for apps with user-generated content. | needs you (an address) |
| P0.6 | **Moderation tooling and a response rule**: a queue someone can actually use, a named owner, and a target to act on reports within 24 hours | Stores expect action on abusive content within about a day. Today reports exist only as raw API calls. | partly done (rules written in `docs/operations.md`, report weighting done, an admin page is still todo) |
| P0.7 | **Measurement without tracking people**: server-side metrics from the database (first-prayer rate, time to first prayer, retention proxies). No client analytics, no request text. | You cannot tell if the product works without it, and this keeps the anonymity promise. | done (`GET /v1/admin/metrics`) |
| P0.8 | **Crash reporting and usage statistics** | Needed before real users, without sending content. | built with Firebase (Crashlytics and Analytics), off until a person opts in. Needs the Firebase project and config files, and a first run on a development build to verify. |

### Follow-ups found while building P0

| Task | Why |
|------|-----|
| **Admin page** for reports, hide, restore, ban and the metrics | Moderators currently call API routes by hand. |
| **Scheduled clean-up** (done) | Deleted requests are erased after 30 days, edit history after 90 days, ended bans after one year, by the housekeeping job (`purgeExpiredData`, tested). |
| **Attestation hook**: refuse API calls without a valid App Check or Play Integrity token when `AUTH_MODE=firebase` | Completes P0.2 once the accounts exist. |

### Engineering foundations (from the developer review)

| # | Task | Status |
|---|------|--------|
| E1 | **Feed pagination that never skips a request** (keyset cursor on timestamp and id; the driver was cutting microseconds) | done, with a regression test |
| E2 | **Safe configuration**: no default auth mode, production refuses weak settings | done |
| E3 | **Input hardening**: bad JSON and bad ids are 4xx, request size limit, security headers, a health check that sees the database | done |
| E4 | **Old rate-limit counters pruned** every few hours | done |
| E5 | **Automated tests** against a real database, and **CI** on every push | done (175 tests) |
| E6 | **Lint and format** (ESLint, Prettier) with a CI check | todo |
| E7 | **Localized error messages**: the app maps the API's error codes to its own text instead of showing English server messages | todo |
| E8 | **Dev flow**: build or watch the shared package automatically, and a seed script instead of hand-made data | todo |
| E9 | **Route structure**: move rules out of the route handlers into small testable functions | todo |
| E10 | **One home for app strings** (today split across two files), with the push wording sharing its source | todo |
| E11 | **Container and deploy files**: Dockerfile, `eas.json`, structured logs with a request id | todo |
| E12 | Remove unused dependencies after `expo-doctor` (`expo-device`, `expo-symbols`, others may be peers) | todo |

### P1: retention (first weeks)

| # | Task | Why | Status |
|---|------|-----|--------|
| P1.1 | **Warmer "no prayers yet" state** instead of a big 0 | A zero on your own request reads as failure and makes people leave. | in progress |
| P1.2 | **"While you wait, pray for someone"** after sending a request | A reciprocity loop that raises prayer supply, the metric that makes or breaks the product. | done |
| P1.3 | **First prayer celebration** for the author | Product principle 2. The moment the promise is kept. | todo |
| P1.4 | **Gentle daily reminder** | A reason to come back and pray. | todo |
| P1.5 | **Prayer mode**, one request at a time | Calmer than a list, equal exposure, and slower than tapping through cards. | todo |
| P1.6 | **One-tap "Anonymous"** and remember the last name | A required name is a barrier in a crisis. | todo |
| P1.7 | **Block** and the "answered" thank-you note | Store expectation, and closes the loop for people who prayed. | todo |

### P2: growth and sustainability

| # | Task | Status |
|---|------|--------|
| P2.1 | Launch with one language and one real community, add languages as each community reaches a healthy size | needs you (a launch partner and a decision) |
| P2.2 | Share the app (never an individual request) | done in the app (Settings). Set `EXPO_PUBLIC_SHARE_URL` once a store listing or landing page exists; until then the message goes out without a link. |
| P2.3 | Funding model, no ads (donations, church partnerships, optional supporter) | needs you (a decision) |
| P2.4 | Optional account link so a new phone keeps your requests | todo |
| P2.5 | Decide the audience: faith-neutral or Christian, and write it into the copy and moderation rules | needs you (a decision) |

### To test with people, not decide here
Whether people will post without a name, how they react to "no prayers yet", whether "Needs prayer" raises first prayers, and whether they would return daily for prayer mode. Five interviews and a small private beta.

---

## History

The sections below record what was built, in order.

## Phase 1: Safety and control (in progress)

People share hard moments here. They must stay in control, and the app must respond well when someone is in danger.

| # | Feature | Why | Status |
|---|---------|-----|--------|
| 1 | **Delete my request** (`DELETE /v1/requests/:id`, confirm dialog) | Privacy and control. Required by app stores and GDPR expectations. | Done |
| 2 | **Crisis support card** in the compose form when the text suggests self-harm, with a link to a helpline finder. Never blocks sending. | Duty of care for a product used in despair. | Done |
| 3 | **Community guidelines** screen, linked from compose with "By sending, you agree..." | Required for user-generated content on the App Store. Sets tone without adding friction. | Done |

## Phase 2: The promise (in progress)

The tagline is "Someone prayed for you." Today the author only learns it by opening the app.

| # | Feature | Notes |
|---|---------|-------|
| 4 | **Push notification when someone prays** (backend done and tested, app flow done, not yet tested on a real device) | Uses the existing `users.push_token`. Anonymous, never says who. Throttled: the first prayer immediately, later ones batched (at most one per request per few hours). Opt-in asked right after the first request is sent, not at launch. Tapping opens "My requests". Needs `expo-notifications` and a development build for Android. |
| 5 | **Answered / thank you note** | Author can mark a request answered and add a short thanks. People who prayed see it. Closes the loop and gives prayer a visible meaning. Needs a status value and a column. |
| 6 | **Block** | Hide everything from one author for me. App stores expect blocking in addition to reporting. Needs a `blocks` table and a feed filter. |
| 7 | **Gentle daily reminder** | Optional local notification at a time the user picks. No server needed. |

### Added during phase 2

| Feature | Notes |
|---------|-------|
| **Edit my request** (done) | Authors can fix typos: name and text only, never the language. Capped at 3 edits, same content checks as a new request, marked "Edited", previous versions stored in `request_edits`. Not allowed while a request is under review. |

| **Tabs and settings** (done) | Pray, My requests and Settings in a tab bar. The welcome screen shows on the first launch only. Settings holds language, a notifications switch and the guidelines. |
| **UX review fixes** (done) | Relative times ("25 min ago") from our own localized strings, because the built-in formatter silently fell back to calendar dates. A darker teal (`tealText`, 5.3:1) for small text. |
| **Feed readability** (done) | Long requests are clamped to 5 lines with "Read more". A "Needs prayer" filter lists requests nobody has prayed for yet. Prayed-for cards step back, and the pray button is outlined until pressed. |

## Phase 3: Delight and retention

| # | Feature | Notes |
|---|---------|-------|
| 8 | **Prayer mode** | One request at a time, large type, "I prayed" then next. Fits the quiet principle better than a list. |
| 9 | **Offline cache** | Show the last feed instantly and refresh behind it. |
| 10 | **Share the app** (done) | Share sheet from Settings. Never shares individual requests. The link comes from `EXPO_PUBLIC_SHARE_URL` (not set yet). |
| 11 | **Requests I prayed for** (done) | Private history opened from Settings (`GET /v1/requests/prayed`, paged, only your own prayers, removed or under review requests drop out). No counts of your own prayers, no streaks. |
| 12 | **Dark mode** (done) | Light, dark or automatic, chosen in Settings. Colours come from one palette in `src/theme.ts` through `useStyles` and `useTheme`. Following the phone setting needs a rebuilt native app (`userInterfaceStyle` is now `automatic`). Native alerts and the keyboard follow the phone, not the in-app choice. |
| 13 | **Reduce motion** | Respect the system setting for the spring and skeleton animations. |

## Phase 4: Production readiness

| # | Item | Notes |
|---|------|-------|
| 14 | **Firebase auth** | Verify ID tokens (JWKS) in `AUTH_MODE=firebase`, anonymous sign-in in the app. Today it returns 501. |
| 15 | **In-app account and data deletion** | Required by the App Store. Deletes the user, requests and prayers. |
| 16 | **API tests and CI** | Vitest for heuristics, rate limits and routes against a test database. GitHub Actions for typecheck and tests. |
| 17 | **Versioned migrations** (done) | `pnpm db:migrate` applies `infra/sql/NNN_*.sql` once each, in order, and records them in `schema_migrations`. |
| 18 | **Container and deploy** | Dockerfile for the API, Cloud Run, Cloud SQL, Terraform. |
| 19 | **Observability** | Structured logs, error reporting, uptime check on `/health`. |
| 20 | **Admin web** | Reports queue, hide, restore, ban. Today these exist only as API routes. |
| 21 | **Privacy policy and terms** | Hosted pages linked from the app and the store listing. |

## Open product questions

- **Contact details:** removed (migration 006). Nothing needed them.
- **Cross-language reading:** the feed is scoped to one language. Decide whether someone can opt in to a second language.
- **Native review:** Ukrainian, Romanian and Russian copy needs review by native speakers before launch.
