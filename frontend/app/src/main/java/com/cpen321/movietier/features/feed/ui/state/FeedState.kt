package com.cpen321.movietier.features.feed.ui.state

import com.cpen321.movietier.shared.models.FeedActivity
import com.cpen321.movietier.shared.models.FeedComment
import com.cpen321.movietier.shared.models.Movie

/** Unified state - all UI state in one place */
data class FeedUiState(
    val isLoading: Boolean = false,
    val feedActivities: List<FeedActivity> = emptyList(),
    val feedFilter: FeedFilter = FeedFilter.FRIENDS,
    val compareState: FeedCompareState? = null,
    val commentsMap: Map<String, List<FeedComment>> = emptyMap(),
    val errorMessage: String? = null
)

data class FeedCompareState(
    val newMovie: Movie,
    val compareWith: Movie
)

enum class FeedFilter {
    FRIENDS, MINE
}

sealed class FeedEvent {
    data class Message(val text: String) : FeedEvent()
    data class Error(val text: String) : FeedEvent()
}
