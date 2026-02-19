
# Setting up Google Analytics (Firebase) for Jong Sanam Owner App

I have installed the `@react-native-firebase/analytics` library for you. To make it work, you need to complete the **Native Configuration** steps.

## Prerequisites
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project (or use an existing one).
3. Enable **Google Analytics** for the project.

---

## Android Setup

1. In Firebase Console, add an **Android App** to your project.
   - Package Name: `com.jongsanam.ownerapp` (Check `android/app/build.gradle` -> `applicationId` to be sure).
2. Download `google-services.json`.
3. Place the file in: `jong-court-owner-app/android/app/google-services.json`.
4. The necessary build dependencies should already be auto-linked, but verify:
   - `android/build.gradle`: Check if `classpath 'com.google.gms:google-services:4.4.0'` (or similar) is present.
   - `android/app/build.gradle`: Check if `apply plugin: 'com.google.gms.google-services'` is at the bottom.

## iOS Setup

> **Note:** iOS setup requires a Mac with Xcode.

1. In Firebase Console, add an **iOS App**.
   - Bundle ID: `org.reactjs.native.example.jongsanamownerapp` (Check via Xcode or `ios/jongsanamownerapp.xcodeproj/project.pbxproj`).
2. Download `GoogleService-Info.plist`.
3. Open `ios/jongsanamownerapp.xcworkspace` in **Xcode**.
4. Right-click on the project name (root) -> "Add Files to ..." -> Select `GoogleService-Info.plist`.
   - **Crucial:** Make sure "Copy items if needed" is checked.
5. In your terminal, run:
   ```bash
   cd ios
   pod install --repo-update
   cd ..
   ```

## Rebuild the App

Since this involves native code changes, you must rebuild the app:
```bash
# Android
yarn android

# iOS
yarn ios
```

## Usage

I have created a helper utility at `src/utils/analytics.ts`. You can use it anywhere in your app:

```typescript
import { Analytics } from '../utils/analytics';

// Log a screen view
Analytics.logScreenView('Home_Screen');

// Log an event
Analytics.logEvent('booking_confirmed', {
  court_id: '123',
  price: 500
});
```
