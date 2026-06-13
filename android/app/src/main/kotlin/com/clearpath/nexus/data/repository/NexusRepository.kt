package com.clearpath.nexus.data.repository

import com.clearpath.nexus.data.api.WeatherService
import com.clearpath.nexus.data.api.SupabaseClient
import com.clearpath.nexus.data.local.DemoRouteEngine
import com.clearpath.nexus.data.model.AlternateRoute
import com.clearpath.nexus.data.model.RouteEvaluateResponse
import com.clearpath.nexus.data.model.RouteEvaluationRow
import com.clearpath.nexus.data.model.Station
import com.clearpath.nexus.data.model.ThreatSimulationResponse
import com.clearpath.nexus.data.model.WeatherCondition
import io.github.jan.supabase.postgrest.from
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
        stops: List<String> = emptyList(),
    ): RouteEvaluateResponse {
        delay(400)
        return DemoRouteEngine.evaluateRoute(
            height, width, weight, sourceCode, destCode, trainArrivalHours, stops,
        )
    }

    suspend fun simulateThreat(
        baseScore: Int,
        stormSeverity: Double,
        solarKpIndex: Int,
        portCongestion: Double,
    ): ThreatSimulationResponse {
        delay(300)
        return DemoRouteEngine.simulateThreat(baseScore, stormSeverity, solarKpIndex, portCongestion)
    }

    suspend fun fetchAlternateRoutes(
        height: Double,
        width: Double,
        weight: Double,
        sourceCode: String,
        destCode: String,
        trainArrivalHours: Double,
        stops: List<String> = emptyList(),
    ): List<AlternateRoute> {
        delay(300)
        return DemoRouteEngine.findAlternateRoutes(
            height, width, weight, sourceCode, destCode, trainArrivalHours, stops,
        )
    }

    suspend fun fetchWeatherForRoute(lat: Double, lon: Double): WeatherCondition? {
        return WeatherService.fetchWeather(lat, lon)
    }

    suspend fun saveRouteEvaluation(row: RouteEvaluationRow) {
        SupabaseClient.client.from("route_evaluations").insert(row)
    }
}


