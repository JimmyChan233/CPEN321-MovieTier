package com.cpen321.movietier.features.ranking.ui.state

import com.cpen321.movietier.shared.models.Movie
import com.cpen321.movietier.shared.models.RankedMovie

/** Unified state - all UI state in one place */
data class RankingUiState(
    val isLoading: Boolean = false,
    val rankedMovies: List<RankedMovie> = emptyList(),
    val compareState: CompareUiState? = null,
    val searchResults: List<Movie> = emptyList(),
    val errorMessage: String? = null
)

data class CompareUiState(
    val newMovie: Movie,
    val compareWith: Movie
)

sealed class RankingEvent {
    data class Message(val text: String) : RankingEvent()
    data class Error(val text: String) : RankingEvent()
}
