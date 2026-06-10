package com.clearpath.nexus.data.model

data class RouteEvaluateResponse(
    val routeId: String,
    val status: String,
    val reliabilityScore: Int,
    val blockingSegmentId: String? = null,
    val estimatedHours: Double? = null,
    val scoreBreakdown: ScoreBreakdown? = null,
    val segments: List<SegmentPath> = emptyList(),
    val environmentalAlerts: List<String> = emptyList(),
)

data class SegmentPath(
    val id: String,
    val status: String,
    val coordinates: List<List<Double>>,
)

data class ScoreBreakdown(
    val weather: Double,
    val port: Double,
    val congestion: Double,
    val historical: Double,
)

data class Station(
    val id: String,
    val name: String,
    val code: String,
    val lat: Double,
    val lon: Double,
)

data class ThreatSimulationResponse(
    val originalScore: Int,
    val simulatedScore: Int,
    val degradationPct: Double,
    val alerts: List<String>,
)

data class EnvironmentalZone(
    val id: String,
    val type: String,
    val coordinates: List<List<Double>>,
)
