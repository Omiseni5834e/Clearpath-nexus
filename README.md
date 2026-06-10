# ClearPath Nexus

AI-powered railway intelligence platform — Hackathon MVP.

## Quick Start — Expo Go (recommended)

**No Android Studio. No Docker. No backend.**

1. Install **[Expo Go](https://expo.dev/go)** on your phone
2. On your PC:

```powershell
cd E:\clearpath-nexus\mobile
npm.cmd install
npx.cmd expo start
```

(On PowerShell, use `npm.cmd` / `npx.cmd` if you get an execution policy error.)

3. Scan the QR code with Expo Go (same Wi‑Fi as your PC)

See [mobile/README.md](mobile/README.md) for details.

## Architecture

| Layer | Stack |
|-------|-------|
| **Mobile (primary)** | Expo Go + React Native + on-device route engine |
| Backend (optional) | Python FastAPI + PostGIS |
| Web (legacy) | React + Vite + Google Maps (client-side) |
| Native Android (legacy) | Kotlin + Compose in `android/` |

## User Flow

1. Enter cargo dimensions and corridor endpoints
2. Evaluate clearance + reliability (runs on your phone)
3. View map, telemetry, and threat simulation

## Reliability Formula

```
R = (0.40 × Weather) + (0.30 × Port) + (0.15 × Congestion) + (0.15 × Historical)
```

## Demo Corridor

Nagpur (NGP) → Bhusaval → Manmad → Kalyan → Mumbai Port (JNPT)

## License

Proprietary — Hackathon MVP
