package com.clearpath.nexus.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ProfileRow(
    val id: String,
    @SerialName("display_name") val displayName: String?,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class RouteEvaluationRow(
    val id: String? = null,
    @SerialName("user_id") val userId: String,
    @SerialName("source_code") val sourceCode: String,
    @SerialName("dest_code") val destCode: String,
    @SerialName("cargo_height") val cargoHeight: Double,
    @SerialName("cargo_width") val cargoWidth: Double,
    @SerialName("cargo_weight") val cargoWeight: Double,
    @SerialName("selected_route_label") val selectedRouteLabel: String?,
    @SerialName("reliability_score") val reliabilityScore: Int?,
    @SerialName("weather_score") val weatherScore: Int?,
    val status: String?,
    @SerialName("estimated_hours") val estimatedHours: Double?,
    @SerialName("created_at") val createdAt: String? = null
)
