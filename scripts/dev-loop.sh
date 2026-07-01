#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SDK_ROOT="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/opt/homebrew/share/android-commandlinetools}}"
ADB_BIN="$SDK_ROOT/platform-tools/adb"
JAVA_HOME_VALUE="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21}"
RUN_TESTS=1
SEND_SAMPLE=1
RESET_APP=0
DEVICE_SERIAL="${ANDROID_SERIAL:-}"
ENABLE_LISTENER=1

usage() {
  cat <<'EOF'
Usage: ./scripts/dev-loop.sh [options]

Options:
  --device SERIAL   Install to a specific adb device/phone/emulator.
  --skip-tests      Build faster by skipping unit tests.
  --no-sample       Do not send the mock Blinkit alert after launch.
  --reset           Clear Crumb and Mock Bank app data before launch.
  --manual-listener Do not enable notification listener via adb.
  --help            Show this help.

Examples:
  ./scripts/dev-loop.sh --skip-tests
  ./scripts/dev-loop.sh --device RZCW123456A --skip-tests --no-sample
  ANDROID_SERIAL=RZCW123456A ./scripts/dev-loop.sh --skip-tests
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --device)
      DEVICE_SERIAL="${2:-}"
      if [[ -z "$DEVICE_SERIAL" ]]; then
        echo "--device needs a serial from: $ADB_BIN devices -l"
        exit 1
      fi
      shift 2
      ;;
    --skip-tests) RUN_TESTS=0; shift ;;
    --no-sample) SEND_SAMPLE=0; shift ;;
    --reset) RESET_APP=1; shift ;;
    --manual-listener) ENABLE_LISTENER=0; shift ;;
    --help) usage; exit 0 ;;
    *) echo "Unknown argument: $1"; usage; exit 1 ;;
  esac
done

CONNECTED_DEVICES=()
while IFS= read -r device; do
  CONNECTED_DEVICES+=("$device")
done < <("$ADB_BIN" devices | awk 'NR > 1 && $2 == "device" {print $1}')

if [[ -z "$DEVICE_SERIAL" ]]; then
  if [[ "${#CONNECTED_DEVICES[@]}" -eq 0 ]]; then
    echo "No Android device/emulator found."
    echo "For emulator: ./scripts/start-emulator.sh"
    echo "For phone: enable USB debugging, plug it in, then accept the trust popup."
    exit 1
  elif [[ "${#CONNECTED_DEVICES[@]}" -gt 1 ]]; then
    echo "More than one Android device is connected. Choose one:"
    "$ADB_BIN" devices -l
    echo "Then run: ./scripts/dev-loop.sh --device SERIAL"
    exit 1
  else
    DEVICE_SERIAL="${CONNECTED_DEVICES[0]}"
  fi
fi

ADB=("$ADB_BIN" -s "$DEVICE_SERIAL")

echo "Target device: $DEVICE_SERIAL"

cd "$ROOT_DIR"

if [[ "$RUN_TESTS" == "1" ]]; then
  echo "Building Crumb, Mock Bank, and running parser tests..."
  JAVA_HOME="$JAVA_HOME_VALUE" ./gradlew testDebugUnitTest :app:assembleDebug :mockbank:assembleDebug
else
  echo "Building Crumb and Mock Bank..."
  JAVA_HOME="$JAVA_HOME_VALUE" ./gradlew :app:assembleDebug :mockbank:assembleDebug
fi

if [[ "$RESET_APP" == "1" ]]; then
  echo "Resetting app data..."
  "${ADB[@]}" shell pm clear com.flatwise.app.debug >/dev/null || true
  "${ADB[@]}" shell pm clear com.flatwise.mockbank >/dev/null || true
fi

echo "Installing debug APKs directly to $DEVICE_SERIAL..."
"${ADB[@]}" install -r "$ROOT_DIR/app/build/outputs/apk/debug/app-debug.apk" >/dev/null
"${ADB[@]}" install -r "$ROOT_DIR/mockbank/build/outputs/apk/debug/mockbank-debug.apk" >/dev/null

"${ADB[@]}" shell pm grant com.flatwise.mockbank android.permission.POST_NOTIFICATIONS >/dev/null 2>&1 || true

if [[ "$ENABLE_LISTENER" == "1" ]]; then
  "${ADB[@]}" shell cmd notification allow_listener com.flatwise.app.debug/com.flatwise.app.notifications.FlatwiseNotificationListener >/dev/null 2>&1 || true
fi

echo "Launching Crumb..."
"${ADB[@]}" shell am start -n com.flatwise.app.debug/com.flatwise.app.MainActivity >/dev/null

if [[ "$SEND_SAMPLE" == "1" ]]; then
  ANDROID_SERIAL="$DEVICE_SERIAL" "$ROOT_DIR/scripts/send-alert.sh" hdfc-upi-blinkit >/dev/null
  echo "Sent one realistic Blinkit alert through Mock Bank."
fi

echo "Done. Crumb is now running on $DEVICE_SERIAL. For logs: ANDROID_SERIAL=$DEVICE_SERIAL ./scripts/logs.sh"
