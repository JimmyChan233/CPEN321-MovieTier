package com.cpen321.movietier.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.data.model.MovieVideo
import com.cpen321.movietier.data.repository.MovieRepository
import com.cpen321.movietier.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import com.cpen321.movietier.data.repository.WatchlistRepository
import kotlinx.coroutines.flow.MutableSharedFlow
import com.cpen321.movietier.data.model.WatchProviders

data class RecommendationUiState(
    val isLoading: Boolean = false,
    val recommendations: List<Movie> = emptyList(),
    val errorMessage: String? = null,
    val isShowingTrending: Boolean = false
)

@HiltViewModel
class RecommendationViewModel @Inject constructor(
    private val movieRepository: MovieRepository,
    private val watchlistRepository: WatchlistRepository

) : ViewModel() {

    private val _uiState = MutableStateFlow(RecommendationUiState())
    val uiState: StateFlow<RecommendationUiState> = _uiState.asStateFlow()
    private val _events = MutableSharedFlow<FeedEvent>()
    val events = _events

    init {
        loadRecommendations()
    }

    fun loadRecommendations() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)

            // First, try to get personalized recommendations
            when (val result = movieRepository.getRecommendations()) {
                is Result.Success -> {
                    if (result.data.isNotEmpty()) {
                        // User has rankings, show personalized recommendations
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            recommendations = result.data,
                            isShowingTrending = false
                        )
                    } else {
                        // User has no rankings, fetch trending movies
                        loadTrendingMovies()
                    }
                }
                is Result.Error -> {
                    // If recommendations fail, try trending movies as fallback
                    loadTrendingMovies()
                }
                is Result.Loading -> {}
            }
        }
    }

    private suspend fun loadTrendingMovies() {
        when (val trendingResult = movieRepository.getTrendingMovies()) {
            is Result.Success -> {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    recommendations = trendingResult.data,
                    isShowingTrending = true
                )
            }
            is Result.Error -> {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = trendingResult.message
                )
            }
            is Result.Loading -> {}
        }
    }
    fun addToWatchlist(movie: Movie) {
        viewModelScope.launch {
            when (val res = watchlistRepository.addToWatchlist(movie.id, movie.title, movie.posterPath, movie.overview)) {
                is Result.Success -> { _events.emit(FeedEvent.Message("Added to watchlist")) }
                is Result.Error -> {
                    val msg = res.message ?: "Failed to add to watchlist"
                    if (msg.contains("already", ignoreCase = true)) {
                        _events.emit(FeedEvent.Message("Movie already in watchlist"))
                    } else {
                        _events.emit(FeedEvent.Message(msg))
                    }
                }
                else -> {}
            }
        }
    }

    suspend fun getWatchProviders(movieId: Int, country: String = "CA"): Result<WatchProviders> {
        return movieRepository.getWatchProviders(movieId, country)
    }

    suspend fun getMovieVideos(movieId: Int): Result<MovieVideo?> {
        return movieRepository.getMovieVideos(movieId)
    }

    suspend fun getMovieQuote(title: String, year: String? = null): Result<String> {
        return movieRepository.getMovieQuote(title, year)
    }
}
