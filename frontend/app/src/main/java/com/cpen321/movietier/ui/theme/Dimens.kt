package com.cpen321.movietier.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.unit.dp

@Immutable
data class Spacing(
    val xs: Int = 4,
    val sm: Int = 8,
    val md: Int = 16,
    val lg: Int = 24,
    val xl: Int = 32
) {
    val xsDp get() = xs.dp
    val smDp get() = sm.dp
    val mdDp get() = md.dp
    val lgDp get() = lg.dp
    val xlDp get() = xl.dp
}

val LocalSpacing = staticCompositionLocalOf { Spacing() }

@Composable
fun spacing() = LocalSpacing.current

