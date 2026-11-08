# Privacy policy (DRAFT)

> **Draft for legal review.** This describes what the product does today so a lawyer can finish it. It is not legal advice and must not be published as it is. Items in [brackets] are decisions or facts only you can fill in.

**Controller:** [legal name and address]
**Contact:** [support email]
**Last updated:** [date]

## What Stillflame is

A place to ask for prayer and to pray for others, anonymously. People who pray see your request. You see how many people prayed, never who.

## What we collect

| Data | Why | Who can see it |
|------|-----|----------------|
| An anonymous account identifier (Firebase Authentication, Google), created on your phone without asking you anything | So the app knows your requests are yours. There is no email, password or phone number to sign up. Deleting your data deletes this account too. | Only the server and Google, who issue it |
| A proof from Apple or Google that the call comes from a genuine copy of the app (App Check: App Attest or DeviceCheck on iPhone, Play Integrity on Android) | To stop scripts and modified apps from flooding the service | Apple or Google, and the server, which only checks that the proof is valid |
| Your requests: the name or nickname you choose, the text, the language | To show them to people who pray in that language | Everyone in that language |
| Optional phone or email, if you add contact details | [Decide the purpose. Today the server never shows it to anyone but you.] | Only you |
| Which device prayed for which request | To count prayers once per person | Only the server. You see counts, never who |
| Reports you make about a request | Moderation | Moderators |
| Your push notification token, only if you turn notifications on | To tell you when someone prays | Only the server and the push service |
| Your language | To show you the right requests | Only the server |
| A fingerprint of your network address, salted and changed every day | To stop one person flooding the app with many accounts. It cannot be used to follow you across days. | Only the server |

Your requests can describe health, family and faith. That is sensitive information. We ask for your agreement when you send one, and we use it only to show your request to the community and to keep the community safe.

## Usage and crash reports (only if you agree)

Under Settings, "Help improve the app" is **off until you turn it on**. Nothing is collected before that, and turning it off again stops collection and asks Google to clear the analytics data held for your device.

If you turn it on, the app uses Firebase Analytics and Firebase Crashlytics (Google) to send:

- which screens are opened and a short list of anonymous actions, for example "a request was sent" with its language, "someone prayed", "the language was changed";
- reports when the app crashes or the server fails, with the technical details needed to fix it.

These reports never contain what you write, names, contact details, ids of requests, or who you pray for. The app only sends actions from a fixed list, with values from fixed choices, and removes anything that looks like an id, an email or a phone number from error details. We do not use advertising identifiers, we do not use Google's advertising features, and we do not link these reports to an account (there is none). Firebase still receives the technical identifier of the app installation and a rough location derived from the network address, as part of how it works. [Confirm retention settings in the Firebase console and state them here.]

## What we do not collect

No advertising identifier, no location from your phone, no contacts. Without your agreement above, no usage tracking or crash reporting at all. We measure whether the service works with counts computed on the server (for example how many requests received a prayer within a day). Request text is not used for that.

## How long we keep it

- Your requests stay until you delete them, or delete your account.
- Earlier versions of an edited request are kept so moderators can review reported requests. [Decide how long.]
- Requests you delete are removed from view at once. [Decide when they are erased from the database. Today the row is kept hidden, which needs a scheduled clean-up before launch.]
- Deleting your data in Settings erases your account, your requests, your prayers and your reports straight away.
- Moderation records about bans [decide the period].

## Your rights

You can delete everything in the app under Settings, Delete my data. To ask for a copy of your data or to object to something, write to [support email]. [Add the supervisory authority and rights wording required in your country.]

## Who helps us run it

[Hosting provider, for example Google Cloud, and where the data is stored], the push service (Expo and Apple or Google), and Google (Firebase Authentication and App Check, always; Firebase Analytics and Crashlytics, only if you agree to usage and crash reports), and Apple or Google for the attestation. We do not sell data and we show no ads.

## Children

[Decide the minimum age. Many countries require 16 for consent-based processing.]

## Changes

[How we tell you about changes.]
