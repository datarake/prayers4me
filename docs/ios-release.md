# iOS release

How to build Stillflame for TestFlight and the App Store. Store texts are in [store-listing.md](./store-listing.md). The Android counterpart is [android-release.md](./android-release.md).

## Accounts and identifiers

| Item | Value |
|------|-------|
| Apple Developer Program | Individual, Apple Account `burdibox@gmail.com`, renews November 10, 2027 |
| Team ID | `HM348ZXGU4` (set in `app.json` as `ios.appleTeamId`) |
| Bundle ID | `app.stillflame.mobile` (App ID registered with App Attest and Push Notifications) |
| Firebase iOS app | `Stillflame iOS`, Team ID saved, registered under App Check with App Attest |

## State on 2026-11-09

- **A signed App Store build exists:** `apps/mobile/dist/stillflame-0.1.0-1.ipa` (24 MB, version 0.1.0, build 1). It is signed with `Apple Distribution: Bogdan Burdalescu (HM348ZXGU4)` and the profile `iOS Team Store Provisioning Profile: app.stillflame.mobile` (valid to 2027-11-09). Its entitlements are `aps-environment: production`, App Attest `production`, `get-task-allow: false`. It holds the production API address.
- **Uploaded to TestFlight (2026-11-09):** app record `Stillflame` (App Store Connect id `6832467196`, version record 1.0). Build 0.1.0 (1) was uploaded with Transporter and processed. It showed "Missing Compliance" until the export-compliance question was answered by hand. Later builds carry `ITSAppUsesNonExemptEncryption=false` (set in `app.json`), so Apple will not ask again.
- **Second build, 1.0.0 (2), uploaded with Transporter (2026-11-09):** `dist/stillflame-1.0.0-2.ipa`. It carries the Expo project ID (`extra.eas.projectId` in `app.json`), so the app can register for push. The Apple push key `68NQ6APS97` is stored in Expo for `app.stillflame.mobile` (uploaded with `eas credentials`, without an Apple login). Exporting needs the Apple Distribution certificate under the team's Xcode account (`burdibox@gmail.com`); an old signed-out `mocha.global` login in the keychain only adds noise to the log.
- **Submitted for App Review (2026-11-10):** version 1.0, build 1.0.0 (2), free, all 175 countries, automatic release after approval. App Store Connect said review can take up to 48 hours and sends an email when done. Filled in before submitting: description, keywords, promotional text, subtitle "Anonymous prayer requests", category Lifestyle, support and marketing URL `https://stillflame.app`, review notes (no sign-in), age rating (calculated 13+, overridden to 16+ to match the terms), Content Rights ("yes, third-party content, I have the rights", because the app shows other people's requests and the terms allow it), privacy policy `https://stillflame.app/privacy/` and the App Privacy label (all types listed in `store-listing.md`, none used for tracking), screenshots from `store-assets/app-store/` (iPhone 6.3-inch set `iphone-6.3`, iPad 13-inch set `ipad-13`), the Digital Services Act trader answer. If Apple rejects it, the reply arrives in the Resolution Center and by email at the Apple Account address.
- **App Review asked for more information (2026-11-22):** version 1.0 was marked "2.1.0 Performance: App Completeness". Apple wants a screen recording from a physical device plus six answers in Notes. The new Notes (text in [app-review-reply.md](./app-review-reply.md)) are saved in App Store Connect. China mainland was removed from availability (174 countries now), because Apple requires a permit there for apps with religious content. Build 1.0.0 (3) (`dist/stillflame-1.0.0-3.ipa`, built with Node 22, production entitlements checked) was uploaded with Transporter and attached to version 1.0 in place of build 2. Still to do before resubmitting: attach the screen recording and press Update Review.
- **Build 1.0.0 (4) (2026-11-22):** `dist/stillflame-1.0.0-4.ipa`, the same changes as Android build 7 (My requests fixes, the evening reminder). Production entitlements checked. `ios/ExportOptions.plist` is wiped when the `ios/` folder is regenerated: recreate it from the description below before exporting. Uploaded straight from the archive with `xcodebuild -exportArchive` and `destination` set to `upload` (no Transporter needed; Transporter then refuses the same build number and does not list builds it did not send). Version 1.0 was taken out of the Nov 10 submission (shows "Developer Rejected") and build 4 attached in place of build 3. Still to do: attach the screen recording and press Add for Review.
- **Version numbers:** the store record is 1.0 and this build is 0.1.0, which is fine for TestFlight. For the store submission, set `version` to `1.0.0` and raise the build number first.
- Xcode's preferences file does not list the new account, but signing with `-allowProvisioningUpdates` works. Do not trust `defaults read com.apple.dt.Xcode` for accounts.
- Exporting for the first time created an **Apple Distribution certificate** for the team (visible under Certificates in the developer portal).

## Build steps

```bash
cd apps/mobile
export EXPO_PUBLIC_API_URL=https://api.stillflame.app EXPO_PUBLIC_AUTH_MODE=firebase NODE_ENV=production
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
pnpm exec expo prebuild --platform ios --no-install   # entitlements and team come from app.json
cd ios && pod install
```

Then archive and export for App Store Connect from the command line (this is how the current `.ipa` was made; the `ExportOptions.plist` uses method `app-store-connect`, team `HM348ZXGU4`, automatic signing, destination `export`):

```bash
xcodebuild -workspace Stillflame.xcworkspace -scheme Stillflame -configuration Release \
  -destination 'generic/platform=iOS' -archivePath build/Stillflame.xcarchive \
  -allowProvisioningUpdates DEVELOPMENT_TEAM=HM348ZXGU4 CODE_SIGN_STYLE=Automatic archive
xcodebuild -exportArchive -archivePath build/Stillflame.xcarchive -exportPath build/export \
  -exportOptionsPlist ExportOptions.plist -allowProvisioningUpdates
```

You can also do it in Xcode: open `Stillflame.xcworkspace`, target Stillflame, Signing and Capabilities, Automatically manage signing, Team `HM348ZXGU4`, choose **Any iOS Device**, then Product, Archive, Distribute App.

Raise `ios.buildNumber` in `app.json` before every upload (App Store Connect refuses a build number it has seen). `version` is the number people see.

`aps-environment` is `development` in the generated project and in the development-signed archive. The exported App Store build has it as `production` (checked on 2026-11-09 with `codesign -d --entitlements :-`). Check it again after any change to the push setup.

## Before the first TestFlight upload

1. **App Store Connect:** create the app record (name Stillflame, bundle ID `app.stillflame.mobile`, primary language English). As an individual, your name and address can appear on the store page. Answer the "trader" question under the EU Digital Services Act yourself.
2. **Push key:** create an Apple Push Notifications key (`.p8`) under Certificates, Identifiers & Profiles, Keys, and give it to Expo's push service so iPhones get "someone prayed" notifications. Keep the file safe. Without it, push does not work on iOS.
3. **Privacy and review fields:** use the App Store section of `store-listing.md` (privacy label, reviewer notes, age rating).
4. **Screenshots:** 6.9-inch iPhone and 13-inch iPad (the app supports tablets).
5. **TestFlight:** internal testers need no review. External testers need a beta review.

## Testing on a real iPhone before release

A development build on a device uses the App Check **debug** provider, like the simulator. Run it once, find the debug token in the Xcode console, and register it in the Firebase console under App Check, Apps, `Stillflame iOS`, ⋮, Manage debug tokens. Release and TestFlight builds use App Attest and need no token.
