# Session Notes — March 21, 2026

## Creighton Cycle Tracker

### Privacy Policy Page
- Created `src/components/privacy-policy-view.ts` with full privacy policy covering local storage, optional sync, analytics, provider sharing, data security, and deletion
- Registered `/#/privacy` route in `app-shell.ts`
- Added "Privacy Policy" link in Settings > Learn More section
- Built and deployed to `https://creighton.stephens.page/#/privacy`
- Commits: `b9b1372`, `daabf02`

### Android APK Build
- Added signing config to `app/build.gradle` using `keystore.properties` (gitignored)
- Built signed APK: `android-twa/creighton-tracker-v1.0.0.apk` (~1.1 MB)
- APK is for MDM (ManageEngine) sideloading; AAB was already built for Play Store

## Daily Dozen Tracker

### New Android TWA Project
- Created full TWA project at `/var/www/daily_dozen/android-twa/`
- Package: `net.jacobstephens.dailydozen`
- Generated keystore: `daily-dozen-keystore.jks` (alias: `daily-dozen`)
- Generated icons at all Android densities from existing 512x512 icon
- Deployed Digital Asset Links to `https://dailydozen.jacobstephens.net/.well-known/assetlinks.json`
- Built both APK (4.2 MB) and AAB (4.3 MB)
- Commit: `1c422d4`

## Exodus 40 Lite

### New Android TWA Project
- Created full TWA project at `/var/www/exodus40lite/android-twa/`
- Package: `page.stephens.exodus40lite`
- Generated keystore: `exodus40lite-keystore.jks` (alias: `exodus40lite`)
- Generated icons at all Android densities from existing 512x512 icon
- Deployed Digital Asset Links to `https://exodus40lite.stephens.page/.well-known/assetlinks.json`
- Built both APK (3.0 MB) and AAB (3.1 MB)
- Also committed pre-existing PWA improvements (manifest, meta tags, service worker bump)
- Commits: `1b22cba`, `cd141f2`

## Download Commands (for Mac)
```bash
scp jacob@stephens.page:/home/jacob/CreightonTrackingApp/android-twa/creighton-tracker-v1.0.0.apk ~/Downloads/
scp jacob@stephens.page:/var/www/daily_dozen/android-twa/daily-dozen-v1.0.0.apk ~/Downloads/
scp jacob@stephens.page:/var/www/exodus40lite/android-twa/exodus40lite-v1.0.0.apk ~/Downloads/
```

## All Keystores
All three use the same password: `creighton2026`

| App | Keystore | Alias |
|-----|----------|-------|
| Creighton | `android-twa/creighton-keystore.jks` | `creighton-tracker` |
| Daily Dozen | `/var/www/daily_dozen/android-twa/daily-dozen-keystore.jks` | `daily-dozen` |
| Exodus 40 | `/var/www/exodus40lite/android-twa/exodus40lite-keystore.jks` | `exodus40lite` |
