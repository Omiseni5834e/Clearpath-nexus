package com.clearpath.nexus

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.clearpath.nexus.ui.screens.CommandDashboardScreen
import com.clearpath.nexus.ui.theme.ClearPathNexusTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ClearPathNexusTheme {
                CommandDashboardScreen()
            }
        }
    }
}
