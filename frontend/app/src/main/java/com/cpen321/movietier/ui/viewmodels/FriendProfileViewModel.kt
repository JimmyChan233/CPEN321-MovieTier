package com.cpen321.movietier.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpen321.movietier.data.model.WatchlistItem
import com.cpen321.movietier.data.model.User
import com.cpen321.movietier.data.repository.Result
import com.cpen321.movietier.data.repository.WatchlistRepository
import com.cpen321.movietier.data.api.ApiService
import com.cpen321.movietier.data.repository.MovieRepository
import com.cpen321.movietier.data.model.WatchProviders
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.data.model.MovieVideo
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class FriendProfileUi(
    val isLoading: Boolean = false,
    val userName: String? = null,
    val userEmail: String? = null,
    val watchlist: List<WatchlistItem> = emptyList()
)

@HiltViewModel
class FriendProfileViewModel @Inject constructor(
    private val watchlistRepository: WatchlistRepository,
    private val apiService: ApiService,
    private val movieRepository: MovieRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(FriendProfileUi())
    val uiState: StateFlow<FriendProfileUi> = _uiState.asStateFlow()

    fun load(userId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            // Load user basic info
            val userRes = try { apiService.getUser(userId) } catch (e: Exception) { null }
            val user = if (userRes != null && userRes.isSuccessful && userRes.body()?.success == true) userRes.body()!!.data else null
            // Load watchlist
            val wl = when (val res = watchlistRepository.getUserWatchlist(userId)) {
                is Result.Success -> res.data
                else -> emptyList()
            }
            _uiState.value = FriendProfileUi(
                isLoading = false,
                userName = user?.name,
                userEmail = user?.email,
                watchlist = wl
            )
        }
    }

    suspend fun getWatchProviders(movieId: Int, country: String = "US"): Result<WatchProviders> {
        return movieRepository.getWatchProviders(movieId, country)
    }

    suspend fun addToMyWatchlist(movieId: Int, title: String, overview: String?, posterPath: String?): com.cpen321.movietier.data.repository.Result<WatchlistItem> {
        return watchlistRepository.addToWatchlist(
            movieId = movieId,
            title = title,
            posterPath = posterPath,
            overview = overview
        )
    }

    suspend fun getMovieVideos(movieId: Int): Result<MovieVideo?> {
        return movieRepository.getMovieVideos(movieId)
    }

    suspend fun addToRanking(movie: Movie): Result<*> {
        return movieRepository.addMovie(
            movieId = movie.id,
            title = movie.title,
            posterPath = movie.posterPath,
            overview = movie.overview
        )
    }

    suspend fun getMovieDetails(movieId: Int): Result<Movie> {
        return movieRepository.getMovieDetails(movieId)
    }
}
