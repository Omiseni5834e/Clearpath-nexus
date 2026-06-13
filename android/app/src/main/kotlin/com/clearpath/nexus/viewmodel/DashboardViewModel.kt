package com.clearpath.nexus.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.clearpath.nexus.data.api.SupabaseClient
import com.clearpath.nexus.data.model.EnvironmentalZone
import com.clearpath.nexus.data.model.RouteEvaluateResponse
import com.clearpath.nexus.data.model.RouteEvaluationRow
import com.clearpath.nexus.data.model.ScoreBreakdown
import com.clearpath.nexus.data.model.Station
import com.clearpath.nexus.data.repository.NexusRepository
import io.github.jan.supabase.auth.auth
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DashboardUiState(
    val stations: List<Station> = emptyList(),
    val height: String = "4.8",
    val width: String = "3.2",
    val weight: String = "120",
    val sourceCode: String = "NGP",
    val destCode: String = "JNPT",
    val trainHours: String = "24",
    val isLoading: Boolean = false,
    val error: String? = null,
    val result: RouteEvaluateResponse? = null,
    val stormSeverity: Float = 0f,
    val solarKp: Float = 2f,
    val portCongestion: Float = 0f,
    val simLoading: Boolean = false,
    val simulatedScore: Int? = null,
    val simAlerts: List<String> = emptyList(),
    val selectedTab: DashboardTab = DashboardTab.CONFIGURE,
    val confirmedRouteLabel: String? = null,
    val confirmedRouteId: String? = null,
    val alternateRoutes: List<com.clearpath.nexus.data.model.AlternateRoute> = emptyList(),
    val stops: List<String> = emptyList(),
    val environmentalZones: List<EnvironmentalZone> = listOf(
        EnvironmentalZone(
            id = "dust-west",
            type = "dust",
            coordinates = listOf(
                listOf(21.5, 74.0),
                listOf(21.0, 75.5),
                listOf(20.0, 75.0),
                listOf(20.5, 73.5),
            ),
        ),
    ),
    val isSimulationMode: Boolean = false,
    val estimatedTotalHours: Float? = null
)

enum class DashboardTab {
    CONFIGURE,
    ROUTE_SELECTION,
    MAP,
    TELEMETRY,
    USER,
}

class DashboardViewModel(
    private val repository: NexusRepository = NexusRepository(),
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        loadStations()
    }

    fun onHeightChange(value: String) = _uiState.update { it.copy(height = value) }
    fun onWidthChange(value: String) = _uiState.update { it.copy(width = value) }
    fun onWeightChange(value: String) = _uiState.update { it.copy(weight = value) }
    fun onSourceChange(value: String) = _uiState.update { it.copy(sourceCode = value) }
    fun onDestChange(value: String) = _uiState.update { it.copy(destCode = value) }
    fun onTrainHoursChange(value: String) = _uiState.update { it.copy(trainHours = value) }
    fun onStormChange(value: Float) = _uiState.update { it.copy(stormSeverity = value) }
    fun onSolarChange(value: Float) = _uiState.update { it.copy(solarKp = value) }
    fun onPortChange(value: Float) = _uiState.update { it.copy(portCongestion = value) }
    fun onTabSelected(tab: DashboardTab) = _uiState.update { it.copy(selectedTab = tab) }
    fun onStopsChange(value: List<String>) = _uiState.update { it.copy(stops = value) }

    private fun loadStations() {
        viewModelScope.launch {
            val stations = repository.fetchStations()
            _uiState.update { it.copy(stations = stations) }
        }
    }

    fun evaluateRoute() {
        val state = _uiState.value
        val height = state.height.toDoubleOrNull()
        val width = state.width.toDoubleOrNull()
        val weight = state.weight.toDoubleOrNull()
        val trainHours = state.trainHours.toDoubleOrNull()

        if (height == null || width == null || weight == null || trainHours == null ||
            height <= 0 || width <= 0 || weight <= 0 || trainHours <= 0
        ) {
            _uiState.update {
                it.copy(error = "Invalid entries detected. Cargo height and weight must be positive numeric values.")
            }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val result = repository.evaluateRoute(
                    height = height,
                    width = width,
                    weight = weight,
                    sourceCode = state.sourceCode,
                    destCode = state.destCode,
                    trainArrivalHours = trainHours,
                    stops = state.stops,
                )
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        result = result,
                        simulatedScore = null,
                        simAlerts = emptyList(),
                        selectedTab = DashboardTab.ROUTE_SELECTION,
                    )
                }
            } catch (e: IllegalArgumentException) {
                _uiState.update {
                    it.copy(isLoading = false, error = e.message)
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Route evaluation failed. Please try again.",
                    )
                }
            }
        }
    }

    fun simulateThreat() {
        val state = _uiState.value
        viewModelScope.launch {
            _uiState.update { it.copy(simLoading = true) }
            try {
                val response = repository.simulateThreat(
                    stormSeverity = state.stormSeverity.toDouble(),
                    solarKpIndex = state.solarKp.toInt(),
                    portCongestion = state.portCongestion.toDouble(),
                )
                _uiState.update {
                    it.copy(
                        simLoading = false,
                        simulatedScore = response.simulatedScore,
                        simAlerts = response.alerts,
                    )
                }
            } catch (_: Exception) {
                _uiState.update { it.copy(simLoading = false) }
            }
        }
    }

    fun calculateEstimatedTime() {
        val state = _uiState.value
        val baseHours = (state.result?.estimatedHours ?: 0.0).toFloat()
        // Add 0.5 hour per additional stop as heuristic
        val extraHours = state.stops.size * 0.5f
        val total = baseHours + extraHours
        _uiState.update { it.copy(estimatedTotalHours = total) }
    }

    fun onRouteConfirmed(
        route: com.clearpath.nexus.data.model.AlternateRoute,
        allRoutes: List<com.clearpath.nexus.data.model.AlternateRoute>
    ) {
        val state = _uiState.value
        _uiState.update {
            it.copy(
                result = RouteEvaluateResponse(
                    routeId = route.id,
                    status = route.status,
                    reliabilityScore = route.reliabilityScore,
                    estimatedHours = route.estimatedHours,
                    scoreBreakdown = ScoreBreakdown(
                        weather = route.weatherScore.toDouble(),
                        port = 85.0,
                        congestion = 72.0,
                        historical = 90.0,
                    ),
                    segments = route.segments,
                ),
                confirmedRouteLabel = route.label,
                confirmedRouteId = route.id,
                alternateRoutes = allRoutes,
                selectedTab = DashboardTab.MAP,
            )
        }
        // Update estimated total hours after confirming route
        calculateEstimatedTime()

        // Save route evaluation to Supabase
        viewModelScope.launch {
            try {
                val userId = SupabaseClient.client.auth.currentUserOrNull()?.id
                if (userId != null) {
                    val height = state.height.toDoubleOrNull() ?: 0.0
                    val width = state.width.toDoubleOrNull() ?: 0.0
                    val weight = state.weight.toDoubleOrNull() ?: 0.0

                    val row = RouteEvaluationRow(
                        userId = userId,
                        sourceCode = state.sourceCode,
                        destCode = state.destCode,
                        cargoHeight = height,
                        cargoWidth = width,
                        cargoWeight = weight,
                        selectedRouteLabel = route.label,
                        reliabilityScore = route.reliabilityScore,
                        weatherScore = route.weatherScore,
                        status = route.status,
                        estimatedHours = route.estimatedHours
                    )
                    repository.saveRouteEvaluation(row)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun onBackFromRouteSelection() {
        _uiState.update { it.copy(selectedTab = DashboardTab.CONFIGURE) }
    }
}

