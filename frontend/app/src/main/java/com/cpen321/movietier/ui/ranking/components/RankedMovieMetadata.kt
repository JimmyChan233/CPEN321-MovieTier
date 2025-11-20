package com.cpen321.movietier.ui.ranking.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.data.model.RankedMovie
import com.cpen321.movietier.ui.components.StarRating

@Composable
internal fun RankedMovieMetadata(
    rankedMovie: RankedMovie,
    details: Movie?
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        val year = (details?.releaseDate ?: rankedMovie.movie.releaseDate)?.take(4)
        if (!year.isNullOrBlank()) {
            Text(
                text = year,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        val rating = (details?.voteAverage ?: rankedMovie.movie.voteAverage)
        rating?.let {
            StarRating(rating = it, starSize = 14.dp)
        }
    }
}
