#!/usr/bin/env bash
set -euo pipefail

SDK_ROOT="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/opt/homebrew/share/android-commandlinetools}}"
ADB_BIN="$SDK_ROOT/platform-tools/adb"
DEVICE_SERIAL="${ANDROID_SERIAL:-}"
ADB=("$ADB_BIN")
if [[ -n "$DEVICE_SERIAL" ]]; then
  ADB=("$ADB_BIN" -s "$DEVICE_SERIAL")
fi
ALERT_NAME="${1:-hdfc-upi-blinkit}"

case "$ALERT_NAME" in
  hdfc-upi-blinkit)
    ALERT='Sent Rs.270.00 From HDFC Bank A/C *8899 To Blinkit On 31/05/26 Ref 651715008613 Not You? Call 18002586161/SMS BLOCK UPI to 7308080808'
    ;;
  hdfc-card-instamart)
    ALERT='Spent Rs.203 On HDFC Bank Card 1116 At PYU*Instamart Grocery On 2026-03-19:16:10:45.Not You? To Block+Reissue Call 18002586161/SMS BLOCK CC 1116 to 7308080808'
    ;;
  pluxee-swiggy-inst)
    ALERT='Rs. 352.00 spent from Pluxee Meal wallet, card no.xx8691 on 22-03-2026 14:42:11 at SWIGGY INST . Avl bal Rs.2646.24. Not you call 18002106919'
    ;;
  icici-blinkit)
    ALERT='ICICI Bank Credit Card XX8006 debited for INR 598.00 on 12-Jun-26 for UPI-652977384174-Blinkit. To dispute call 18001080/SMS BLOCK 8006 to 9215676766'
    ;;
  zepto)
    ALERT='Rs. 1100.00 spent from Pluxee Meal wallet, card no.xx8691 on 15-01-2026 19:16:10 at ZEPTO . Avl bal Rs.1246.34. Not you call 18002106919'
    ;;
  *)
    echo "Unknown sample '$ALERT_NAME'. Available: hdfc-upi-blinkit, hdfc-card-instamart, pluxee-swiggy-inst, icici-blinkit, zepto"
    exit 1
    ;;
esac

if ! "$ADB_BIN" devices | grep -q "device$"; then
  echo "No Android device/emulator found. Run scripts/start-emulator.sh first."
  exit 1
fi

"${ADB[@]}" shell pm grant com.flatwise.mockbank android.permission.POST_NOTIFICATIONS >/dev/null 2>&1 || true
"${ADB[@]}" shell "am broadcast -n com.flatwise.mockbank/.MockBankReceiver --es alert '$ALERT'" >/dev/null

echo "Posted sample alert: $ALERT_NAME"
