# Reply to App Review (information request, 2026-11-22)

Apple asked for a screen recording plus six items in the **Notes** field of App Review Information. Paste the block below into Notes (it is under the 4000-character limit), attach or link the recording, and resubmit.

Stillflame has no login, so there is no demo account to give. Leave "Sign-in required" unchecked.

## Text for the Notes field

```text
1. SCREEN RECORDING
Attached to this submission (Attachment field). Recorded on a physical iPhone running the latest iOS, starting from launching the app, showing asking for prayer, editing and deleting a request, praying, reporting, blocking, notifications and "Delete my data".

2. PURPOSE AND AUDIENCE
Stillflame is an anonymous prayer-request app for adults and teens aged 16+. People going through a hard time (illness, grief, family or money trouble) write a short request. Others who pray read it and tap "I prayed". The author sees how many people prayed, never who. The value is feeling less alone without having to expose your identity or join a social network. There are no profiles, comments, chat or followers.

3. HOW TO USE THE APP
No sign-in is needed and there is no account registration: on first launch the app creates an anonymous ID in the background. There are no demo credentials because none are required.
- Launch, pick a language (English, Spanish, French, Romanian, Ukrainian, Russian).
- Ask for prayer: tap the ask option, write a name (any name) and a message, send. It appears under your requests with its prayer count. You can Edit or Delete it from there.
- Pray for others: open the Pray tab, read a request, tap "I prayed" (once per request). Settings > "Requests I prayed for" lists them.
- Notifications (optional): the app offers one quiet notification when someone prays for you.
- Delete data: Settings > "Delete my data" > "Delete everything" removes all requests, prayers and settings for this device's anonymous ID. This is the account-deletion equivalent.
- Paid content: none. The app is free, with no in-app purchases or subscriptions.

User-generated content safeguards:
- Every request in the feed has Report (reasons include spam and abusive content).
- The same sheet has "Block this person": the blocked author's requests disappear from your feed immediately. Settings > "Unblock everyone" undoes it.
- Requests with enough reports are hidden automatically; a moderator reviews reports within 24 hours, removes harmful content and bans repeat offenders.
- Rate limits stop flooding. Users accept the terms (https://stillflame.app/terms), which forbid objectionable content.
- Starter content: to avoid an empty feed at launch, the feed includes a small set of example requests written by the developer. They are marked in our database and will be removed as real requests come in.

4. EXTERNAL SERVICES
- Firebase Authentication (anonymous sign-in only)
- Firebase App Check with Apple App Attest (blocks requests from non-genuine apps)
- Firebase Analytics and Crashlytics (usage statistics and crash reports, no tracking, no ads)
- Google Cloud Run and Cloud SQL (PostgreSQL) for our own API and database
- Expo Push Service and Apple Push Notification service for the optional notification
No AI services, no payment processors, no third-party data providers, no ads.

5. REGIONAL DIFFERENCES
The app works the same in every region. The only difference is the language the user chooses: each language has its own feed, so people see requests written in that language. The app is not offered in China mainland.

6. REGULATED INDUSTRY / THIRD-PARTY MATERIAL
Not applicable. The app is not in a regulated industry and shows no licensed or protected third-party material; all content is written by users (or by us, for the starter requests). It is a place for support and tells users it does not replace professional help or emergency services.

Contact: support@stillflame.app
```

## What to record (iPhone, latest iOS)

Use a real iPhone with the App Store build (TestFlight or the build under review), not the simulator. Start the iOS screen recording from Control Center, then:

1. Show the home screen and **launch Stillflame** (the recording must start here).
2. Welcome screen, choose a language.
3. **Ask for prayer:** write a name and a message, send it. Show it in your requests with its count.
4. **Edit** the request, save. Then show **Delete** on it (you can delete it at the end instead).
5. **Pray tab:** scroll the feed, open a request, tap **I prayed**.
6. **Report:** on another request open Report, pick a reason, submit, show "Thank you. We will review it."
7. **Block:** open the same sheet on a request, tap **Block this person**, confirm, show the request gone from the feed.
8. Accept the notification prompt (or show the toggle in Settings).
9. **Settings:** show "Requests I prayed for", the blocked-people count and "Unblock everyone".
10. **Delete my data:** tap it, confirm "Delete everything", show "Your data was deleted".

About 2 to 3 minutes is enough. Upload it somewhere Apple can open without signing in (an unlisted YouTube video or a public file link) and put the link at the top of the Notes.
