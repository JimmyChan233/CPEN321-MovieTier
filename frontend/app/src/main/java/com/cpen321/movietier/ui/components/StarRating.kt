package com.cpen321.movietier.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.graphics.drawscope.clipRect

@Composable
fun StarRating(
    rating: Double,
    modifier: Modifier = Modifier,
    starSize: Dp = 16.dp,
    color: Color = Color(0xFFFFD700), // Gold for filled portion
    showRatingNumber: Boolean = true
) {
    // TMDB ratings are 0-10, convert to 0-5 for stars
    val scaledRating = (rating / 2.0).coerceIn(0.0, 5.0)
    val emptyColor = MaterialTheme.colorScheme.onSurfaceVariant

    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        // Draw exactly 5 stars with partial fill support
        for (i in 1..5) {
            val fill = (scaledRating - (i - 1)).coerceIn(0.0, 1.0).toFloat()
            Box(modifier = Modifier.size(starSize), contentAlignment = Alignment.Center) {
                // Base: outlined/empty star
                Icon(
                    imageVector = Icons.Outlined.Star,
                    contentDescription = null,
                    tint = emptyColor,
                    modifier = Modifier.matchParentSize()
                )
                if (fill > 0f) {
                    // Overlay: filled star clipped to fraction
                    Icon(
                        imageVector = Icons.Filled.Star,
                        contentDescription = null,
                        tint = color,
                        modifier = Modifier
                            .matchParentSize()
                            .drawWithContent {
                                val clipWidth = size.width * fill
                                clipRect(left = 0f, top = 0f, right = clipWidth, bottom = size.height) {
                                    this@drawWithContent.drawContent()
                                }
                            }
                    )
                }
            }
        }

        // Show rating number
        if (showRatingNumber) {
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = "%.1f".format(rating),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
