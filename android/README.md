# ClearPath Nexus — Android App

Standalone Android client for **physical devices**. No Docker, no backend, no emulator required.

## Requirements

- Android Studio Ladybug (2024.2.1) or newer
- Android phone with **USB debugging** enabled (Settings → Developer options)
- USB cable

Internet on the phone is only needed for OpenStreetMap tiles on the Map tab.

## Run on your phone

1. On your phone: **Settings → About phone** → tap Build number 7× to unlock Developer options  
2. **Settings → Developer options** → enable **USB debugging**  
3. Connect the phone via USB; accept the **Allow USB debugging** prompt  
4. Open Android Studio → **File → Open** → `E:\clearpath-nexus\android`  
5. Wait for Gradle sync  
6. In the device dropdown (top toolbar), select **your phone** — not an emulator  
7. Click **Run** (green play button)

The debug build installs as `ClearPath Nexus` with package `com.clearpath.nexus.debug`.

## Gradle notes (physical device)

| Setting | Purpose |
|---------|---------|
| `ndk.abiFilters` | Builds ARM binaries only (`armeabi-v7a`, `arm64-v8a`) — real phones, not x86 emulators |
| `splits.abi.isEnable = false` | Single APK for any connected phone |
| `applicationIdSuffix = ".debug"` | Debug installs alongside a future release build |

## Wireless debugging (optional)

Android 11+: **Developer options → Wireless debugging** → pair from Android Studio (**Pair devices using Wi‑Fi**). Then Run as usual with the wireless device selected.

## App tabs

| Tab | What it does |
|-----|----------------|
| **Configure** | Cargo dimensions, stations, evaluate corridor |
| **Map** | Route map (needs phone internet/Wi‑Fi) |
| **Telemetry** | Scores, alerts, threat simulator |

## Demo corridor

NGP → BSL → MMR → KYN → JNPT (or via PUNE)
