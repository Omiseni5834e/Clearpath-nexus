package com.clearpath.nexus.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.clearpath.nexus.data.model.Station
import com.clearpath.nexus.ui.theme.AccentSafetyBlue
import com.clearpath.nexus.ui.theme.PanelBorder
import com.clearpath.nexus.ui.theme.PanelDark
import com.clearpath.nexus.ui.theme.StatusBlockedRed
import com.clearpath.nexus.ui.theme.TextLight
import com.clearpath.nexus.ui.theme.TextMuted

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConfigPanel(
    height: String,
    width: String,
    weight: String,
    sourceCode: String,
    destCode: String,
    trainHours: String,
    stations: List<Station>,
    isLoading: Boolean,
    error: String?,
    onHeightChange: (String) -> Unit,
    onWidthChange: (String) -> Unit,
    onWeightChange: (String) -> Unit,
    onSourceChange: (String) -> Unit,
    onDestChange: (String) -> Unit,
    onTrainHoursChange: (String) -> Unit,
    onEvaluate: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val scrollState = rememberScrollState()
    val stationCodes = stations.map { it.code }.ifEmpty {
        listOf("NGP", "BSL", "MMR", "KYN", "JNPT", "PUNE")
    }

    Column(
        modifier = modifier
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = "CONFIGURATION INPUT",
            color = TextLight,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp,
        )

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            DimensionField("Height (m)", height, onHeightChange, Modifier.weight(1f))
            DimensionField("Width (m)", width, onWidthChange, Modifier.weight(1f))
            DimensionField("Weight (T)", weight, onWeightChange, Modifier.weight(1f))
        }

        StationDropdown("Source Station", sourceCode, stationCodes, stations, onSourceChange)
        StationDropdown("Destination", destCode, stationCodes, stations, onDestChange)

        OutlinedTextField(
            value = trainHours,
            onValueChange = onTrainHoursChange,
            label = { Text("Train Arrival (hours from now)", fontFamily = FontFamily.Monospace, fontSize = 12.sp) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            colors = fieldColors(),
        )

        Button(
            onClick = onEvaluate,
            enabled = !isLoading,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = AccentSafetyBlue),
        ) {
            Text(if (isLoading) "Evaluating Corridor…" else "Evaluate Corridor")
        }

        error?.let {
            Text(
                text = it,
                color = StatusBlockedRed,
                fontSize = 12.sp,
                fontFamily = FontFamily.Monospace,
            )
        }
    }
}

@Composable
private fun DimensionField(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        label = { Text(label, fontFamily = FontFamily.Monospace, fontSize = 11.sp) },
        modifier = modifier,
        singleLine = true,
        colors = fieldColors(),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StationDropdown(
    label: String,
    selected: String,
    codes: List<String>,
    stations: List<Station>,
    onSelected: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it },
    ) {
        OutlinedTextField(
            value = selected,
            onValueChange = {},
            readOnly = true,
            label = { Text(label, fontFamily = FontFamily.Monospace, fontSize = 12.sp) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
            modifier = Modifier
                .menuAnchor()
                .fillMaxWidth(),
            colors = fieldColors(),
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            codes.forEach { code ->
                val station = stations.find { it.code == code }
                val display = station?.let { "${it.code} — ${it.name}" } ?: code
                DropdownMenuItem(
                    text = { Text(display, fontFamily = FontFamily.Monospace) },
                    onClick = {
                        onSelected(code)
                        expanded = false
                    },
                )
            }
        }
    }
}

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = AccentSafetyBlue,
    unfocusedBorderColor = PanelBorder,
    focusedContainerColor = PanelDark,
    unfocusedContainerColor = PanelDark,
    focusedTextColor = androidx.compose.ui.graphics.Color.White,
    unfocusedTextColor = androidx.compose.ui.graphics.Color.White,
    focusedLabelColor = TextMuted,
    unfocusedLabelColor = TextMuted,
)
