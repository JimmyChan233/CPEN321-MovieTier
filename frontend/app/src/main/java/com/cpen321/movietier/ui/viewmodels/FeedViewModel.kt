package com.cpen321.movietier.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpen321.movietier.data.model.FeedActivity
import com.cpen321.movietier.data.repository.FeedRepository
import com.cpen321.movietier.data.repository.Result
import com.cpen321.movietier.data.repository.WatchlistRepository
import com.cpen321.movietier.data.repository.MovieRepository
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.data.model.WatchProviders
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
    val errorMessage: String? = null
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

    init {
        loadFeed()
        connectStream()
    }

    fun loadFeed() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            when (val result = feedRepository.getFeed()) {
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
                is Result.Error -> { _events.emit(FeedEvent.Message(res.message ?: "Failed to add to watchlist")) }
                else -> {}
            }
        }
    }

    fun addToRanking(movie: Movie) {
        viewModelScope.launch {
            when (val res = movieRepository.addMovie(movie.id, movie.title, movie.posterPath, movie.overview)) {
                is Result.Success -> { _events.emit(FeedEvent.Message("Added to rankings")) }
                is Result.Error -> { _events.emit(FeedEvent.Message(res.message ?: "Failed to add to rankings")) }
                else -> {}
            }
        }
    }

    suspend fun getWatchProviders(movieId: Int, country: String = "CA"): Result<WatchProviders> {
        return movieRepository.getWatchProviders(movieId, country)
    }

    override fun onCleared() {
        super.onCleared()
        viewModelScope.launch { sseClient.closePath("feed/stream") }
    }
}

sealed class FeedEvent {
    data class Message(val text: String): FeedEvent()
}
