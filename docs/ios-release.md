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
- **Not uploaded:** the app record does not exist in App Store Connect yet, and uploading is a separate step (see below).
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
