package com.clearpath.nexus.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.clearpath.nexus.ui.components.ConfigPanel
import com.clearpath.nexus.ui.components.RouteMapView
import com.clearpath.nexus.ui.components.TelemetryPanel
import com.clearpath.nexus.ui.theme.AccentSafetyBlue
import com.clearpath.nexus.ui.theme.PanelDark
import com.clearpath.nexus.ui.theme.PrimaryCommandBlue
import com.clearpath.nexus.ui.theme.SolarRiskAmber
import com.clearpath.nexus.ui.theme.TelemetryCanvasDark
import com.clearpath.nexus.ui.theme.TextLight
import com.clearpath.nexus.viewmodel.DashboardTab
import com.clearpath.nexus.viewmodel.DashboardViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CommandDashboardScreen(
    viewModel: DashboardViewModel = viewModel(),
) {
    val state by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "ClearPath Nexus",
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp,
                        )
                        Text(
                            text = "AI-Powered Railway Intelligence Command Center",
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            color = TextLight,
                        )
                    }
                },
                actions = {
                    Text(
                        text = "OFFLINE DEMO",
                        modifier = Modifier
                            .padding(end = 8.dp)
                            .background(SolarRiskAmber)
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace,
                    )
                    Text(
                        text = "v1.0",
                        modifier = Modifier
                            .padding(end = 16.dp)
                            .background(AccentSafetyBlue)
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = PrimaryCommandBlue,
                    titleContentColor = androidx.compose.ui.graphics.Color.White,
                    actionIconContentColor = androidx.compose.ui.graphics.Color.White,
                ),
            )
        },
        bottomBar = {
            NavigationBar(containerColor = PanelDark) {
                NavigationBarItem(
                    selected = state.selectedTab == DashboardTab.CONFIGURE,
                    onClick = { viewModel.onTabSelected(DashboardTab.CONFIGURE) },
                    icon = { Icon(Icons.Default.Settings, contentDescription = "Configure") },
                    label = { Text("Configure") },
                    colors = navColors(),
                )
                NavigationBarItem(
                    selected = state.selectedTab == DashboardTab.MAP,
                    onClick = { viewModel.onTabSelected(DashboardTab.MAP) },
                    icon = { Icon(Icons.Default.Map, contentDescription = "Map") },
                    label = { Text("Map") },
                    colors = navColors(),
                )
                NavigationBarItem(
                    selected = state.selectedTab == DashboardTab.TELEMETRY,
                    onClick = { viewModel.onTabSelected(DashboardTab.TELEMETRY) },
                    icon = { Icon(Icons.Default.Speed, contentDescription = "Telemetry") },
                    label = { Text("Telemetry") },
                    colors = navColors(),
                )
            }
        },
        containerColor = PrimaryCommandBlue,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(
                    when (state.selectedTab) {
                        DashboardTab.MAP -> TelemetryCanvasDark
                        else -> PanelDark
                    },
                ),
        ) {
            when (state.selectedTab) {
                DashboardTab.CONFIGURE -> ConfigPanel(
                    height = state.height,
                    width = state.width,
                    weight = state.weight,
                    sourceCode = state.sourceCode,
                    destCode = state.destCode,
                    trainHours = state.trainHours,
                    stations = state.stations,
                    isLoading = state.isLoading,
                    error = state.error,
                    onHeightChange = viewModel::onHeightChange,
                    onWidthChange = viewModel::onWidthChange,
                    onWeightChange = viewModel::onWeightChange,
                    onSourceChange = viewModel::onSourceChange,
                    onDestChange = viewModel::onDestChange,
                    onTrainHoursChange = viewModel::onTrainHoursChange,
                    onEvaluate = viewModel::evaluateRoute,
                    modifier = Modifier.fillMaxSize(),
                )

                DashboardTab.MAP -> RouteMapView(
                    segments = state.result?.segments ?: emptyList(),
                    stations = state.stations,
                    environmentalZones = state.environmentalZones,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(8.dp),
                )

                DashboardTab.TELEMETRY -> TelemetryPanel(
                    result = state.result,
                    stormSeverity = state.stormSeverity,
                    solarKp = state.solarKp,
                    portCongestion = state.portCongestion,
                    simLoading = state.simLoading,
                    simulatedScore = state.simulatedScore,
                    simAlerts = state.simAlerts,
                    onStormChange = viewModel::onStormChange,
                    onSolarChange = viewModel::onSolarChange,
                    onPortChange = viewModel::onPortChange,
                    onSimulate = viewModel::simulateThreat,
                    modifier = Modifier.fillMaxSize(),
                )
            }
        }
    }
}

@Composable
private fun navColors() = NavigationBarItemDefaults.colors(
    selectedIconColor = AccentSafetyBlue,
    selectedTextColor = AccentSafetyBlue,
    indicatorColor = AccentSafetyBlue.copy(alpha = 0.2f),
    unselectedIconColor = TextLight.copy(alpha = 0.6f),
    unselectedTextColor = TextLight.copy(alpha = 0.6f),
)
