package com.baywatch.app.ui.map.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

@Composable
fun ZoneLegend(modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF121820).copy(alpha = 0.92f)),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            LegendSwatch(color = Color(0xFFFF8C42), label = "Closure")
            LegendSwatch(color = Color(0xFFE63946), label = "Traffic")
            LegendSwatch(color = Color(0xFFFFD166), label = "School")
        }
    }
}

@Composable
private fun LegendSwatch(color: Color, label: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Card(
            modifier = Modifier.padding(top = 4.dp),
            colors = CardDefaults.cardColors(containerColor = color),
            shape = RoundedCornerShape(4.dp),
        ) {
            Text(text = "", modifier = Modifier.padding(6.dp))
        }
        Text(text = label, color = Color(0xFFE8EDF2))
    }
}
