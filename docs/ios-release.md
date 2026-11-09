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

- An **unsigned release build for a real device compiles** (Xcode 26.6, `-configuration Release -sdk iphoneos`, 61 MB). It holds the production API address, the App Check header and the Firebase config. It cannot be installed or uploaded, because it is not signed.
- **A signed archive is not possible yet:** Xcode on this Mac does not list the `HM348ZXGU4` team, and there is no distribution certificate for it. Sign in with `burdibox@gmail.com` under Xcode, Settings, Accounts, and wait for the team to appear.

## Build steps (once the team shows in Xcode)

```bash
cd apps/mobile
export EXPO_PUBLIC_API_URL=https://api.stillflame.app EXPO_PUBLIC_AUTH_MODE=firebase NODE_ENV=production
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
pnpm exec expo prebuild --platform ios --no-install   # entitlements and team come from app.json
cd ios && pod install
```

Then either open `Stillflame.xcworkspace` in Xcode (target Stillflame, Signing and Capabilities, Automatically manage signing, Team `HM348ZXGU4`), choose **Any iOS Device**, and use Product, Archive, then Distribute App, App Store Connect. Or from the command line:

```bash
xcodebuild -workspace Stillflame.xcworkspace -scheme Stillflame -configuration Release \
  -destination 'generic/platform=iOS' -archivePath build/Stillflame.xcarchive \
  -allowProvisioningUpdates archive
```

Raise `ios.buildNumber` in `app.json` before every upload (App Store Connect refuses a build number it has seen). `version` is the number people see.

`aps-environment` is written as `development` in the generated project. Distribution signing replaces it with `production`. Check this in the archive's entitlements before the first upload.

## Before the first TestFlight upload

1. **App Store Connect:** create the app record (name Stillflame, bundle ID `app.stillflame.mobile`, primary language English). As an individual, your name and address can appear on the store page. Answer the "trader" question under the EU Digital Services Act yourself.
2. **Push key:** create an Apple Push Notifications key (`.p8`) under Certificates, Identifiers & Profiles, Keys, and give it to Expo's push service so iPhones get "someone prayed" notifications. Keep the file safe. Without it, push does not work on iOS.
3. **Privacy and review fields:** use the App Store section of `store-listing.md` (privacy label, reviewer notes, age rating).
4. **Screenshots:** 6.9-inch iPhone and 13-inch iPad (the app supports tablets).
5. **TestFlight:** internal testers need no review. External testers need a beta review.

## Testing on a real iPhone before release

A development build on a device uses the App Check **debug** provider, like the simulator. Run it once, find the debug token in the Xcode console, and register it in the Firebase console under App Check, Apps, `Stillflame iOS`, ⋮, Manage debug tokens. Release and TestFlight builds use App Attest and need no token.
