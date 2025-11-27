package com.cpen321.movietier.ui.watchlist.model

import com.cpen321.movietier.ui.watchlist.viewmodel.WatchlistUiState

/**
 * Groups watchlist content data
 */
data class WatchlistContentData(
    val uiState: WatchlistUiState,
    val movieDetails: Map<Int, com.cpen321.movietier.data.model.Movie>,
    val country: String
)