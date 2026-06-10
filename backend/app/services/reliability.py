import math

from app.core.config import settings


def calculate_route_reliability(
    weather_score: float,
    port_sync_score: float,
    congestion_score: float,
    historical_delay_score: float,
    clearance_failed: bool = False,
) -> int:
    """NEXUS-004: Multi-factor route reliability scoring matrix."""
    if clearance_failed:
        return 0

    composite = (
        settings.WEIGHT_WEATHER_RISK * weather_score
        + settings.WEIGHT_PORT_ALIGNMENT * port_sync_score
        + settings.WEIGHT_CORRIDOR_CONGESTION * congestion_score
        + settings.WEIGHT_HISTORICAL_DELAY * historical_delay_score
    )
    return int(math.ceil(composite))


def apply_threat_simulation(
    base_score: int,
    storm_severity: float,
    solar_kp_index: int,
    port_congestion: float,
) -> tuple[int, list[str]]:
    """Threat Simulation Center — degrade score under artificial stress."""
    alerts: list[str] = []
    penalty = 0.0

    if storm_severity > 0:
        penalty += storm_severity * 0.35
        alerts.append(f"Heavy storm simulation active (severity {storm_severity:.0f}%)")

    if solar_kp_index >= 7:
        penalty += (solar_kp_index - 6) * 12
        alerts.append(f"CRITICAL: Kp-index {solar_kp_index} — geomagnetic telemetry risk")

    if port_congestion > 0:
        penalty += port_congestion * 0.25
        alerts.append(f"Port gridlock simulation (congestion {port_congestion:.0f}%)")

    simulated = max(0, int(base_score - penalty))
    return simulated, alerts
