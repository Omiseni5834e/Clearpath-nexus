# ClearPath Nexus

Data-driven intelligence platform — Hackathon MVP.

## Quick Start — Expo Go (recommended)

**No Android Studio. No Docker. No backend.**

1. Install **[Expo Go](https://expo.dev/go)** on your phone
2. On your PC:

```powershell
cd mobile
npm install
npx expo start
```

3. Scan the QR code with Expo Go (same Wi‑Fi as your PC)

See [mobile/README.md](mobile/README.md) for details.

## Architecture

| Layer | Stack |
|-------|-------|
| **Mobile (primary)** | Expo Go + React Native + SQLite + on-device Overpass & OpenWeather evaluations |
| **Backend (optional)** | Python FastAPI + PostGIS |
| **Web (legacy)** | React + Vite + Google Maps (client-side) |
| **Native Android (legacy)** | Kotlin + Compose in `android/` |

### System Architecture
The mobile client leverages expo-location to request real-time GPS coords, matching coordinates against the OpenStreetMap-powered Overpass API to query nearby station segments. Track geometries are parsed within the bounding box of coordinates and drawn progressively on react-native-maps. Live weather evaluations query current temperatures and conditions from OpenWeatherMap API and computes weighted reliability coefficients, utilizing local SQLite caches during network connection timeouts or offline mode.

## Setup Instructions

1. Copy `.env.example` to `.env` and configure credentials:
   - Provide an OpenWeatherMap API Key for `EXPO_PUBLIC_WEATHER_KEY`.
   - Provide `VITE_GOOGLE_MAPS_API_KEY` for the web map.
2. Start the backend and web frontend together:

```powershell
docker compose up --build
```

3. Open the web frontend at [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api/v1` to the FastAPI backend at `backend:8000` in Docker.
4. For local non-Docker frontend development, start the backend on port `8000`, then run:

```powershell
cd frontend
npm install
npm run dev
```

5. Start the mobile app from the mobile folder using `npx expo start`.

## Screenshots
*Screenshots placeholder*

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
