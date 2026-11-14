#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APK_DIR="${ROOT_DIR}/apk"
OUT_APK="${APK_DIR}/pleos-guard.apk"
STAGE_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "${STAGE_DIR}"
}
trap cleanup EXIT

mkdir -p "${APK_DIR}"

echo "=================================================="
echo " Pleos Smart Motion Guard — Android APK Build"
echo "=================================================="
echo "[1/4] Checking Android build environment..."

if command -v gradle >/dev/null 2>&1 && [ -n "${ANDROID_HOME:-}" ]; then
  echo " -> Android SDK & Gradle detected at ${ANDROID_HOME}. Running native build..."
  cd "${APK_DIR}"
  if [ -x "./build-apk.sh" ]; then
    ./build-apk.sh
    if [ -f "${APK_DIR}/pleos-smart-motion-guard.apk" ]; then
      cp "${APK_DIR}/pleos-smart-motion-guard.apk" "${OUT_APK}"
      echo "[DONE] Native APK generated at: ${OUT_APK}"
      exit 0
    fi
  fi
fi

echo " -> Android SDK/Gradle not detected. Entering SIMULATED Android build environment..."
echo "[2/4] Preparing simulated AndroidManifest.xml, resources & web assets..."

mkdir -p "${STAGE_DIR}/META-INF" "${STAGE_DIR}/assets/www" "${STAGE_DIR}/res/drawable"

cat > "${STAGE_DIR}/AndroidManifest.xml" <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.hyundai.pleos.motionguard"
    android:versionCode="1"
    android:versionName="1.0.0">
    <uses-sdk android:minSdkVersion="23" android:targetSdkVersion="34" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <application
        android:label="Pleos Smart Motion Guard"
        android:icon="@drawable/icon">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@android:style/Theme.DeviceDefault.NoActionBar">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

cat > "${STAGE_DIR}/META-INF/MANIFEST.MF" <<'EOF'
Manifest-Version: 1.0
Created-By: Pleos Simulated Android Builder 1.0
Package: com.hyundai.pleos.motionguard
App-Name: Pleos Smart Motion Guard
Build-Mode: SIMULATED-DUMMY-ARTIFACT
EOF

cat > "${STAGE_DIR}/BUILD-INFO.txt" <<EOF
Artifact: pleos-guard.apk
App: Pleos Smart Motion Guard (com.hyundai.pleos.motionguard)
Build Mode: Simulated Android Build Environment (Dummy APK Artifact)
Generated At: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Note: This archive was generated in a simulated Android build environment without Android SDK/aapt2/apksigner. For real Android device installation, use WebAPK install or run .github/workflows/build-android-apk.yml on GitHub Actions.
EOF

if [ -f "${ROOT_DIR}/public/pwa-512x512.png" ]; then
  cp "${ROOT_DIR}/public/pwa-512x512.png" "${STAGE_DIR}/res/drawable/icon.png"
fi

if [ -d "${ROOT_DIR}/dist" ]; then
  cp -r "${ROOT_DIR}/dist/." "${STAGE_DIR}/assets/www/"
elif [ -f "${ROOT_DIR}/index.html" ]; then
  cp "${ROOT_DIR}/index.html" "${STAGE_DIR}/assets/www/index.html"
fi

echo "[3/4] Packaging simulated APK archive (${OUT_APK})..."
python3 - <<PY
import os, zipfile

stage_dir = "${STAGE_DIR}"
out_apk = "${OUT_APK}"

with zipfile.ZipFile(out_apk, "w", compression=zipfile.ZIP_DEFLATED) as zf:
    for root, _, files in os.walk(stage_dir):
        for fname in sorted(files):
            full = os.path.join(root, fname)
            rel = os.path.relpath(full, stage_dir)
            zf.write(full, rel)

print(f"Packaged {out_apk} ({os.path.getsize(out_apk)} bytes)")
PY

echo "[4/4] Simulated APK artifact ready: ${OUT_APK}"
