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
import com.cpen321.movietier.data.local.MovieQuoteProvider

data class RecommendationUiState(
    val isLoading: Boolean = false,
    val recommendations: List<Movie> = emptyList(),
    val trendingMovies: List<Movie> = emptyList(),
    val errorMessage: String? = null,
    val isShowingTrending: Boolean = false
)

@HiltViewModel
class RecommendationViewModel @Inject constructor(
    private val movieRepository: MovieRepository,
    private val watchlistRepository: WatchlistRepository,
    private val quoteRepository: com.cpen321.movietier.data.repository.QuoteRepository

) : ViewModel() {

    private val _uiState = MutableStateFlow(RecommendationUiState())
    val uiState: StateFlow<RecommendationUiState> = _uiState.asStateFlow()
    private val _events = MutableSharedFlow<FeedEvent>()
    val events = _events
    private val quoteMovieCache = mutableMapOf<String, Movie?>()

    init {
        loadRecommendations()
    }

    fun loadRecommendations() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)

            // Load trending movies first (for featured card)
            loadTrendingMovies()

            // Then, try to get personalized recommendations
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
                        // User has no rankings, use trending movies for recommendations too
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            recommendations = _uiState.value.trendingMovies,
                            isShowingTrending = true
                        )
                    }
                }
                is Result.Error -> {
                    // If recommendations fail, use trending movies
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        recommendations = _uiState.value.trendingMovies,
                        isShowingTrending = true
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    private suspend fun loadTrendingMovies() {
        when (val trendingResult = movieRepository.getTrendingMovies()) {
            is Result.Success -> {
                _uiState.value = _uiState.value.copy(
                    trendingMovies = trendingResult.data
                )
            }
            is Result.Error -> {
                // If trending fails, we'll show error when recommendations also fail
            }
            is Result.Loading -> {}
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
                        res.message ?: "Failed to add to watchlist"
                    }
                    _events.emit(FeedEvent.Message(msg))
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

    suspend fun findMovieByTitle(title: String): Movie? {
        val key = MovieQuoteProvider.normalizedTitle(title)
        quoteMovieCache[key]?.let { return it }
        val result = movieRepository.searchMovies(title)
        val movie = when (result) {
            is Result.Success -> result.data.firstOrNull()
            else -> null
        }
        quoteMovieCache[key] = movie
        return movie
    }

    suspend fun getQuote(
        title: String,
        year: String? = null,
        rating: Double? = null
    ): String {
        return when (val result = quoteRepository.getQuote(title, year, rating)) {
            is Result.Success -> result.data
            is Result.Error -> title // Fallback to title if all else fails
            is Result.Loading -> title // Should not happen in this context
        }
    }
}
