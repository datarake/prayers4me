# Android release

How to build the signed bundle for Google Play and put the app on a phone. Store texts are in [store-listing.md](./store-listing.md).

## The upload key

The bundle is signed with an **upload key** kept outside the repository:

- `~/.stillflame/upload.jks` is the keystore (alias `upload`, RSA 2048, valid about 27 years).
- `~/.stillflame/upload.env` holds its path and password as environment variables. Only you can read it.

**Back both files up now** (a password manager's secure attachment is enough). If they are lost, Google can reset the upload key through support, but it takes days. With Play App Signing, Google keeps the real app signing key, so a leaked upload key can be replaced; it cannot be used to impersonate the app on its own.

Never commit them. `*.jks` is not needed in `.gitignore` because the files live in your home folder.

## Build the bundle

```bash
cd apps/mobile && ./scripts/build-android-release.sh
```

Needs Node 22, JDK 17 or newer, and the Android SDK. It:

1. Sets `EXPO_PUBLIC_API_URL=https://api.stillflame.app` and `EXPO_PUBLIC_AUTH_MODE=firebase` (baked into the JavaScript).
2. Regenerates the `android/` folder (it is not kept in git) with `expo prebuild --clean`. `plugins/withUploadSigning.js` adds the release signing from the key above.
3. Runs `./gradlew bundleRelease` and copies the result to `apps/mobile/dist/stillflame-<version>-<versionCode>.aab`.

Before each upload to Play, raise `versionCode`: add `"versionCode": N` under `expo.android` in `app.json` (Play refuses a code it has already seen). `version` is the number people see.

Kotlin is pinned to 2.4.0 (`expo-build-properties` in `app.json`), because the Firebase Auth library is built with it. Remove the pin when Expo's default catches up.

## Put the app on your own phone

A phone with USB debugging on:

```bash
adb devices
cd apps/mobile
adb reverse tcp:8080 tcp:8080 && adb reverse tcp:8081 tcp:8081
pnpm exec expo run:android --device <serial>
pnpm exec expo start --dev-client --port 8081
```

This is a development build. It reaches the API on your computer through `adb reverse`, with the dev login (`AUTH_MODE=dev`). It does not need App Check.

A **release** build cannot be tried against `api.stillflame.app` yet. The API demands an App Check token, and a real token needs the app installed from Google Play (Play Integrity). Until the Play account is verified, test releases against the local API, or register an App Check debug token (see [development.md](./development.md)).

## Order of work in Play Console

The developer account is still being verified by Google. When it is approved:

1. **Create the app** (name Stillflame, default language English, free, app, not a game). Package name: `app.stillflame.mobile`.
2. **Play App Signing**: accept it. Upload `dist/*.aab` to an **internal testing** release first.
3. **Store listing**: paste the texts from `store-listing.md` for the six languages, add the icon, the feature graphic and screenshots.
4. **App content**: privacy policy URL, data safety (answers in `store-listing.md`), content rating questionnaire, target age 16+, ads: none, user-generated content: yes (report and delete are in the app), the news, government, health and financial declarations: all no.
5. **Testing**: a new personal account must run a **closed test with at least 12 testers for 14 days** before production access. Recruit them early.
6. **App Check**: link the Firebase project's cloud project under Setup, App integrity. In the Firebase console, register the Play Integrity provider for the Android app and add the SHA-256 fingerprint of the **app signing key** (Play Console, Test and release, App signing) and of the upload key. Then turn on `APP_CHECK=enforce` is already set on the API; only real Play installs will pass.
7. Promote to production after the closed test.

## Still needed before the first Play upload

- A real phone check through the Play Console app (Google asks this of new accounts).
- Screenshots in the six languages and the feature graphic.
- Native-speaker review of the Spanish, French, Romanian, Ukrainian and Russian texts.
