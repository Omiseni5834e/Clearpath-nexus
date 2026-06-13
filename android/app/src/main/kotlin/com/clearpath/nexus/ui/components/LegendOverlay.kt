package com.clearpath.nexus.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.clearpath.nexus.ui.theme.StatusApprovedGreen
import com.clearpath.nexus.ui.theme.SolarRiskAmber
import com.clearpath.nexus.ui.theme.StatusBlockedRed

@Composable
fun LegendOverlay(
    alternateRoutes: List<com.clearpath.nexus.data.model.AlternateRoute>
) {
    // Determine which reliability colors are present based on route scores
    val hasGreen = alternateRoutes.any { it.reliabilityScore >= 80 }
    val hasAmber = alternateRoutes.any { it.reliabilityScore in 55..79 }
    val hasRed = alternateRoutes.any { it.reliabilityScore < 55 }

    Column(
        modifier = Modifier
            .background(color = Color.Black.copy(alpha = 0.6f), shape = RoundedCornerShape(8.dp))
            .padding(8.dp)
            .alpha(0.9f)
    ) {
        if (hasGreen) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(12.dp)
                        .background(color = StatusApprovedGreen, shape = RoundedCornerShape(6.dp))
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text("High reliability", style = MaterialTheme.typography.bodySmall, color = Color.White)
            }
        }
        if (hasAmber) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(12.dp)
                        .background(color = SolarRiskAmber, shape = RoundedCornerShape(6.dp))
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text("Medium reliability", style = MaterialTheme.typography.bodySmall, color = Color.White)
            }
        }
        if (hasRed) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(12.dp)
                        .background(color = StatusBlockedRed, shape = RoundedCornerShape(6.dp))
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text("Low reliability", style = MaterialTheme.typography.bodySmall, color = Color.White)
            }
        }
    }
}
