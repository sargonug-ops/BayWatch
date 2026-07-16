package com.baywatch.app.ui.map.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.baywatch.app.data.model.GeoJsonGeometry
import com.baywatch.app.data.model.Zone
import com.baywatch.app.data.model.ZoneType
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.Polygon
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.double
import kotlinx.serialization.json.jsonArray

@Composable
fun ZonePolygonOverlay(zone: Zone) {
    val points = geometryToLatLngs(zone.geometry)
    if (points.isEmpty()) return

    val fillColor = zoneFillColor(zone.type)
    Polygon(
        points = points,
        fillColor = fillColor.copy(alpha = 0.35f),
        strokeColor = fillColor.copy(alpha = 0.9f),
        strokeWidth = 4f,
    )
}

private fun zoneFillColor(type: ZoneType): Color = when (type) {
    ZoneType.ROAD_CLOSURE -> Color(0xFFFF8C42)
    ZoneType.TRAFFIC_EVENT -> Color(0xFFE63946)
    ZoneType.SCHOOL_ZONE -> Color(0xFFFFD166)
}

private fun geometryToLatLngs(geometry: GeoJsonGeometry): List<LatLng> {
    return when (geometry.type) {
        "Polygon" -> parsePolygonRing(geometry.coordinates)
        "MultiPolygon" -> {
            val arrays = geometry.coordinates as? JsonArray ?: return emptyList()
            arrays.firstOrNull()?.let { parsePolygonRing(it) } ?: emptyList()
        }
        "LineString" -> parseLineString(geometry.coordinates)
        "Point" -> parsePoint(geometry.coordinates)?.let { listOf(it) } ?: emptyList()
        else -> emptyList()
    }
}

private fun parsePolygonRing(coordinates: JsonElement): List<LatLng> {
    val rings = coordinates.jsonArray
    val outer = rings.firstOrNull()?.jsonArray ?: return emptyList()
    return outer.mapNotNull { coord ->
        val pair = coord.jsonArray
        if (pair.size < 2) return@mapNotNull null
        LatLng(pair[1].double, pair[0].double)
    }
}

private fun parseLineString(coordinates: JsonElement): List<LatLng> {
    val points = coordinates.jsonArray
    return points.mapNotNull { coord ->
        val pair = coord.jsonArray
        if (pair.size < 2) return@mapNotNull null
        LatLng(pair[1].double, pair[0].double)
    }
}

private fun parsePoint(coordinates: JsonElement): LatLng? {
    val pair = coordinates.jsonArray
    if (pair.size < 2) return null
    return LatLng(pair[1].double, pair[0].double)
}
