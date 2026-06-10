package com.clearpath.nexus.ui.components

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.clearpath.nexus.data.model.RouteEvaluateResponse
import com.clearpath.nexus.ui.theme.AccentSafetyBlue
import com.clearpath.nexus.ui.theme.PanelBorder
import com.clearpath.nexus.ui.theme.StatusApprovedGreen
import com.clearpath.nexus.ui.theme.StatusBlockedRed
import com.clearpath.nexus.ui.theme.TextLight
import com.clearpath.nexus.ui.theme.TextMuted

@Composable
fun TelemetryPanel(
    result: RouteEvaluateResponse?,
    stormSeverity: Float,
    solarKp: Float,
    portCongestion: Float,
    simLoading: Boolean,
    simulatedScore: Int?,
    simAlerts: List<String>,
    onStormChange: (Float) -> Unit,
    onSolarChange: (Float) -> Unit,
    onPortChange: (Float) -> Unit,
    onSimulate: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val scrollState = rememberScrollState()
    val statusColor = when (result?.status) {
        "HARD_BLOCKED" -> StatusBlockedRed
        "APPROVED" -> StatusApprovedGreen
        else -> TextMuted
    }

    Column(
        modifier = modifier
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = "TELEMETRY BOARD",
            color = TextLight,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp,
        )

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, PanelBorder)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(
                text = "ROUTE RELIABILITY INDEX",
                color = TextMuted,
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace,
            )
            Text(
                text = result?.reliabilityScore?.toString() ?: "—",
                color = statusColor,
                fontSize = 48.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
            )
            result?.status?.let {
                Text(
                    text = it,
                    color = statusColor,
                    fontSize = 14.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Medium,
                )
            }
            result?.estimatedHours?.let {
                Text(
                    text = "Est. transit: ${it}h",
                    color = TextMuted,
                    fontSize = 12.sp,
                    fontFamily = FontFamily.Monospace,
                )
            }
        }

        result?.scoreBreakdown?.let { breakdown ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, PanelBorder)
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                ScoreItem("Weather", breakdown.weather)
                ScoreItem("Port Sync", breakdown.port)
                ScoreItem("Congestion", breakdown.congestion)
                ScoreItem("Historical", breakdown.historical)
            }
        }

        if (!result?.environmentalAlerts.isNullOrEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, StatusBlockedRed.copy(alpha = 0.5f))
                    .padding(12.dp),
            ) {
                Text(
                    text = "ENVIRONMENTAL ALERTS",
                    color = StatusBlockedRed,
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                )
                result!!.environmentalAlerts.forEach { alert ->
                    Text(
                        text = "⚠ $alert",
                        color = StatusBlockedRed.copy(alpha = 0.8f),
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }
        }

        ThreatSimulator(
            stormSeverity = stormSeverity,
            solarKp = solarKp,
            portCongestion = portCongestion,
            simLoading = simLoading,
            simulatedScore = simulatedScore,
            simAlerts = simAlerts,
            onStormChange = onStormChange,
            onSolarChange = onSolarChange,
            onPortChange = onPortChange,
            onSimulate = onSimulate,
        )

        if (result?.status == "APPROVED") {
            Button(
                onClick = { },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = AccentSafetyBlue),
            ) {
                Text("Finalize and Dispatch Route")
            }
        }
    }
}

@Composable
private fun ScoreItem(label: String, value: Double) {
    Column {
        Text(label, color = TextMuted, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
        Text(
            text = value.toInt().toString(),
            color = TextLight,
            fontSize = 18.sp,
            fontFamily = FontFamily.Monospace,
        )
    }
}
