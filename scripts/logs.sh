#!/usr/bin/env bash
set -euo pipefail

SDK_ROOT="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/opt/homebrew/share/android-commandlinetools}}"
ADB_BIN="$SDK_ROOT/platform-tools/adb"
DEVICE_SERIAL="${ANDROID_SERIAL:-}"
ADB=("$ADB_BIN")
if [[ -n "$DEVICE_SERIAL" ]]; then
  ADB=("$ADB_BIN" -s "$DEVICE_SERIAL")
fi

if ! "$ADB_BIN" devices | grep -q "device$"; then
  echo "No Android device/emulator found. Run scripts/start-emulator.sh first."
  exit 1
fi

"${ADB[@]}" logcat -c
"${ADB[@]}" logcat FlatwiseListener:D Crumb:D AndroidRuntime:E '*:S'
