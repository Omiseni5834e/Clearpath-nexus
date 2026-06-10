package com.clearpath.nexus.ui.components

import android.graphics.Paint
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import com.clearpath.nexus.data.model.EnvironmentalZone
import com.clearpath.nexus.data.model.SegmentPath
import com.clearpath.nexus.data.model.Station
import androidx.compose.ui.graphics.toArgb
import com.clearpath.nexus.ui.theme.AccentSafetyBlue
import com.clearpath.nexus.ui.theme.SolarRiskAmber
import com.clearpath.nexus.ui.theme.StatusApprovedGreen
import com.clearpath.nexus.ui.theme.StatusBlockedRed
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.BoundingBox
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polygon
import org.osmdroid.views.overlay.Polyline

@Composable
fun RouteMapView(
    segments: List<SegmentPath>,
    stations: List<Station>,
    environmentalZones: List<EnvironmentalZone>,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val mapView = remember {
        MapView(context).apply {
            setTileSource(TileSourceFactory.MAPNIK)
            setMultiTouchControls(true)
            controller.setZoom(5.5)
            controller.setCenter(GeoPoint(21.1458, 79.0882))
        }
    }

    DisposableEffect(segments, stations, environmentalZones) {
        mapView.overlays.clear()

        environmentalZones.forEach { zone ->
            val polygon = Polygon().apply {
                points = zone.coordinates.map { GeoPoint(it[0], it[1]) }
                fillPaint.color = when (zone.type) {
                    "storm" -> android.graphics.Color.argb(64, 229, 62, 62)
                    else -> android.graphics.Color.argb(64, 221, 107, 32)
                }
                outlinePaint.color = when (zone.type) {
                    "storm" -> StatusBlockedRed.toArgb()
                    else -> SolarRiskAmber.toArgb()
                }
                outlinePaint.strokeWidth = 4f
            }
            mapView.overlays.add(polygon)
        }

        segments.forEach { segment ->
            val color = when (segment.status) {
                "HARD_BLOCKED" -> StatusBlockedRed.toArgb()
                "APPROVED" -> StatusApprovedGreen.toArgb()
                else -> AccentSafetyBlue.toArgb()
            }
            val polyline = Polyline().apply {
                setPoints(segment.coordinates.map { GeoPoint(it[0], it[1]) })
                outlinePaint.color = color
                outlinePaint.strokeWidth = 10f
                outlinePaint.strokeCap = Paint.Cap.ROUND
            }
            mapView.overlays.add(polyline)
        }

        stations.forEach { station ->
            val marker = Marker(mapView).apply {
                position = GeoPoint(station.lat, station.lon)
                title = "${station.code} — ${station.name}"
                setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
            }
            mapView.overlays.add(marker)
        }

        if (segments.isNotEmpty()) {
            val allPoints = segments.flatMap { seg ->
                seg.coordinates.map { GeoPoint(it[0], it[1]) }
            }
            if (allPoints.isNotEmpty()) {
                val lats = allPoints.map { it.latitude }
                val lons = allPoints.map { it.longitude }
                val bbox = BoundingBox(
                    lats.maxOrNull()!!,
                    lons.maxOrNull()!!,
                    lats.minOrNull()!!,
                    lons.minOrNull()!!,
                )
                mapView.post { mapView.zoomToBoundingBox(bbox, true, 80) }
            }
        }

        mapView.invalidate()
        onDispose { }
    }

    AndroidView(
        factory = { mapView },
        modifier = modifier.fillMaxSize(),
        update = { it.invalidate() },
    )
}
