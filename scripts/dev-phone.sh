#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SDK_ROOT="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/opt/homebrew/share/android-commandlinetools}}"
ADB="$SDK_ROOT/platform-tools/adb"

PHONES=()
while IFS= read -r phone; do
  PHONES+=("$phone")
done < <("$ADB" devices -l | awk 'NR > 1 && $2 == "device" && $1 !~ /^emulator-/ {print $1}')

if [[ "${#PHONES[@]}" -eq 0 ]]; then
  echo "No physical Android phone is connected."
  echo "On your phone: enable Developer options > USB debugging, plug it in, and accept the trust popup."
  echo "Then check: $ADB devices -l"
  exit 1
fi

if [[ "${#PHONES[@]}" -gt 1 ]]; then
  echo "More than one physical phone is connected:"
  "$ADB" devices -l
  echo "Use: ./scripts/dev-loop.sh --device SERIAL --skip-tests --no-sample"
  exit 1
fi

"$ROOT_DIR/scripts/dev-loop.sh" --device "${PHONES[0]}" --skip-tests --no-sample "$@"
