package com.cpen321.movietier.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpen321.movietier.data.model.FeedActivity
import com.cpen321.movietier.data.model.FeedComment
import com.cpen321.movietier.data.repository.FeedRepository
import com.cpen321.movietier.data.repository.Result
import com.cpen321.movietier.data.repository.WatchlistRepository
import com.cpen321.movietier.data.repository.MovieRepository
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.data.model.WatchProviders
import com.cpen321.movietier.data.model.AddMovieResponse
import com.cpen321.movietier.data.api.SseClient
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class FeedUiState(
    val isLoading: Boolean = false,
    val feedActivities: List<FeedActivity> = emptyList(),
    val errorMessage: String? = null,
    val feedFilter: FeedFilter = FeedFilter.FRIENDS
)

enum class FeedFilter {
    FRIENDS,  // Show friends' activities
    MINE      // Show my activities
}

data class FeedCompareState(
    val newMovie: Movie,
    val compareWith: Movie
)

@HiltViewModel
class FeedViewModel @Inject constructor(
    private val feedRepository: FeedRepository,
    private val sseClient: SseClient,
    private val watchlistRepository: WatchlistRepository,
    private val movieRepository: MovieRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(FeedUiState())
    val uiState: StateFlow<FeedUiState> = _uiState.asStateFlow()

    private val _events = MutableSharedFlow<FeedEvent>()
    val events = _events

    private val _compareState = MutableStateFlow<FeedCompareState?>(null)
    val compareState: StateFlow<FeedCompareState?> = _compareState.asStateFlow()

    init {
        loadFeed()
        connectStream()
    }

    fun loadFeed() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val result = when (_uiState.value.feedFilter) {
                FeedFilter.FRIENDS -> feedRepository.getFeed()
                FeedFilter.MINE -> feedRepository.getMyFeed()
            }
            when (result) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        feedActivities = result.data
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = result.message ?: "Failed to load feed"
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    fun refreshFeed() = loadFeed()

    fun setFeedFilter(filter: FeedFilter) {
        if (_uiState.value.feedFilter != filter) {
            _uiState.value = _uiState.value.copy(feedFilter = filter)
            loadFeed()
        }
    }

    private fun connectStream() {
        sseClient.connect("feed/stream") { event, _ ->
            if (event == "feed_activity") {
                loadFeed()
            }
        }
    }

    fun addToWatchlist(movie: Movie) {
        viewModelScope.launch {
            when (val res = watchlistRepository.addToWatchlist(movie.id, movie.title, movie.posterPath, movie.overview)) {
                is Result.Success -> { _events.emit(FeedEvent.Message("Added to watchlist")) }
                is Result.Error -> {
                    val msg = if (res.message?.contains("already", ignoreCase = true) == true) {
                        "Already in Watchlist"
                    } else {
                        res.message ?: "Already in Watchlist"
                    }
                    _events.emit(FeedEvent.Error(msg))
                }
                else -> {}
            }
        }
    }

    fun addToRanking(movie: Movie) {
        viewModelScope.launch {
            when (val res = movieRepository.addMovie(movie.id, movie.title, movie.posterPath, movie.overview)) {
                is Result.Success -> handleAddOrCompare(movie, res.data)
                is Result.Error -> {
                    val msg = if (res.message?.contains("already", ignoreCase = true) == true) {
                        "Already in Rankings"
                    } else {
                        res.message ?: "Already in Rankings"
                    }
                    _events.emit(FeedEvent.Error(msg))
                }
                else -> {}
            }
        }
    }

    private suspend fun handleAddOrCompare(newMovie: Movie, response: AddMovieResponse) {
        when (response.status) {
            "added" -> {
                _events.emit(FeedEvent.Message("Added '${newMovie.title}' to rankings"))
                // Optional: refresh feed to reflect your own activity
                loadFeed()
            }
            "compare" -> {
                val cmpData = response.data?.compareWith
                if (cmpData != null) {
                    val cmpMovie = Movie(
                        id = cmpData.movieId,
                        title = cmpData.title,
                        overview = null,
                        posterPath = cmpData.posterPath,
                        releaseDate = null,
                        voteAverage = null
                    )
                    _compareState.value = FeedCompareState(newMovie = newMovie, compareWith = cmpMovie)
                } else {
                    _events.emit(FeedEvent.Error("Comparison data missing"))
                }
            }
        }
    }

    fun choosePreferred(newMovie: Movie, compareWith: Movie, preferred: Movie) {
        viewModelScope.launch {
            when (val res = movieRepository.compareMovies(newMovie.id, compareWith.id, preferred.id)) {
                is Result.Success -> {
                    when (res.data.status) {
                        "compare" -> {
                            val nextData = res.data.data?.compareWith
                            if (nextData != null) {
                                val nextMovie = Movie(
                                    id = nextData.movieId,
                                    title = nextData.title,
                                    overview = null,
                                    posterPath = nextData.posterPath,
                                    releaseDate = null,
                                    voteAverage = null
                                )
                                _compareState.value = FeedCompareState(newMovie = newMovie, compareWith = nextMovie)
                            } else {
                                _events.emit(FeedEvent.Error("Comparison data missing"))
                                _compareState.value = null
                            }
                        }
                        "added" -> {
                            _events.emit(FeedEvent.Message("Added '${newMovie.title}' to rankings"))
                            _compareState.value = null
                            loadFeed()
                        }
                    }
                }
                is Result.Error -> {
                    _events.emit(FeedEvent.Error(res.message ?: "Comparison failed"))
                    _compareState.value = null
                }
                else -> {}
            }
        }
    }

    suspend fun getWatchProviders(movieId: Int, country: String = "CA"): Result<WatchProviders> {
        return movieRepository.getWatchProviders(movieId, country)
    }

    fun toggleLike(activityId: String) {
        viewModelScope.launch {
            // Find the activity
            val activity = _uiState.value.feedActivities.find { it.id == activityId }
            if (activity != null) {
                // Optimistically update UI
                val updatedActivities = _uiState.value.feedActivities.map { act ->
                    if (act.id == activityId) {
                        act.copy(
                            isLikedByUser = !act.isLikedByUser,
                            likeCount = if (act.isLikedByUser) {
                                maxOf(act.likeCount - 1, 0)
                            } else {
                                act.likeCount + 1
                            }
                        )
                    } else {
                        act
                    }
                }
                _uiState.value = _uiState.value.copy(feedActivities = updatedActivities)

                // Make API call
                val result = if (activity.isLikedByUser) {
                    feedRepository.unlikeActivity(activityId)
                } else {
                    feedRepository.likeActivity(activityId)
                }

                // Revert on error
                if (result is Result.Error) {
                    val revertedActivities = _uiState.value.feedActivities.map { act ->
                        if (act.id == activityId) {
                            activity
                        } else {
                            act
                        }
                    }
                    _uiState.value = _uiState.value.copy(feedActivities = revertedActivities)
                    _events.emit(FeedEvent.Error(result.message ?: "Failed to toggle like"))
                }
            }
        }
    }

    private val _commentsState = MutableStateFlow<Map<String, List<FeedComment>>>(emptyMap())
    val commentsState: StateFlow<Map<String, List<FeedComment>>> = _commentsState.asStateFlow()

    fun loadComments(activityId: String) {
        viewModelScope.launch {
            when (val result = feedRepository.getComments(activityId)) {
                is Result.Success -> {
                    _commentsState.value = _commentsState.value + (activityId to result.data)
                }
                is Result.Error -> {
                    _events.emit(FeedEvent.Error(result.message ?: "Failed to load comments"))
                }
                else -> {}
            }
        }
    }

    fun addComment(activityId: String, text: String) {
        viewModelScope.launch {
            when (val result = feedRepository.addComment(activityId, text)) {
                is Result.Success -> {
                    // Add comment to list
                    val currentComments = _commentsState.value[activityId] ?: emptyList()
                    _commentsState.value = _commentsState.value + (activityId to (currentComments + result.data))

                    // Update comment count in feed
                    val updatedActivities = _uiState.value.feedActivities.map { act ->
                        if (act.id == activityId) {
                            act.copy(commentCount = act.commentCount + 1)
                        } else {
                            act
                        }
                    }
                    _uiState.value = _uiState.value.copy(feedActivities = updatedActivities)

                    _events.emit(FeedEvent.Message("Comment added"))
                }
                is Result.Error -> {
                    _events.emit(FeedEvent.Error(result.message ?: "Failed to add comment"))
                }
                else -> {}
            }
        }
    }

    fun deleteComment(activityId: String, commentId: String) {
        viewModelScope.launch {
            when (val result = feedRepository.deleteComment(activityId, commentId)) {
                is Result.Success -> {
                    // Remove comment from list
                    val currentComments = _commentsState.value[activityId] ?: emptyList()
                    _commentsState.value = _commentsState.value + (activityId to currentComments.filter { it.id != commentId })

                    // Update comment count in feed
                    val updatedActivities = _uiState.value.feedActivities.map { act ->
                        if (act.id == activityId) {
                            act.copy(commentCount = maxOf(act.commentCount - 1, 0))
                        } else {
                            act
                        }
                    }
                    _uiState.value = _uiState.value.copy(feedActivities = updatedActivities)

                    _events.emit(FeedEvent.Message("Comment deleted"))
                }
                is Result.Error -> {
                    _events.emit(FeedEvent.Error(result.message ?: "Failed to delete comment"))
                }
                else -> {}
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        viewModelScope.launch { sseClient.closePath("feed/stream") }
    }
}

sealed class FeedEvent {
    data class Message(val text: String): FeedEvent()
    data class Error(val text: String): FeedEvent()
}
