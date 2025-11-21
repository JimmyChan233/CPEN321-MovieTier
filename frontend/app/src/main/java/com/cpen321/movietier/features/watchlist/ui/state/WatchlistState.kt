package com.cpen321.movietier.features.watchlist.ui.state

import com.cpen321.movietier.shared.models.WatchlistItem
import com.cpen321.movietier.shared.models.Movie

enum class WatchlistSort { DATE_DESC, DATE_ASC, RATING_DESC, RATING_ASC }

/** Unified state - all UI state in one place */
data class WatchlistUiState(
    val isLoading: Boolean = false,
    val items: List<WatchlistItem> = emptyList(),
    val displayed: List<WatchlistItem> = emptyList(),
    val sort: WatchlistSort = WatchlistSort.DATE_DESC,
    val compareState: WatchlistCompareState? = null,
    val movieDetails: Map<Int, Movie> = emptyMap(),
    val error: String? = null
)

data class WatchlistCompareState(
    val newMovie: Movie,
    val compareWith: Movie
)
