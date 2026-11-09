#!/usr/bin/env bash
# Builds the signed Android App Bundle (.aab) for Google Play.
# Needs: Node 22, JDK 17+, the Android SDK, and ~/.stillflame/upload.env (the upload key, kept out of git).
# Output: apps/mobile/dist/stillflame-<version>-<code>.aab
set -euo pipefail
cd "$(dirname "$0")/.."

KEYENV="${STILLFLAME_KEYENV:-$HOME/.stillflame/upload.env}"
[ -f "$KEYENV" ] || { echo "Missing $KEYENV (the upload key). See docs/android-release.md." >&2; exit 1; }
# shellcheck disable=SC1090
source "$KEYENV"

# These values are baked into the JavaScript bundle.
export EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-https://api.stillflame.app}"
export EXPO_PUBLIC_AUTH_MODE=firebase
export NODE_ENV=production
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8

pnpm exec expo prebuild --platform android --clean --no-install
( cd android && ./gradlew bundleRelease )

VERSION=$(node -p "require('./app.json').expo.version")
CODE=$(sed -n 's/.*versionCode \([0-9]*\).*/\1/p' android/app/build.gradle | head -1)
mkdir -p dist
OUT="dist/stillflame-${VERSION}-${CODE}.aab"
cp android/app/build/outputs/bundle/release/app-release.aab "$OUT"
echo "Built $OUT"
keytool -printcert -jarfile "$OUT" | grep -E "SHA256|Owner" || true
