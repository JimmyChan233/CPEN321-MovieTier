package com.cpen321.movietier.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpen321.movietier.data.model.WatchlistItem
import com.cpen321.movietier.data.repository.Result
import com.cpen321.movietier.data.repository.MovieRepository
import com.cpen321.movietier.data.model.WatchProviders
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.data.model.AddMovieResponse
import com.cpen321.movietier.data.repository.WatchlistRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class WatchlistUiState(
    val isLoading: Boolean = false,
    val items: List<WatchlistItem> = emptyList(),
    val error: String? = null
)

data class WatchlistCompareState(
    val newMovie: Movie,
    val compareWith: Movie
)

@HiltViewModel
class WatchlistViewModel @Inject constructor(
    private val repo: WatchlistRepository,
    private val movieRepository: MovieRepository
) : ViewModel() {
    private val _ui = MutableStateFlow(WatchlistUiState())
    val ui: StateFlow<WatchlistUiState> = _ui.asStateFlow()

    private val _events = MutableSharedFlow<FeedEvent>()
    val events = _events

    private val _compareState = MutableStateFlow<WatchlistCompareState?>(null)
    val compareState: StateFlow<WatchlistCompareState?> = _compareState.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _ui.value = _ui.value.copy(isLoading = true)
            when (val res = repo.getWatchlist()) {
                is Result.Success -> _ui.value = WatchlistUiState(false, res.data, null)
                is Result.Error -> _ui.value = WatchlistUiState(false, emptyList(), res.message)
                else -> {}
            }
        }
    }

    suspend fun getWatchProviders(movieId: Int, country: String = "CA"): Result<WatchProviders> {
        return movieRepository.getWatchProviders(movieId, country)
    }

    fun removeFromWatchlist(movieId: Int) {
        viewModelScope.launch {
            when (val res = repo.removeFromWatchlist(movieId)) {
                is Result.Success -> load()
                is Result.Error -> _ui.value = _ui.value.copy(error = res.message)
                else -> {}
            }
        }
    }

    fun addToRanking(item: WatchlistItem) {
        viewModelScope.launch {
            val movie = Movie(
                id = item.movieId,
                title = item.title,
                posterPath = item.posterPath,
                overview = item.overview,
                releaseDate = null,
                voteAverage = null
            )
            when (val res = movieRepository.addMovie(movie.id, movie.title, movie.posterPath, movie.overview)) {
                is Result.Success -> handleAddOrCompare(movie, res.data)
                is Result.Error -> _events.emit(FeedEvent.Error(res.message ?: "Failed to add to rankings"))
                else -> {}
            }
        }
    }

    private suspend fun handleAddOrCompare(newMovie: Movie, response: AddMovieResponse) {
        when (response.status) {
            "added" -> {
                _events.emit(FeedEvent.Message("Added '${newMovie.title}' to rankings"))
                load() // Refresh watchlist (movie should be removed)
            }
            "compare" -> {
                val cmp = response.data?.compareWith
                if (cmp != null) {
                    _compareState.value = WatchlistCompareState(newMovie = newMovie, compareWith = cmp)
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
                            val next = res.data.data?.compareWith
                            if (next != null) {
                                _compareState.value = WatchlistCompareState(newMovie = newMovie, compareWith = next)
                            } else {
                                _events.emit(FeedEvent.Error("Comparison data missing"))
                                _compareState.value = null
                            }
                        }
                        "added" -> {
                            _events.emit(FeedEvent.Message("Added '${newMovie.title}' to rankings"))
                            _compareState.value = null
                            load() // Refresh watchlist
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
}
