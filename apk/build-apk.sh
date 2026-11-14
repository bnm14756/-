#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=== Pleos Smart Motion Guard Android APK Builder ==="
echo "1) Building web bundle (dist/)..."
cd "${ROOT_DIR}"
npm run build

echo "2) Setting up Capacitor Android project inside apk/..."
cd "${SCRIPT_DIR}"
if [ ! -d "node_modules/@capacitor/android" ]; then
  npm install --no-save @capacitor/core @capacitor/cli @capacitor/android
fi

if [ ! -d "android" ]; then
  npx cap add android
fi

npx cap sync android

echo "3) Compiling Android Debug APK with Gradle..."
cd "${SCRIPT_DIR}/android"
chmod +x ./gradlew
./gradlew assembleDebug

APK_OUT="${SCRIPT_DIR}/pleos-smart-motion-guard.apk"
cp "${SCRIPT_DIR}/android/app/build/outputs/apk/debug/app-debug.apk" "${APK_OUT}"
echo "SUCCESS! APK generated at: ${APK_OUT}"
