# Operations

How the service is run once real people use it. Fill in the [brackets] before a beta.

## Who is responsible

| Role | Person | Backup |
|------|--------|--------|
| Moderation owner (reads reports, decides) | [name] | [name] |
| Crisis escalation contact | [name] | [name] |
| Engineering on call | [name] | [name] |
| Privacy requests | [name] | [name] |

## Reports and moderation

**Target:** every report is reviewed within 24 hours, every day. App stores expect this for apps with user-generated content.

How reports flow today:
- A person reports a request with a reason. It is recorded either way.
- A request is hidden automatically when **three established accounts on three different networks** report it. Reports from accounts under 24 hours old, and several accounts on one network, never count toward that, so a handful of throwaway accounts cannot silence a request.
- Moderators see reports through `GET /v1/admin/reports` and act with `POST /v1/admin/requests/:id/hide`, `.../restore` and `POST /v1/admin/users/:id/ban`.
- **Known gap:** there is no admin page yet. Until there is, moderation means calling these routes. Building a small admin page is the next moderation task.

Decisions to write down before a beta:
- What gets removed at once and what gets a second look (hate, threats, self-harm, personal details, advertising, copied scripture, political content).
- How long a ban lasts and whether someone can appeal.
- Languages: someone who reads each launched language, and a rule for Russian and Ukrainian content that attacks the other community.

## Requests that suggest someone is in danger

The app shows a helpline link while writing. Nobody monitors in real time, and the terms say so. Decide with a qualified person:
- Whether moderators look for such requests, and how.
- What a moderator does, and what they must not do.
- Who is contacted and when.

Do not improvise this. A wrong response here does more harm than none.

## Is it working? Weekly review

`GET /v1/admin/metrics?days=7` (admin only) returns numbers computed from the database, with no tracking and no request text.

| Number | What it tells you | Starting target (adjust with real data) |
|--------|-------------------|------------------------------------------|
| `firstPrayerRate24hPercent` | The share of requests, at least a day old, that got a prayer within a day. The most important number. | 70 percent or more |
| `medianMinutesToFirstPrayer` | How long someone waits | Under a few hours |
| `askersWhoAlsoPrayedPercent` | Whether people give as well as ask | Rising over time |
| `peopleWhoPrayed` against `peopleWhoAsked` | Supply against demand | More people praying than asking |
| `reportsPerRequestPercent` and `requestsHidden` | Community health | A low and steady rate |

If the first-prayer rate falls, people who ask are leaving disappointed. Act on that before growing.

## Data requests and deletion

- People can delete everything in the app (Settings, Delete my data). The server removes their account, requests, prayers and reports at once.
- Requests deleted one by one are hidden and kept. **Known gap:** add a scheduled clean-up that erases hidden-for-deletion rows after [N] days, and state the period in the privacy policy.
- Requests for a copy of data come to [support email]. [Write the procedure.]

## Infrastructure to put in place before a beta

- [ ] Production auth (`AUTH_MODE=firebase`) and device attestation (App Check, DeviceCheck, Play Integrity)
- [ ] `TRUSTED_PROXY_HOPS=1` behind Cloud Run, and a long random `IP_HASH_SECRET`
- [ ] `IP_LIMITS=on` and `NEW_ACCOUNT_PROBATION=on` (the defaults)
- [ ] Database backups and a tested restore
- [ ] Crash reporting that never sends request text
- [ ] An uptime check on `/health`
- [ ] Support email address, shown in the app and the store listing
