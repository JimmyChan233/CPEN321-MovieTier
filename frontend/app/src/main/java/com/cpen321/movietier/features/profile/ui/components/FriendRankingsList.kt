package com.cpen321.movietier.features.profile.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import com.cpen321.movietier.shared.models.Movie
import com.cpen321.movietier.shared.models.RankedMovie

/**
 * Scrollable list of friend's ranked movies.
 */
@Composable
internal fun FriendRankingsList(
    rankings: List<RankedMovie>,
    movieDetailsMap: Map<Int, Movie>,
    onMovieSelect: (Movie) -> Unit
) {
    LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        items(rankings, key = { it.id }) { rankedMovie ->
            val movieDetails = movieDetailsMap[rankedMovie.movie.id]
            RankedMovieCard(
                rankedMovie = rankedMovie,
                movieDetails = movieDetails,
                onMovieClick = {
                    onMovieSelect(movieDetails ?: rankedMovie.movie)
                }
            )
        }
    }
}
