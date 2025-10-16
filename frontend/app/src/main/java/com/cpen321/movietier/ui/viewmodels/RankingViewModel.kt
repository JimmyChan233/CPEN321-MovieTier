package com.cpen321.movietier.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpen321.movietier.data.model.RankedMovie
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.data.repository.MovieRepository
import com.cpen321.movietier.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class RankingUiState(
    val isLoading: Boolean = false,
    val rankedMovies: List<RankedMovie> = emptyList(),
    val errorMessage: String? = null
)

@HiltViewModel
class RankingViewModel @Inject constructor(
    private val movieRepository: MovieRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(RankingUiState())
    val uiState: StateFlow<RankingUiState> = _uiState.asStateFlow()

    private val _events = MutableSharedFlow<RankingEvent>()
    val events = _events

    private val _searchResults = MutableStateFlow<List<Movie>>(emptyList())
    val searchResults: StateFlow<List<Movie>> = _searchResults.asStateFlow()

    init {
        loadRankedMovies()
    }

    fun loadRankedMovies() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            when (val result = movieRepository.getRankedMovies()) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        rankedMovies = result.data
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = result.message
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    fun searchMovies(query: String) {
        if (query.length < 2) { _searchResults.value = emptyList(); return }
        viewModelScope.launch {
            when (val res = movieRepository.searchMovies(query)) {
                is Result.Success -> _searchResults.value = res.data
                else -> _searchResults.value = emptyList()
            }
        }
    }

    fun addWatchedMovie(title: String, posterPath: String?) {
        viewModelScope.launch {
            // Generate a simple temporary movieId for testing (timestamp seconds)
            val movieId = (System.currentTimeMillis() / 1000L).toInt()
            when (val res = movieRepository.addMovie(movieId, title, posterPath, null)) {
                is Result.Success -> {
                    _events.emit(RankingEvent.Message("Added '$title' to rankings"))
                    loadRankedMovies()
                }
                is Result.Error -> {
                    _events.emit(RankingEvent.Message(res.message ?: "Failed to add movie"))
                }
                else -> {}
            }
        }
    }

    fun addMovieFromSearch(movie: Movie) {
        viewModelScope.launch {
            when (val res = movieRepository.addMovie(movie.id, movie.title, movie.posterPath, movie.overview)) {
                is Result.Success -> {
                    _events.emit(RankingEvent.Message("Added '${movie.title}' to rankings"))
                    loadRankedMovies()
                }
                is Result.Error -> {
                    _events.emit(RankingEvent.Message(res.message ?: "Failed to add movie"))
                }
                else -> {}
            }
        }
    }
}

sealed class RankingEvent {
    data class Message(val text: String): RankingEvent()
}
