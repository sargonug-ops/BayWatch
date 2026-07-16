package com.baywatch.app.data.repository

import android.content.Context
import com.baywatch.app.data.ServiceLocator
import com.baywatch.app.data.model.GeoJsonGeometry
import com.baywatch.app.data.model.MapState
import com.baywatch.app.data.model.TransitAlert
import com.baywatch.app.data.model.Zone
import com.baywatch.app.data.model.ZoneType
import com.baywatch.app.data.remote.BayWatchApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import java.time.DayOfWeek
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime

class ZoneRepository(
    private val api: BayWatchApi,
    private val context: Context,
) {
    suspend fun fetchMapState(): MapState = withContext(Dispatchers.IO) {
        try {
            api.getMapState()
        } catch (_: Exception) {
            buildOfflineFallback()
        }
    }

    private fun buildOfflineFallback(): MapState {
        val schools = loadBundledSchools()
        val activeSchools = if (isSchoolZoneWindowActive()) schools else emptyList()
        val zones = activeSchools.map { school ->
            Zone(
                id = "school-${school.id}",
                type = ZoneType.SCHOOL_ZONE,
                title = school.name,
                summary = "Offline fallback — approximate school zone",
                severity = 1,
                geometry = circleGeometry(school.lat, school.lng, 150.0),
                source = "bundled-schools",
            )
        }

        return MapState(
            refreshedAt = ZonedDateTime.now(ZoneId.of("America/Los_Angeles")).toString(),
            bbox = SF_BBOX,
            zones = zones,
            transitAlerts = listOf(
                TransitAlert(
                    id = "offline",
                    agency = "Bay-Watch",
                    header = "Offline mode",
                    description = "Could not reach backend. Showing bundled school zones only.",
                ),
            ),
            schoolZonesActive = activeSchools.isNotEmpty(),
            demo = true,
        )
    }

    private fun loadBundledSchools(): List<BundledSchool> {
        val text = context.assets.open("schools_sf.json").bufferedReader().use { it.readText() }
        val bundle = ServiceLocator.json.decodeFromString(SchoolBundle.serializer(), text)
        return bundle.schools
    }

    private fun isSchoolZoneWindowActive(): Boolean {
        val now = ZonedDateTime.now(ZoneId.of("America/Los_Angeles"))
        if (now.dayOfWeek == DayOfWeek.SATURDAY || now.dayOfWeek == DayOfWeek.SUNDAY) {
            return false
        }
        val time = now.toLocalTime()
        val morning = LocalTime.of(7, 30)..LocalTime.of(8, 30)
        val afternoon = LocalTime.of(14, 30)..LocalTime.of(15, 30)
        return time in morning || time in afternoon
    }

    private fun circleGeometry(lat: Double, lng: Double, radiusMeters: Double): GeoJsonGeometry {
        val ring = buildCircleRing(lat, lng, radiusMeters)
        val jsonRing = JsonArray(ring.map { pair ->
            JsonArray(listOf(JsonPrimitive(pair.first), JsonPrimitive(pair.second)))
        })
        return GeoJsonGeometry(type = "Polygon", coordinates = JsonArray(listOf(jsonRing)))
    }

    private fun buildCircleRing(lat: Double, lng: Double, radiusMeters: Double, steps: Int = 32): List<Pair<Double, Double>> {
        val earthRadius = 6_371_000.0
        val latRad = Math.toRadians(lat)
        val lngRad = Math.toRadians(lng)
        val angular = radiusMeters / earthRadius
        return buildList {
            for (i in 0..steps) {
                val bearing = 2.0 * Math.PI * i / steps
                val latPoint = Math.asin(
                    Math.sin(latRad) * Math.cos(angular) +
                        Math.cos(latRad) * Math.sin(angular) * Math.cos(bearing),
                )
                val lngPoint = lngRad + Math.atan2(
                    Math.sin(bearing) * Math.sin(angular) * Math.cos(latRad),
                    Math.cos(angular) - Math.sin(latRad) * Math.sin(latPoint),
                )
                add(Math.toDegrees(lngPoint) to Math.toDegrees(latPoint))
            }
        }
    }

    companion object {
        private val SF_BBOX = com.baywatch.app.data.model.MapBbox(
            south = 37.708,
            west = -122.515,
            north = 37.833,
            east = -122.357,
        )
    }
}

@kotlinx.serialization.Serializable
private data class SchoolBundle(
    val version: Int,
    val schools: List<BundledSchool>,
)

@kotlinx.serialization.Serializable
private data class BundledSchool(
    val id: String,
    val name: String,
    val lat: Double,
    val lng: Double,
)
