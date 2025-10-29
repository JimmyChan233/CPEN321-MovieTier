package com.cpen321.movietier.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.cpen321.movietier.data.model.Movie
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.draw.clip

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MovieDetailBottomSheet(
    movie: Movie,
    onAddToRanking: (() -> Unit)? = null,
    onAddToWatchlist: (() -> Unit)? = null,
    onOpenWhereToWatch: (() -> Unit)? = null,
    onPlayTrailer: (() -> Unit)? = null,
    availabilityText: String? = null,
    availabilityLoading: Boolean = false,
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        sheetState = sheetState
    ) {
        Column(
            modifier = modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.Start
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                MovieDetailPoster(movie, onPlayTrailer)
                MovieDetailInfo(
                    movie = movie,
                    onAddToRanking = onAddToRanking,
                    onAddToWatchlist = onAddToWatchlist,
                    onOpenWhereToWatch = onOpenWhereToWatch,
                    availabilityText = availabilityText,
                    availabilityLoading = availabilityLoading
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            movie.overview?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun MovieDetailPoster(
    movie: Movie,
    onPlayTrailer: (() -> Unit)?
) {
    Box(
        modifier = Modifier
            .height(160.dp)
            .aspectRatio(2f / 3f)
    ) {
        AsyncImage(
            model = movie.posterPath?.let { "https://image.tmdb.org/t/p/w342$it" },
            contentDescription = "Poster: ${movie.title}",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )

        if (onPlayTrailer != null) {
            FilledIconButton(
                onClick = onPlayTrailer,
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(56.dp),
                colors = IconButtonDefaults.filledIconButtonColors(
                    containerColor = Color.Black.copy(alpha = 0.6f),
                    contentColor = Color.White
                )
            ) {
                Icon(
                    imageVector = Icons.Default.PlayArrow,
                    contentDescription = "Play Trailer",
                    modifier = Modifier.size(32.dp)
                )
            }
        }
    }
}

@Composable
private fun androidx.compose.foundation.layout.RowScope.MovieDetailInfo(
    movie: Movie,
    onAddToRanking: (() -> Unit)?,
    onAddToWatchlist: (() -> Unit)?,
    onOpenWhereToWatch: (() -> Unit)?,
    availabilityText: String?,
    availabilityLoading: Boolean
) {
    Column(modifier = Modifier.weight(1f)) {
        Text(
            text = movie.title,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(6.dp))

        MovieDetailMetadata(movie)

        Spacer(modifier = Modifier.height(8.dp))

        MovieDetailActions(
            onOpenWhereToWatch = onOpenWhereToWatch,
            onAddToRanking = onAddToRanking,
            onAddToWatchlist = onAddToWatchlist,
            availabilityText = availabilityText,
            availabilityLoading = availabilityLoading
        )
    }
}

@Composable
private fun MovieDetailMetadata(movie: Movie) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        movie.releaseDate?.take(4)?.let { year ->
            Text(
                text = year,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        movie.voteAverage?.let { rating ->
            StarRating(rating = rating, starSize = 14.dp)
        }
    }
}

@Composable
private fun MovieDetailActions(
    onOpenWhereToWatch: (() -> Unit)?,
    onAddToRanking: (() -> Unit)?,
    onAddToWatchlist: (() -> Unit)?,
    availabilityText: String?,
    availabilityLoading: Boolean
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (onOpenWhereToWatch != null) {
            Button(onClick = onOpenWhereToWatch, modifier = Modifier.fillMaxWidth()) {
                Text("Where to Watch")
            }
        }
        if (onAddToRanking != null) {
            FilledTonalButton(onClick = onAddToRanking, modifier = Modifier.fillMaxWidth()) {
                Text("Add to Ranking")
            }
        }
        if (onAddToWatchlist != null) {
            FilledTonalButton(onClick = onAddToWatchlist, modifier = Modifier.fillMaxWidth()) {
                Text("Add to Watchlist")
            }
        }
        Spacer(modifier = Modifier.height(4.dp))

        MovieDetailAvailability(availabilityText, availabilityLoading)
    }
}

@Composable
private fun MovieDetailAvailability(
    availabilityText: String?,
    availabilityLoading: Boolean
) {
    when {
        availabilityLoading -> {
            Text(
                "Checking availability…",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        !availabilityText.isNullOrBlank() -> {
            Text(
                availabilityText,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
