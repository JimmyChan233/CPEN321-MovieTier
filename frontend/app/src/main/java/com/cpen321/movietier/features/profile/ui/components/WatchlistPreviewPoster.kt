package com.cpen321.movietier.features.profile.ui.components

import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.cpen321.movietier.shared.models.WatchlistItem

/**
 * Movie poster image for watchlist preview.
 */
@Composable
internal fun WatchlistPreviewPoster(item: WatchlistItem) {
    AsyncImage(
        model = item.posterPath?.let { "https://image.tmdb.org/t/p/w342$it" },
        contentDescription = "Poster: ${item.title}",
        modifier = Modifier
            .width(90.dp)
            .aspectRatio(2f / 3f),
        contentScale = ContentScale.Crop
    )
}
