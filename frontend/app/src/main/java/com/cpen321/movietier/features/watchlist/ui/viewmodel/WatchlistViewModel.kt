package com.cpen321.movietier.features.watchlist.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpen321.movietier.shared.models.WatchlistItem
import com.cpen321.movietier.shared.repository.Result
import com.cpen321.movietier.features.ranking.data.repository.MovieRepository
import com.cpen321.movietier.shared.models.WatchProviders
import com.cpen321.movietier.shared.models.Movie
import com.cpen321.movietier.shared.models.AddMovieResponse
import com.cpen321.movietier.features.watchlist.data.repository.WatchlistRepository
import com.cpen321.movietier.features.feed.ui.state.FeedEvent
import com.cpen321.movietier.features.watchlist.ui.state.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class WatchlistViewModel @Inject constructor(
    private val repo: WatchlistRepository,
    private val movieRepository: MovieRepository
) : ViewModel() {
    private val _ui = MutableStateFlow(WatchlistUiState())
    val ui: StateFlow<WatchlistUiState> = _ui.asStateFlow()

    private val _events = MutableSharedFlow<FeedEvent>()
    val events = _events

    private val ratingsCache = mutableMapOf<Int, Double?>()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _ui.value = _ui.value.copy(isLoading = true)
            when (val res = repo.getWatchlist()) {
                is Result.Success -> {
                    val items = res.data
                    _ui.value = _ui.value.copy(
                        isLoading = false,
                        items = items,
                        displayed = sortList(items, _ui.value.sort),
                        error = null
                    )
                    prefetchRatings(items)
                }
                is Result.Error -> _ui.value = WatchlistUiState(
                    isLoading = false,
                    items = emptyList(),
                    displayed = emptyList(),
                    sort = WatchlistSort.DATE_DESC,
                    compareState = null,
                    movieDetails = emptyMap(),
                    error = res.message
                )
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

    private fun prefetchRatings(items: List<WatchlistItem>) {
        items.take(40).forEach { item ->
            if (!ratingsCache.containsKey(item.movieId)) {
                viewModelScope.launch {
                    when (val res = movieRepository.getMovieDetails(item.movieId)) {
                        is Result.Success -> {
                            ratingsCache[item.movieId] = res.data.voteAverage
                            val map = _ui.value.movieDetails.toMutableMap()
                            map[item.movieId] = res.data
                            _ui.value = _ui.value.copy(movieDetails = map)
                            if (_ui.value.sort == WatchlistSort.RATING_DESC || _ui.value.sort == WatchlistSort.RATING_ASC) {
                                _ui.value = _ui.value.copy(displayed = sortList(_ui.value.items, _ui.value.sort))
                            }
                        }
                        else -> {}
                    }
                }
            }
        }
    }

    private fun sortList(list: List<WatchlistItem>, sort: WatchlistSort): List<WatchlistItem> {
        return when (sort) {
            WatchlistSort.DATE_DESC -> list.sortedByDescending { it.createdAt }
            WatchlistSort.DATE_ASC -> list.sortedBy { it.createdAt }
            WatchlistSort.RATING_DESC -> list.sortedWith(
                compareByDescending<WatchlistItem> { ratingsCache[it.movieId] ?: Double.NEGATIVE_INFINITY }
                    .thenByDescending { it.createdAt }
            )
            WatchlistSort.RATING_ASC -> list.sortedWith(
                compareBy<WatchlistItem> { ratingsCache[it.movieId] ?: Double.POSITIVE_INFINITY }
                    .thenByDescending { it.createdAt }
            )
        }
    }

    fun setSort(sort: WatchlistSort) {
        val items = _ui.value.items
        _ui.value = _ui.value.copy(sort = sort, displayed = sortList(items, sort))
        if (sort == WatchlistSort.RATING_ASC || sort == WatchlistSort.RATING_DESC) {
            prefetchRatings(items)
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
                load() // Refresh watchlist (movie should be removed)
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
                    _ui.value = _ui.value.copy(compareState = WatchlistCompareState(newMovie = newMovie, compareWith = cmpMovie))
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
                                _ui.value = _ui.value.copy(compareState = WatchlistCompareState(newMovie = newMovie, compareWith = nextMovie))
                            } else {
                                _events.emit(FeedEvent.Error("Comparison data missing"))
                                _ui.value = _ui.value.copy(compareState = null)
                            }
                        }
                        "added" -> {
                            _events.emit(FeedEvent.Message("Added '${newMovie.title}' to rankings"))
                            _ui.value = _ui.value.copy(compareState = null)
                            load() // Refresh watchlist
                        }
                    }
                }
                is Result.Error -> {
                    _events.emit(FeedEvent.Error(res.message ?: "Comparison failed"))
                    _ui.value = _ui.value.copy(compareState = null)
                }
                else -> {}
            }
        }
    }

    // Backward compatibility for existing code
    val compareState: StateFlow<WatchlistCompareState?> = ui.map { it.compareState }.stateIn(viewModelScope, kotlinx.coroutines.flow.SharingStarted.Eagerly, null)
    val details: StateFlow<Map<Int, Movie>> = ui.map { it.movieDetails }.stateIn(viewModelScope, kotlinx.coroutines.flow.SharingStarted.Eagerly, emptyMap())
}
