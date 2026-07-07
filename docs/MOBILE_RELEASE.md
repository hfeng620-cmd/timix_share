# TiMix Mobile Release

TiMix mobile app is packaged with Capacitor Android. The web app is still built by Next.js static export into `out/`, then Capacitor copies that bundle into the native Android WebView project.

## Current App Identity

- App name: `TiMix`
- Android app id: `com.timix.mobile`
- Web bundle directory: `out`
- Android project: `android/`

## Commands

```powershell
npm run mobile:check
```

Checks whether the local machine has the Java and Android SDK tools needed to build an APK.

```powershell
npm run mobile:build
```

Builds the static Next.js app and syncs it into Android.

```powershell
npm run mobile:apk:debug
```

Builds a debug APK after syncing. Output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

```powershell
npm run mobile:apk:release
```

Builds a release APK. For public GitHub Releases this should be signed with a real release keystore before uploading.

## Local Requirements

Local APK builds require:

- JDK 17 or newer
- Android SDK / Android Studio
- `JAVA_HOME` pointing at the JDK
- Android SDK tools available to Gradle

Current local check found that `JAVA_HOME` / `java` is missing, so `npm run mobile:build` succeeds but `gradlew assembleDebug` cannot run on this machine yet.

Run this first after installing Android tooling:

```powershell
npm run mobile:check
```

If the check passes, build the debug APK:

```powershell
npm run mobile:apk:debug
```

## GitHub Release Flow

For an unsigned test build:

1. Install JDK 17 and Android SDK locally, or use GitHub Actions with Java/Android setup.
2. Run `npm run mobile:apk:debug`.
3. Upload `android/app/build/outputs/apk/debug/app-debug.apk` to a GitHub Release.

For a real public release:

1. Create a release keystore.
2. Store keystore and passwords in GitHub Secrets.
3. Build `assembleRelease` with signing config.
4. Upload the signed APK or AAB to GitHub Releases.

## Notes

- The app currently wraps the static PWA in a native Android shell.
- The white/green and premium dark themes are both bundled because they are part of the web app.
- If `localhost:3001` is stale from the PWA service worker, inspect the built app through the Capacitor output or a clean static server origin.
