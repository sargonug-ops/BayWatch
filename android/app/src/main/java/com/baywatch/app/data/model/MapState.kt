package com.baywatch.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class ZoneType {
    @SerialName("ROAD_CLOSURE")
    ROAD_CLOSURE,

    @SerialName("TRAFFIC_EVENT")
    TRAFFIC_EVENT,

    @SerialName("SCHOOL_ZONE")
    SCHOOL_ZONE,
}

@Serializable
data class GeoJsonGeometry(
    val type: String,
    val coordinates: kotlinx.serialization.json.JsonElement,
)

@Serializable
data class Zone(
    val id: String,
    val type: ZoneType,
    val title: String,
    val summary: String,
    val severity: Int = 1,
    val geometry: GeoJsonGeometry,
    val source: String,
    val activeUntil: String? = null,
)

@Serializable
data class TransitAlert(
    val id: String,
    val agency: String,
    val header: String,
    val description: String,
    val severity: Int = 1,
)

@Serializable
data class MapBbox(
    val south: Double,
    val west: Double,
    val north: Double,
    val east: Double,
)

@Serializable
data class MapState(
    val refreshedAt: String,
    val bbox: MapBbox,
    val zones: List<Zone>,
    val transitAlerts: List<TransitAlert> = emptyList(),
    val schoolZonesActive: Boolean = false,
    val demo: Boolean = false,
)
