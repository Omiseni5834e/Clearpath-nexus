package com.clearpath.nexus.data.repository

import com.clearpath.nexus.data.local.DemoRouteEngine
import com.clearpath.nexus.data.model.RouteEvaluateResponse
import com.clearpath.nexus.data.model.Station
import com.clearpath.nexus.data.model.ThreatSimulationResponse
import kotlinx.coroutines.delay

/**
 * On-device repository — no backend, Docker, or network required.
 */
class NexusRepository {

    suspend fun fetchStations(): List<Station> {
        delay(150)
        return DemoRouteEngine.getStations()
    }

    suspend fun evaluateRoute(
        height: Double,
        width: Double,
        weight: Double,
        sourceCode: String,
        destCode: String,
        trainArrivalHours: Double,
    ): RouteEvaluateResponse {
        delay(400)
        return DemoRouteEngine.evaluateRoute(
            height, width, weight, sourceCode, destCode, trainArrivalHours,
        )
    }

    suspend fun simulateThreat(
        stormSeverity: Double,
        solarKpIndex: Int,
        portCongestion: Double,
    ): ThreatSimulationResponse {
        delay(300)
        return DemoRouteEngine.simulateThreat(stormSeverity, solarKpIndex, portCongestion)
    }
}
