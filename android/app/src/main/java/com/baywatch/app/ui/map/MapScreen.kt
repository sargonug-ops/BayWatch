package com.baywatch.app.ui.map

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DirectionsTransit
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.baywatch.app.ui.map.components.ZoneLegend
import com.baywatch.app.ui.map.components.ZonePolygonOverlay
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.maps.android.compose.MapType
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.rememberCameraPositionState
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

private val SF_CENTER = LatLng(37.7749, -122.4194)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen(viewModel: MapViewModel = viewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var hasLocation by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED,
        )
    }
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { grants ->
        hasLocation = grants[Manifest.permission.ACCESS_FINE_LOCATION] == true
    }

    LaunchedEffect(Unit) {
        if (!hasLocation) {
            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                ),
            )
        }
    }

    LaunchedEffect(Unit) {
        viewModel.startAutoRefresh()
    }

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(SF_CENTER, 12f)
    }

    var showAlerts by remember { mutableStateOf(false) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    Box(modifier = Modifier.fillMaxSize()) {
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            properties = MapProperties(
                isMyLocationEnabled = hasLocation,
                mapType = MapType.NORMAL,
            ),
            uiSettings = MapUiSettings(
                zoomControlsEnabled = false,
                myLocationButtonEnabled = true,
            ),
        ) {
            uiState.mapState?.zones?.forEach { zone ->
                ZonePolygonOverlay(zone = zone)
            }
        }

        Column(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            StatusCard(
                isLoading = uiState.isLoading,
                refreshedAt = uiState.mapState?.refreshedAt,
                zoneCount = uiState.mapState?.zones?.size ?: 0,
                schoolZonesActive = uiState.mapState?.schoolZonesActive == true,
                isDemo = uiState.mapState?.demo == true,
            )
            ZoneLegend()
        }

        Card(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(16.dp)
                .fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            onClick = { showAlerts = true },
            shape = RoundedCornerShape(16.dp),
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Icon(Icons.Default.DirectionsTransit, contentDescription = null)
                Column(modifier = Modifier.weight(1f)) {
                    Text("Transit alerts", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "${uiState.mapState?.transitAlerts?.size ?: 0} active",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
                if (uiState.isLoading) {
                    CircularProgressIndicator(modifier = Modifier.padding(4.dp))
                } else {
                    Icon(Icons.Default.Refresh, contentDescription = "Auto-refreshing every 5 min")
                }
            }
        }
    }

    if (showAlerts) {
        ModalBottomSheet(
            onDismissRequest = { showAlerts = false },
            sheetState = sheetState,
        ) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(uiState.mapState?.transitAlerts.orEmpty()) { alert ->
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(alert.agency, style = MaterialTheme.typography.labelLarge, color = Color(0xFF4CC9F0))
                            Text(alert.header, style = MaterialTheme.typography.titleMedium)
                            Text(alert.description, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatusCard(
    isLoading: Boolean,
    refreshedAt: String?,
    zoneCount: Int,
    schoolZonesActive: Boolean,
    isDemo: Boolean,
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.94f)),
        shape = RoundedCornerShape(16.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Warning, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                Text("Bay-Watch · San Francisco", style = MaterialTheme.typography.titleMedium)
            }
            Text("$zoneCount active zones on map", style = MaterialTheme.typography.bodyMedium)
            if (schoolZonesActive) {
                Text("School zones lit (estimated windows)", style = MaterialTheme.typography.bodySmall, color = Color(0xFFFFD166))
            }
            refreshedAt?.let {
                val label = runCatching {
                    ZonedDateTime.parse(it).format(DateTimeFormatter.ofPattern("h:mm a"))
                }.getOrDefault(it)
                Text("Updated $label", style = MaterialTheme.typography.bodySmall)
            }
            if (isDemo) {
                Text("Demo / offline data — add 511 API key on backend", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
            }
            if (isLoading) {
                CircularProgressIndicator(modifier = Modifier.padding(top = 4.dp))
            }
        }
    }
}
