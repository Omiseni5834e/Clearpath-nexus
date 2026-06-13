package com.clearpath.nexus.data.local

import com.clearpath.nexus.data.model.AlternateRoute
import com.clearpath.nexus.data.model.RouteEvaluateResponse
import com.clearpath.nexus.data.model.ScoreBreakdown
import com.clearpath.nexus.data.model.SegmentPath
import com.clearpath.nexus.data.model.Station
import com.clearpath.nexus.data.model.ThreatSimulationResponse
import java.util.UUID
import kotlin.math.ceil

/**
 * Standalone on-device route engine — mirrors backend NEXUS-002/004 logic
 * using the seeded demo corridor (no server required).
 */
object DemoRouteEngine {

    private data class DemoSegment(
        val id: String,
        val sourceCode: String,
        val destCode: String,
        val maxHeight: Double,
        val maxWidth: Double,
        val maxWeight: Double,
        val congestion: Double,
        val historicalDelay: Double,
        val coordinates: List<List<Double>>,
    )

    private val stations = listOf(
        Station("s-ngp", "Nagpur Junction", "NGP", 21.1458, 79.0882),
        Station("s-bsl", "Bhusaval Junction", "BSL", 21.0455, 75.7849),
        Station("s-mmr", "Manmad Junction", "MMR", 20.2500, 74.4333),
        Station("s-kyn", "Kalyan Junction", "KYN", 19.2433, 73.1305),
        Station("s-jnpt", "Mumbai Port (JNPT)", "JNPT", 18.9497, 72.9512),
        Station("s-pune", "Pune Junction", "PUNE", 18.5285, 73.8740),
    )

    private val segments = listOf(
        DemoSegment("seg-1", "NGP", "BSL", 5.5, 3.5, 150.0, 1.2, 0.5,
            listOf(listOf(21.1458, 79.0882), listOf(21.0455, 75.7849))),
        DemoSegment("seg-2", "BSL", "MMR", 5.0, 3.2, 140.0, 1.0, 0.3,
            listOf(listOf(21.0455, 75.7849), listOf(20.2500, 74.4333))),
        DemoSegment("seg-3", "MMR", "KYN", 4.8, 3.2, 130.0, 1.5, 0.8,
            listOf(listOf(20.2500, 74.4333), listOf(19.2433, 73.1305))),
        DemoSegment("seg-4", "KYN", "JNPT", 4.5, 3.0, 120.0, 1.8, 1.2,
            listOf(listOf(19.2433, 73.1305), listOf(18.9497, 72.9512))),
        DemoSegment("seg-5", "NGP", "PUNE", 5.2, 3.4, 135.0, 1.1, 0.4,
            listOf(listOf(21.1458, 79.0882), listOf(18.5285, 73.8740))),
        DemoSegment("seg-6", "PUNE", "KYN", 4.6, 3.1, 125.0, 1.3, 0.6,
            listOf(listOf(18.5285, 73.8740), listOf(19.2433, 73.1305))),
    )

    fun getStations(): List<Station> = stations

    fun evaluateRoute(
        height: Double,
        width: Double,
        weight: Double,
        sourceCode: String,
        destCode: String,
        trainArrivalHours: Double,
        stops: List<String> = emptyList(),
    ): RouteEvaluateResponse {
        val source = sourceCode.uppercase()
        val dest = destCode.uppercase()
        val stopsUpper = stops.map { it.uppercase() }

        if (stations.none { it.code == source } || stations.none { it.code == dest } ||
            stopsUpper.any { stop -> stations.none { it.code == stop } }
        ) {
            throw IllegalArgumentException(
                "Route error: Selected origin, destination, or stops fall outside operational boundaries.",
            )
        }

        val routeSegments = findRouteWithStops(source, dest, stopsUpper)
        if (routeSegments.isEmpty()) {
            throw IllegalArgumentException("No viable path fits criteria safely.")
        }

        val clearance = validateClearance(height, width, weight, routeSegments)
        val clearanceFailed = clearance.status == "HARD_BLOCKED"

        val weatherScore = 82.0
        val portScore = computePortSyncScore(trainArrivalHours)
        val congestionScore = computeCongestionScore(routeSegments)
        val historicalScore = computeHistoricalScore(routeSegments)

        val alerts = mutableListOf<String>()
        if (portScore.warning != null) alerts.add(portScore.warning)

        val reliability = calculateReliability(
            weatherScore, portScore.score, congestionScore, historicalScore, clearanceFailed,
        )

        val estimatedHours = if (!clearanceFailed) estimateTransitHours(routeSegments) else null

        val delayMinutes = predictDelayMinutes(routeSegments, 100 - congestionScore, 100 - weatherScore)
        if (delayMinutes > 60) {
            alerts.add("Predicted delay overhead: ${delayMinutes} min (MEDIUM)")
        }

        val segmentResponses = routeSegments.map { seg ->
            val status = if (clearanceFailed && seg.id == clearance.blockingSegmentId) {
                "HARD_BLOCKED"
            } else {
                clearance.status
            }
            SegmentPath(seg.id, status, seg.coordinates)
        }

        return RouteEvaluateResponse(
            routeId = UUID.randomUUID().toString(),
            status = clearance.status,
            reliabilityScore = reliability,
            blockingSegmentId = clearance.blockingSegmentId,
            estimatedHours = estimatedHours,
            scoreBreakdown = ScoreBreakdown(
                weather = weatherScore,
                port = portScore.score,
                congestion = congestionScore,
                historical = historicalScore,
            ),
            segments = segmentResponses,
            environmentalAlerts = alerts,
        )
    }

    fun simulateThreat(
        stormSeverity: Double,
        solarKpIndex: Int,
        portCongestion: Double,
    ): ThreatSimulationResponse {
        val base = 85
        val (simulated, alerts) = applyThreatSimulation(base, stormSeverity, solarKpIndex, portCongestion)
        val degradation = if (base > 0) ((base - simulated).toDouble() / base * 100.0) else 0.0
        return ThreatSimulationResponse(base, simulated, degradation, alerts)
    }

    private data class ClearanceResult(
        val status: String,
        val blockingSegmentId: String? = null,
    )

    private fun validateClearance(
        height: Double,
        width: Double,
        weight: Double,
        route: List<DemoSegment>,
    ): ClearanceResult {
        for (seg in route) {
            if (height > seg.maxHeight || width > seg.maxWidth || weight > seg.maxWeight) {
                return ClearanceResult("HARD_BLOCKED", seg.id)
            }
        }
        return ClearanceResult("APPROVED")
    }

    private fun findRoute(source: String, dest: String): List<DemoSegment> {
        if (source == dest) return emptyList()

        val adjacency = segments.groupBy { it.sourceCode }
        val queue = ArrayDeque<Pair<String, List<DemoSegment>>>()
        queue.add(source to emptyList())
        val visited = mutableSetOf(source)

        while (queue.isNotEmpty()) {
            val (current, path) = queue.removeFirst()
            for (seg in adjacency[current].orEmpty()) {
                val next = seg.destCode
                val newPath = path + seg
                if (next == dest) return newPath
                if (next !in visited) {
                    visited.add(next)
                    queue.add(next to newPath)
                }
            }
        }
        return emptyList()
    }

    private fun findRouteWithStops(source: String, dest: String, stops: List<String>): List<DemoSegment> {
        val fullPath = mutableListOf<DemoSegment>()
        var current = source
        val targets = stops + dest
        for (target in targets) {
            val pathSegment = findRoute(current, target)
            if (pathSegment.isEmpty()) return emptyList()
            fullPath.addAll(pathSegment)
            current = target
        }
        return fullPath
    }


    private data class PortResult(val score: Double, val warning: String?)

    private fun computePortSyncScore(trainArrivalHours: Double): PortResult {
        val windowStartHours = 12.0
        val windowEndHours = 48.0

        return when {
            trainArrivalHours < windowStartHours -> {
                val gap = windowStartHours - trainArrivalHours
                PortResult(
                    score = maxOf(40.0, 100.0 - gap * 3),
                    warning = "Train arrives ${"%.1f".format(gap)}h early — yard dwell risk",
                )
            }
            trainArrivalHours > windowEndHours ->
                PortResult(0.0, "CRITICAL: Train misses vessel loading window")
            else -> {
                val windowPct = (trainArrivalHours - windowStartHours) /
                    maxOf(windowEndHours - windowStartHours, 1.0)
                val score = 100.0 - kotlin.math.abs(windowPct - 0.3) * 30
                PortResult(maxOf(60.0, minOf(100.0, score)), null)
            }
        }
    }

    private fun computeCongestionScore(route: List<DemoSegment>): Double {
        if (route.isEmpty()) return 50.0
        val avg = route.map { it.congestion }.average()
        return maxOf(0.0, minOf(100.0, 100.0 - (avg - 1.0) * 40.0))
    }

    private fun computeHistoricalScore(route: List<DemoSegment>): Double {
        if (route.isEmpty()) return 75.0
        val avg = route.map { it.historicalDelay }.average()
        return maxOf(0.0, minOf(100.0, 100.0 - avg * 10.0))
    }

    private fun estimateTransitHours(route: List<DemoSegment>): Double {
        val base = route.size * 4.5
        val delay = route.sumOf { it.historicalDelay }
        return ((base + delay) * 100).toInt() / 100.0
    }

    private fun predictDelayMinutes(
        route: List<DemoSegment>,
        congestionPct: Double,
        weatherRisk: Double,
    ): Int {
        if (route.isEmpty()) return 30
        val baseDelay = route.sumOf { it.historicalDelay } * 60
        return (baseDelay + congestionPct * 0.5 + weatherRisk * 0.8).toInt()
    }

    private fun calculateReliability(
        weather: Double,
        port: Double,
        congestion: Double,
        historical: Double,
        clearanceFailed: Boolean,
    ): Int {
        if (clearanceFailed) return 0
        val composite = 0.40 * weather + 0.30 * port + 0.15 * congestion + 0.15 * historical
        return ceil(composite).toInt()
    }

    private fun applyThreatSimulation(
        baseScore: Int,
        stormSeverity: Double,
        solarKpIndex: Int,
        portCongestion: Double,
    ): Pair<Int, List<String>> {
        val alerts = mutableListOf<String>()
        var penalty = 0.0

        if (stormSeverity > 0) {
            penalty += stormSeverity * 0.35
            alerts.add("Heavy storm simulation active (severity ${stormSeverity.toInt()}%)")
        }
        if (solarKpIndex >= 7) {
            penalty += (solarKpIndex - 6) * 12
            alerts.add("CRITICAL: Kp-index $solarKpIndex — geomagnetic telemetry risk")
        }
        if (portCongestion > 0) {
            penalty += portCongestion * 0.25
            alerts.add("Port gridlock simulation (congestion ${portCongestion.toInt()}%)")
        }

        return maxOf(0, (baseScore - penalty).toInt()) to alerts
    }

    // ── Alternate Route Generation ────────────────────────────────────────

    /**
     * Generates 3–4 distinct route alternatives between source and dest.
     * Each route uses a different corridor strategy.
     */
    fun findAlternateRoutes(
        height: Double,
        width: Double,
        weight: Double,
        sourceCode: String,
        destCode: String,
        trainArrivalHours: Double,
        stops: List<String> = emptyList(),
    ): List<AlternateRoute> {
        val source = sourceCode.uppercase()
        val dest = destCode.uppercase()
        val stopsUpper = stops.map { it.uppercase() }
        val results = mutableListOf<AlternateRoute>()
        val usedPaths = mutableSetOf<String>()

        // Strategy 1 — Primary (BFS shortest with stops)
        val primarySegs = findRouteWithStops(source, dest, stopsUpper)
        if (primarySegs.isNotEmpty()) {
            val key = primarySegs.map { it.id }.joinToString(",")
            usedPaths.add(key)
            val waypoints = buildWaypoints(source, primarySegs)
            results.add(
                buildAlternate(
                    id = "route-primary",
                    label = "Primary via ${waypoints.drop(1).dropLast(1).joinToString("-").ifEmpty { "Direct" }}",
                    demoSegments = primarySegs,
                    waypoints = waypoints,
                    height = height, width = width, weight = weight,
                    trainArrivalHours = trainArrivalHours,
                ),
            )
        }

        // Strategy 2 — Via PUNE (southern corridor with stops)
        val southernStops = if (source != "PUNE" && dest != "PUNE" && "PUNE" !in stopsUpper) {
            listOf("PUNE") + stopsUpper
        } else {
            stopsUpper
        }
        val southernSegs = findRouteWithStops(source, dest, southernStops)
        if (southernSegs.isNotEmpty()) {
            val key = southernSegs.map { it.id }.joinToString(",")
            if (key !in usedPaths) {
                usedPaths.add(key)
                val waypoints = buildWaypoints(source, southernSegs)
                results.add(
                    buildAlternate(
                        id = "route-southern",
                        label = "Southern via PUNE",
                        demoSegments = southernSegs,
                        waypoints = waypoints,
                        height = height, width = width, weight = weight,
                        trainArrivalHours = trainArrivalHours,
                    ),
                )
            }
        }

        // Strategy 3 — Via BSL (western freight corridor with stops)
        val westernStops = if (source != "BSL" && dest != "BSL" && "BSL" !in stopsUpper) {
            listOf("BSL") + stopsUpper
        } else {
            stopsUpper
        }
        val westernSegs = findRouteWithStops(source, dest, westernStops)
        if (westernSegs.isNotEmpty()) {
            val key = westernSegs.map { it.id }.joinToString(",")
            if (key !in usedPaths) {
                usedPaths.add(key)
                val waypoints = buildWaypoints(source, westernSegs)
                results.add(
                    buildAlternate(
                        id = "route-western",
                        label = "Western via BSL",
                        demoSegments = westernSegs,
                        waypoints = waypoints,
                        height = height, width = width, weight = weight,
                        trainArrivalHours = trainArrivalHours,
                    ),
                )
            }
        }

        // Strategy 4 — Extended via KYN
        val extendedStops = if (source != "KYN" && dest != "KYN" && "KYN" !in stopsUpper) {
            listOf("KYN") + stopsUpper
        } else {
            stopsUpper
        }
        val extendedSegs = findRouteWithStops(source, dest, extendedStops)
        if (extendedSegs.isNotEmpty()) {
            val key = extendedSegs.map { it.id }.joinToString(",")
            if (key !in usedPaths) {
                usedPaths.add(key)
                val waypoints = buildWaypoints(source, extendedSegs)
                results.add(
                    buildAlternate(
                        id = "route-extended",
                        label = "Extended via KYN",
                        demoSegments = extendedSegs,
                        waypoints = waypoints,
                        height = height, width = width, weight = weight,
                        trainArrivalHours = trainArrivalHours,
                    ),
                )
            }
        }

        return results
    }

    private fun buildWaypoints(source: String, route: List<DemoSegment>): List<String> {
        val codes = mutableListOf(source)
        for (seg in route) {
            if (seg.destCode !in codes) codes.add(seg.destCode)
        }
        return codes
    }

    private fun buildAlternate(
        id: String,
        label: String,
        demoSegments: List<DemoSegment>,
        waypoints: List<String>,
        height: Double,
        width: Double,
        weight: Double,
        trainArrivalHours: Double,
    ): AlternateRoute {
        val clearance = validateClearance(height, width, weight, demoSegments)
        val clearanceFailed = clearance.status == "HARD_BLOCKED"

        val weatherScore = 82
        val portScore = computePortSyncScore(trainArrivalHours)
        val congestionScore = computeCongestionScore(demoSegments)
        val historicalScore = computeHistoricalScore(demoSegments)
        val reliability = calculateReliability(
            weatherScore.toDouble(), portScore.score, congestionScore, historicalScore, clearanceFailed,
        )
        val eta = if (!clearanceFailed) estimateTransitHours(demoSegments) else 0.0

        val segmentPaths = demoSegments.map { seg ->
            val status = if (clearanceFailed && seg.id == clearance.blockingSegmentId) {
                "HARD_BLOCKED"
            } else {
                clearance.status
            }
            SegmentPath(seg.id, status, seg.coordinates)
        }

        // Compute geographic midpoint of all segment coordinates
        val allCoords = demoSegments.flatMap { it.coordinates }
        val midLat = allCoords.map { it[0] }.average()
        val midLon = allCoords.map { it[1] }.average()

        return AlternateRoute(
            id = id,
            label = label,
            segments = segmentPaths,
            reliabilityScore = reliability,
            weatherScore = weatherScore,
            estimatedHours = eta,
            status = clearance.status,
            stationCodes = waypoints,
            midpoint = listOf(midLat, midLon),
        )
    }
}

