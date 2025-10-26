package com.cpen321.movietier.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage

@Composable
fun Avatar(
    imageUrl: String?,
    name: String?,
    modifier: Modifier = Modifier,
    size: Dp = 40.dp,
    contentDescription: String? = null
) {
    val displayName = name?.takeIf { it.isNotBlank() }

    if (!imageUrl.isNullOrEmpty()) {
        AsyncImage(
            model = imageUrl,
            contentDescription = contentDescription ?: displayName?.let { "Avatar of $it" } ?: "Avatar",
            modifier = modifier
                .size(size)
                .clip(CircleShape),
            contentScale = ContentScale.Crop
        )
    } else {
        // Fallback to initials with seeded color
        val initials = getInitials(displayName)
        val backgroundColor = getColorFromName(displayName)

        Box(
            modifier = modifier
                .size(size)
                .clip(CircleShape)
                .background(backgroundColor),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = initials,
                color = Color.White,
                fontSize = (size.value * 0.4).sp,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

private fun getInitials(name: String?): String {
    val safeName = name?.trim().orEmpty()
    if (safeName.isEmpty()) return "?"
    val parts = safeName.split(" ").filter { it.isNotBlank() }
    return when {
        parts.isEmpty() -> "?"
        parts.size == 1 -> parts[0].take(1).uppercase()
        else -> "${parts.first().take(1)}${parts.last().take(1)}".uppercase()
    }
}

private fun getColorFromName(name: String?): Color {
    // Generate a consistent color based on the name's hash code
    val seed = name?.hashCode() ?: 0
    // Curated navy/blue/gold palette for better brand cohesion
    val colors = listOf(
        Color(0xFF1E3A8A), // deep blue
        Color(0xFF0F1E3F), // dark navy
        Color(0xFF233B6E), // navy
        Color(0xFF2A4971), // slate-blue
        Color(0xFF385C8A), // mid blue
        Color(0xFF3B82F6), // bright blue accent
        Color(0xFF60A5FA), // light blue accent
        Color(0xFFE0B74D), // muted gold
        Color(0xFFB8860B), // goldenrod
        Color(0xFF8C6D1F), // dark gold
        Color(0xFF1B2A41), // bluish slate
        Color(0xFF111A2E)  // surface navy
    )
    return colors[seed.mod(colors.size)]
}
