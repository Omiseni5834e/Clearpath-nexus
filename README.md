# ClearPath Nexus 🚆🌦️🛰️

AI-Powered Railway Intelligence Command Center

ClearPath Nexus is an intelligent railway logistics platform that combines route planning, environmental risk analysis, port synchronization, and real-time operational intelligence into a unified command center. The platform enables freight operators, logistics managers, and railway coordinators to make faster, safer, and more reliable routing decisions through AI-assisted analysis and dynamic risk monitoring.

## 📌 Overview

Modern freight railway operations often rely on fragmented systems, spreadsheets, manual coordination, and delayed environmental intelligence. ClearPath Nexus centralizes these workflows into a single platform capable of:

- Evaluating physical cargo clearance constraints
- Monitoring weather and environmental hazards
- Synchronizing rail operations with port schedules
- Calculating route reliability scores
- Detecting congestion risks
- Tracking dust storms and space-weather disruptions
- Suggesting optimized routing alternatives

The goal is to reduce delays, improve reliability, and provide actionable intelligence before cargo begins transit.

## 🎯 Problem Statement

Freight operators must answer critical operational questions before dispatching cargo:

- Can the cargo physically clear bridges and tunnels?
- Will the target port be available upon arrival?
- Are weather conditions likely to cause delays?
- Is congestion building along the corridor?
- Could dust storms reduce visibility?
- Will geomagnetic disturbances impact railway telemetry systems?

Traditional planning methods are slow, fragmented, and reactive.

ClearPath Nexus transforms this process into an intelligent, automated workflow.

## ✨ Key Features

### 1. Smart Cargo Route Planner
- Cargo dimension validation
- Clearance checking
- Tunnel and bridge compatibility analysis
- Route approval/blocking system

### 2. Port Synchronization Engine
- Vessel schedule integration
- Port berth availability tracking
- Rail-to-port timing analysis
- Mismatch detection alerts

### 3. Route Reliability Scoring
Generates a reliability score based on:
- Weather conditions
- Port synchronization
- Congestion levels
- Historical delay patterns

### 4. Multi-Layer Weather Intelligence
Monitors:
- Rainfall
- Storm systems
- Wind speeds
- Extreme temperatures
- Visibility conditions

### 5. Dust Storm Risk Monitoring
Specialized environmental intelligence for:
- Desert corridors
- Low-visibility events
- Airborne particulate hazards

### 6. Solar Storm Telemetry Monitoring
Tracks:
- Geomagnetic disturbances
- Space weather alerts
- Telemetry reliability risks
- Signal degradation warnings

### 7. Dynamic Route Optimization
Automatically recommends:
- Alternate routes
- Bypass corridors
- Delay mitigation strategies

### 8. Threat Simulation Center
Allows operators to simulate:
- Severe weather events
- Port congestion
- Environmental disruptions
- Reliability degradation scenarios

## 🧠 Reliability Scoring Model

The Route Reliability Index (RRI) is calculated using weighted operational factors:

\[R = (W_w \times S_w) + (W_p \times S_p) + (W_c \times S_c) + (W_h \times S_h)\]

Where:

| Variable | Description | Weight |
|---|---|---|
| \(W_w\) | Weather Risk Weight | 0.40 |
| \(W_p\) | Port Alignment Weight | 0.30 |
| \(W_c\) | Congestion Weight | 0.15 |
| \(W_h\) | Historical Delay Weight | 0.15 |

Each score ranges from:
- `0` = Critical Risk
- `100` = Optimal Conditions

If physical clearance checks fail, the route is immediately marked:
- **BLOCKED**
- **Reliability Score = 0**

## 👥 Target Users

### Freight Operations Coordinators
Responsble for creating and validating railway freight routes.

### Logistics Managers
Coordinate rail operations with maritime shipping schedules.

### Rail Risk Analysts
Monitor network-wide reliability, environmental threats, and operational KPIs.

## 🖥️ System Architecture

### Frontend
- React
- TypeScript
- Tailwind CSS
- Leaflet.js
- Responsive Dashboard UI
- Core UI Components
- Interactive Railway Map
- Risk Visualization Layer
- Reliability Dashboard
- Threat Simulation Panel
- Route Analytics View

### Backend
- FastAPI
- Python
- REST APIs
- Geospatial Processing Engine
- **Responsibilities**: Route calculation, reliability scoring, data aggregation, risk analysis, environmental processing.

### Database
- PostgreSQL
- **Stores**: Railway nodes, route data, bridge clearances, tunnel dimensions, historical delays, environmental snapshots.

## 🌎 Data Sources

Potential integrations include:
- **Weather**: OpenWeather API, WeatherAPI, NOAA
- **Space Weather**: NOAA Space Weather Prediction Center
- **Mapping**: OpenStreetMap, Leaflet Layers
- **Maritime Logistics**: Port scheduling APIs, AIS vessel tracking systems

## 🔄 User Workflow

1. Input Cargo Details
2. Select Origin & Destination
3. Run Clearance Validation
4. Analyze Environmental Risks
5. Calculate Reliability Score
6. Visualize Route on Map
7. Simulate Threat Scenarios
8. Dispatch Approved Route

## 📊 Success Metrics

The platform aims to improve:
- Route planning speed
- ETA accuracy
- Port synchronization efficiency
- Delay prediction accuracy
- Operational reliability
- Freight throughput

## 🚫 Out of Scope (V1)

The following features are intentionally excluded:
- Track maintenance forecasting
- Rail wear prediction
- Locomotive health monitoring
- Passenger booking systems
- Crew scheduling
- Ticketing integrations

This allows the MVP to focus entirely on freight intelligence and route optimization.

## 🚀 MVP Roadmap

### Phase 1
- Cargo Route Planner
- Weather Intelligence
- Reliability Scoring
- Interactive Railway Map

### Phase 2
- Dynamic Re-routing
- Port Synchronization
- Threat Simulation Center

### Phase 3
- AI Delay Prediction
- Collaborative Workspaces
- Advanced Analytics

## 🛠️ Local Development

```bash
# Clone repository
git clone https://github.com/Omiseni5834e/Clearpath-nexus.git

# Navigate to project
cd Clearpath-nexus

# Install dependencies
npm install

# Start development server
npm run dev
```

## 📂 Project Structure

```text
ClearPath-Nexus/
│
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── hooks/
│   └── assets/
│
├── backend/
│   ├── api/
│   ├── services/
│   ├── models/
│   ├── routes/
│   └── scoring/
│
├── database/
│   ├── schema/
│   └── migrations/
│
├── docs/
│
└── README.md
```

## 🤝 Contributing

Contributions are welcome.
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m "Add amazing feature"`)
4. Push to your branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

MIT License

---

### Vision

> "Transform railway freight planning from reactive logistics management into proactive AI-driven operational intelligence."

**"Every journey begins with a plan. For railway freight, that plan can be complex. ClearPath Nexus simplifies the process by helping teams find reliable routes, understand potential risks, and keep cargo moving smoothly from start to finish." 🚆📡🌍**
