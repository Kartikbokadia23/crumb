#!/usr/bin/env bash
set -euo pipefail

AVD_NAME="${AVD_NAME:-FlatwisePixel}"
SDK_ROOT="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/opt/homebrew/share/android-commandlinetools}}"
ADB="$SDK_ROOT/platform-tools/adb"
EMULATOR="$SDK_ROOT/emulator/emulator"

if "$ADB" devices | grep -q "device$"; then
  echo "Android device/emulator is already connected:"
  "$ADB" devices
  exit 0
fi

if ! "$EMULATOR" -list-avds | grep -qx "$AVD_NAME"; then
  echo "AVD '$AVD_NAME' was not found. Available AVDs:"
  "$EMULATOR" -list-avds
  exit 1
fi

echo "Starting emulator '$AVD_NAME'..."
nohup "$EMULATOR" -avd "$AVD_NAME" -netdelay none -netspeed full >/tmp/crumb-emulator.log 2>&1 &

echo "Waiting for Android to boot..."
"$ADB" wait-for-device
until [[ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '')" == "1" ]]; do
  sleep 2
done

echo "Emulator is ready."
