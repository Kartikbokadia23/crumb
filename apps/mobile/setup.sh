#!/bin/bash
set -e

echo "=== Crumb React Native Setup ==="
echo ""

# Install workspace dependencies from repo root
cd "$(dirname "$0")/../.."
echo "Installing workspace dependencies..."
npm install

# Go to mobile app
cd apps/mobile

# Check for .env file
if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
  echo "IMPORTANT: Edit apps/mobile/.env with your Splitwise credentials"
fi

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit apps/mobile/.env with your SPLITWISE_CLIENT_ID and SPLITWISE_CLIENT_SECRET"
echo "  2. For Android: npx expo run:android (from apps/mobile/)"
echo "  3. For iOS: npx expo run:ios (from apps/mobile/)"
echo ""
echo "For native notification listener (Android):"
echo "  1. npx expo prebuild --platform android"
echo "  2. Copy android-native/*.kt to android/app/src/main/java/com/flatwise/crumb/"
echo "  3. Register CrumbNativePackage in MainApplication"
echo "  4. Add service to AndroidManifest.xml (see android-native/README.md)"
echo "  5. npx expo run:android"
