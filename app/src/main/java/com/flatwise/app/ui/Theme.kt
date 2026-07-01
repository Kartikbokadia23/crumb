package com.flatwise.app.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val FlatwiseColors = lightColorScheme(
    primary = Color(0xFF17120F),
    secondary = Color(0xFFF5C35B),
    background = Color(0xFFF8F2E8),
    surface = Color(0xFFFFFFFF),
    onPrimary = Color.White,
    onSecondary = Color(0xFF17120F),
    onBackground = Color(0xFF17120F),
    onSurface = Color(0xFF17120F),
)

@Composable
fun FlatwiseTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = FlatwiseColors,
        content = content,
    )
}
