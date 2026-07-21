package com.baywatch.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val PulseColorScheme = darkColorScheme(
    primary = Color(0xFF4CC9F0),
    onPrimary = Color(0xFF0B0F14),
    secondary = Color(0xFFFFD166),
    background = Color(0xFF0B0F14),
    surface = Color(0xFF121820),
    onBackground = Color(0xFFE8EDF2),
    onSurface = Color(0xFFE8EDF2),
    error = Color(0xFFE63946),
)

@Composable
fun BayWatchTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = PulseColorScheme,
        content = content,
    )
}
