# ClearPath Nexus — Expo Go

Run on your **physical phone** with the **Expo Go** app. No Android Studio, no Docker, no backend.

## 1. Install Expo Go on your phone

- [Android — Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
- [iOS — App Store](https://apps.apple.com/app/expo-go/id982107779)

## 2. Start the dev server (on your PC)

**Windows PowerShell** (if `npm` is blocked by execution policy):

```powershell
cd E:\clearpath-nexus\mobile
npm.cmd install
npx.cmd expo start
```

**Command Prompt or Git Bash:**

```bash
cd mobile
npm install
npx expo start
```

## 3. Open on your phone

- **Android:** Scan the QR code with the Expo Go app (or Camera → opens Expo Go)
- **iOS:** Scan with the Camera app

Phone and PC must be on the **same Wi‑Fi**.

If the QR code fails, press `s` in the terminal and switch to **Tunnel** mode, then scan again.

## App tabs

| Tab | Purpose |
|-----|---------|
| **Configure** | Cargo input, stations, evaluate corridor |
| **Map** | Route lines + stations (needs internet for map tiles) |
| **Telemetry** | Scores, alerts, threat simulator |

## Demo tips

- Default NGP → JNPT → **APPROVED**
- Height `6.0` → **HARD_BLOCKED**
- Solar Kp `8` + Inject Threat → critical alert

## Stack

Expo SDK 52 · React Native · react-native-maps · on-device demo engine
