# Crumb

Crumb turns grocery and food payment alerts into reviewed Splitwise expenses.

The repo has two tracks:

- a native Android MVP that reads payment notifications directly with a notification listener
- an Expo React Native app with iOS support, where iOS intake is driven by Messages automation/Shortcuts because iOS does not allow normal apps to read other apps' notifications

Crumb never posts automatically from a raw alert. Alerts become local drafts first; the user reviews a draft before creating the Splitwise expense.

## What Works

- Parses Indian payment alerts from HDFC, ICICI, Pluxee, Blinkit, Swiggy, Instamart, Zepto, Zomato-style text.
- Stores de-duplicated transaction drafts locally.
- Connects to Splitwise with OAuth 2.0.
- Fetches the current Splitwise user and groups.
- Creates equal-split Splitwise expenses after confirmation.
- Provides a debug Mock Bank Android app for replaying realistic notifications.
- Supports iOS draft import through a Shortcut/Automation relay plus in-app review notifications.

## Repo Layout

```text
app/                  Native Android Crumb app
mockbank/             Android debug app that emits sample bank notifications
apps/mobile/          Expo React Native app for Android/iOS
packages/core/        Parser, draft models, lifecycle helpers
packages/storage/     Local draft repository
packages/splitwise/   Splitwise OAuth/API client
shared/               JSON contracts and parser fixtures
scripts/              Android dev-loop helpers
```

## Android

Android is the straightforward path because Crumb can use a notification listener.

### Emulator

```bash
./scripts/start-emulator.sh
./scripts/dev-loop.sh
```

### Real Phone

1. Enable `Developer options > USB debugging`.
2. Plug the phone into the Mac.
3. Accept the `Allow USB debugging` prompt.
4. Run:

```bash
./scripts/dev-phone.sh
```

The dev loop builds Crumb and Mock Bank, installs both APKs, enables what Android allows through adb, launches Crumb, and can send a sample Blinkit alert.

Useful commands:

```bash
./scripts/dev-loop.sh --skip-tests
./scripts/dev-loop.sh --reset
./scripts/dev-loop.sh --no-sample
./scripts/dev-loop.sh --device YOUR_DEVICE_SERIAL --skip-tests --no-sample
./scripts/send-alert.sh hdfc-card-instamart
./scripts/send-alert.sh pluxee-swiggy-inst
./scripts/send-alert.sh icici-blinkit
./scripts/logs.sh
```

If Android blocks notification-listener setup through adb on a real phone, open Crumb, tap `Enable access`, and enable `Crumb transaction detector` in Android Settings once.

Build only:

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew testDebugUnitTest :app:assembleDebug :mockbank:assembleDebug
```

APK outputs:

```text
app/build/outputs/apk/debug/app-debug.apk
mockbank/build/outputs/apk/debug/mockbank-debug.apk
```

## iOS

iOS cannot let Crumb passively read bank app notifications. The working path is:

1. A personal Automation in Shortcuts is triggered by matching Messages/SMS text from bank senders.
2. The Shortcut posts the SMS body and sender to the configured relay topic.
3. Crumb polls the relay, parses matching messages, stores drafts, and shows a local notification with Review/Ignore actions.

### Shortcut / Automation Setup

Create a Shortcut action that sends a JSON body to the relay:

```json
{
  "text": "<Shortcut Input>",
  "sender": "<Sender>"
}
```

Post it to:

```text
https://ntfy.sh/crumb-sms-e33498fb9851
```

Then create a personal Automation:

1. Open Shortcuts > Automation.
2. Choose Message.
3. Pick relevant senders or message text filters for bank/payment alerts.
4. Run the relay Shortcut.
5. Disable confirmation prompts where iOS allows it.

In the app, iOS imports relayed candidates through `apps/mobile/src/services/ntfyImportService.ts`, parses them with the shared draft flow, and schedules local draft notifications through the native iOS bridge.

There is also an iOS Message Filter extension in `apps/mobile/ios/CrumbMessageFilterExtension`. It can parse and store matching SMS drafts through the shared app group/keychain path, but iOS message filtering behavior depends on system settings and entitlement/provisioning, so the Shortcuts automation path is the practical setup.

Run the Expo app:

```bash
cd apps/mobile
npm install
npm run ios
```

## Splitwise Credentials

Do not commit credentials. Use `local.properties` for the native Android app and `.env` for the Expo app.

Native Android `local.properties`:

```properties
sdk.dir=/opt/homebrew/share/android-commandlinetools
SPLITWISE_CLIENT_ID=your_client_id_here
SPLITWISE_CLIENT_SECRET=your_client_secret_here
SPLITWISE_REDIRECT_URI=crumb://splitwise-auth
```

Expo `apps/mobile/.env`:

```bash
SPLITWISE_CLIENT_ID=your_client_id_here
SPLITWISE_CLIENT_SECRET=your_client_secret_here
SPLITWISE_REDIRECT_URI=crumb://splitwise-auth
```

Splitwise developer app callback URL:

```text
crumb://splitwise-auth
```

## Checks

```bash
npm run typecheck
npm test
JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew testDebugUnitTest
```

Use the narrowest check for the code you touched while developing.
