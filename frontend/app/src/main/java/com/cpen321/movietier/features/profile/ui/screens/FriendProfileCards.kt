package com.cpen321.movietier.features.profile.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.cpen321.movietier.shared.models.Movie
import com.cpen321.movietier.shared.models.RankedMovie
import com.cpen321.movietier.shared.models.WatchlistItem
import com.cpen321.movietier.shared.components.StarRating

/**
 * Card composables for FriendProfileScreen
 */

@Composable
fun RankedMovieCard(
    rankedMovie: RankedMovie,
    movieDetails: Movie?,
    onMovieClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        onClick = onMovieClick,
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            RankBadgeAndPoster(rankedMovie.rank, rankedMovie.movie.posterPath)
            MovieInfoColumn(rankedMovie.movie.title, movieDetails)
        }
    }
}

@Composable
private fun RankBadgeAndPoster(
    rank: Int,
    posterPath: String?
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Rank badge on top
        Surface(
            shape = MaterialTheme.shapes.medium,
            color = MaterialTheme.colorScheme.primaryContainer
        ) {
            Text(
                text = "#$rank",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
            )
        }

        // Poster below
        AsyncImage(
            model = posterPath?.let { "https://image.tmdb.org/t/p/w185$it" },
            contentDescription = null,
            modifier = Modifier
                .height(120.dp)
                .aspectRatio(2f / 3f)
                .clip(MaterialTheme.shapes.small),
            contentScale = ContentScale.Crop
        )
    }
}

@Composable
private fun RowScope.MovieInfoColumn(
    title: String,
    movieDetails: Movie?
) {
    Column(
        modifier = Modifier.weight(1f),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )

        movieDetails?.let {
            MovieMetadata(it)
            MovieCastInfo(it)
            MovieOverview(it)
        }
    }
}

@Composable
private fun MovieMetadata(movieDetails: Movie) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        val year = movieDetails.releaseDate?.take(4)
        if (!year.isNullOrBlank()) {
            Text(
                text = year,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        movieDetails.voteAverage?.let { rating ->
            StarRating(rating = rating, starSize = 14.dp)
        }
    }
}

@Composable
private fun MovieCastInfo(movieDetails: Movie) {
    movieDetails.cast?.take(3)?.let { castList ->
        if (castList.isNotEmpty()) {
            Text(
                text = castList.joinToString(", "),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun MovieOverview(movieDetails: Movie) {
    movieDetails.overview?.let { overview ->
        Text(
            text = overview,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 4,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
fun WatchItemCard(
    item: WatchlistItem,
    movieDetails: Movie?,
    onItemClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        onClick = onItemClick,
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            WatchItemImage(item.posterPath)
            WatchItemInfo(item, movieDetails)
        }
    }
}

@Composable
private fun WatchItemImage(posterPath: String?) {
    AsyncImage(
        model = posterPath?.let { "https://image.tmdb.org/t/p/w342$it" },
        contentDescription = null,
        modifier = Modifier
            .width(90.dp)
            .height(135.dp)
            .clip(RoundedCornerShape(8.dp)),
        contentScale = ContentScale.Crop
    )
}

@Composable
private fun RowScope.WatchItemInfo(
    item: WatchlistItem,
    movieDetails: Movie?
) {
    Column(
        modifier = Modifier.weight(1f),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(
            text = item.title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )

        item.overview?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )
        }

        WatchItemMetadata(movieDetails)
    }
}

@Composable
private fun WatchItemMetadata(movieDetails: Movie?) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        movieDetails?.releaseDate?.take(4)?.let { year ->
            Text(
                text = year,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        movieDetails?.voteAverage?.let { rating ->
            StarRating(rating = rating, starSize = 14.dp)
        }
    }
}

@Composable
fun FpEmptyStateMessage(message: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
    }
}