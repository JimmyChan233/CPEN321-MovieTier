package com.cpen321.movietier.ui.profile.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.data.model.WatchlistItem

/**
 * Scrollable list of friend's watchlist items.
 */
@Composable
internal fun FriendWatchlistTab(
    watchlist: List<WatchlistItem>,
    movieDetailsMap: Map<Int, Movie>,
    onMovieSelect: (Movie) -> Unit
) {
    LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        items(watchlist, key = { it.id }) { item ->
            val movieDetails = movieDetailsMap[item.movieId]
            WatchItemCard(
                item = item,
                movieDetails = movieDetails,
                onItemClick = {
                    val movieToDisplay = movieDetails ?: Movie(
                        id = item.movieId,
                        title = item.title,
                        overview = item.overview,
                        posterPath = item.posterPath,
                        releaseDate = null,
                        voteAverage = null
                    )
                    onMovieSelect(movieToDisplay)
                }
            )
        }
    }
}
