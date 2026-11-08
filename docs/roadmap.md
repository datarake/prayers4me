# Roadmap

Ordered by user value against effort, and by what blocks a public launch. Each phase should ship on its own.

Principles that decide scope: presence without intimacy, quiet by default, low friction in crisis, trust is product (see [Product](./product.md)). Anything that adds a feed, chat or social graph is out.

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
| **Edit my request** (done) | Authors can fix typos: name, text and contact only, never the language. Capped at 3 edits, same content checks as a new request, marked "Edited", previous versions stored in `request_edits`. Not allowed while a request is under review. |

| **Tabs and settings** (done) | Pray, My requests and Settings in a tab bar. The welcome screen shows on the first launch only. Settings holds language, a notifications switch and the guidelines. |
| **UX review fixes** (done) | Relative times ("25 min ago") from our own localized strings, because the built-in formatter silently fell back to calendar dates. A darker teal (`tealText`, 5.3:1) for small text. |
| **Feed readability** (done) | Long requests are clamped to 5 lines with "Read more". A "Needs prayer" filter lists requests nobody has prayed for yet. Prayed-for cards step back, and the pray button is outlined until pressed. |

## Phase 3: Delight and retention

| # | Feature | Notes |
|---|---------|-------|
| 8 | **Prayer mode** | One request at a time, large type, "I prayed" then next. Fits the quiet principle better than a list. |
| 9 | **Offline cache** | Show the last feed instantly and refresh behind it. |
| 10 | **Share the app** | Share sheet with the store link. Never shares individual requests. |
| 11 | **Requests I prayed for** | Private history, no gamification and no streaks. |
| 12 | **Dark mode** | Colour tokens exist. Needs a dark palette and a hero overlay. |
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

- **Contact details:** the compose form can collect a phone or email, but the server never shows it to anyone except the author. Either define who uses it (for example moderator outreach in a crisis) or remove the field.
- **Cross-language reading:** the feed is scoped to one language. Decide whether someone can opt in to a second language.
- **Native review:** Ukrainian, Romanian and Russian copy needs review by native speakers before launch.
