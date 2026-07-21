package com.baywatch.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.baywatch.app.ui.map.MapScreen
import com.baywatch.app.ui.theme.BayWatchTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            BayWatchTheme {
                MapScreen()
            }
        }
    }
}
