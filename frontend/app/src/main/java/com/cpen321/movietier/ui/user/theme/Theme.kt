package com.cpen321.movietier.ui.user.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import android.graphics.drawable.GradientDrawable

enum class ThemeMode { System, Light, Dark }

// Navy / Blue / Gold brand palette
private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF5B8FDB),           // Lighter blue for better readability
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFF1E3A6E),  // Dark navy container
    onPrimaryContainer = Color(0xFFD9E6F7),

    secondary = Color(0xFFE0B74D),         // Muted gold
    onSecondary = Color(0xFF0B1220),

    tertiary = Color(0xFF5B7FA3),          // Lighter slate-blue accent
    onTertiary = Color(0xFFFFFFFF),

    error = Color(0xFFFF5252),             // Brighter red for delete button visibility
    onError = Color(0xFFFFFFFF),

    background = Color(0xFF0B1220),        // Deep navy background
    onBackground = Color(0xFFE6EDF7),
    surface = Color(0xFF162238),           // Elevated surface
    onSurface = Color(0xFFE6EDF7),
    surfaceVariant = Color(0xFF1F2D44),
    onSurfaceVariant = Color(0xFFB8C5DD)    // Much lighter for better readability
)

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF5B8FDB),           // Same blue as dark mode
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFF1E3A6E),  // Same as dark mode
    onPrimaryContainer = Color(0xFFFFFFFF),

    secondary = Color(0xFFD4AF37),
    onSecondary = Color(0xFF0B1220),

    tertiary = Color(0xFF385C8A),
    onTertiary = Color(0xFFFFFFFF),

    background = Color(0xFFF7FAFF),
    onBackground = Color(0xFF0B1220),
    surface = Color(0xFFFFFFFF),
    onSurface = Color(0xFF0B1220),
    surfaceVariant = Color(0xFFE8EEF8),
    onSurfaceVariant = Color(0xFF3C4A64)
)

@Composable
fun MovieTierTheme(
    themeMode: ThemeMode = ThemeMode.System,
    content: @Composable () -> Unit
) {
    val context = LocalContext.current
    val systemIsDark = isSystemInDarkTheme()
    val useDark = when (themeMode) {
        ThemeMode.System -> systemIsDark
        ThemeMode.Light -> false
        ThemeMode.Dark -> true
    }

    // Use branded colors for consistency (disable dynamic colors)
    val colorScheme = if (useDark) DarkColorScheme else LightColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window
            if (window != null) {
                runCatching {
                    // Create a gradient drawable for smooth status bar transition
                    val gradientDrawable = GradientDrawable(
                        GradientDrawable.Orientation.TOP_BOTTOM,
                        intArrayOf(
                            Color(0xFF0B1220).toArgb(), // Deep navy at top
                            colorScheme.primary.toArgb() // Primary color at bottom
                        )
                    )
                    window.statusBarColor = android.graphics.Color.TRANSPARENT
                    window.setBackgroundDrawable(gradientDrawable)

                    val insets = WindowCompat.getInsetsController(window, view)
                    insets.isAppearanceLightStatusBars = false // Always use light icons for dark gradient
                }
            }
        }
    }

    CompositionLocalProvider(LocalSpacing provides Spacing()) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Typography,
            shapes = Shapes,
            content = content
        )
    }
}
