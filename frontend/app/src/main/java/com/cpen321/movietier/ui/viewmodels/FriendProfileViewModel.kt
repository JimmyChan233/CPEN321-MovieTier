package com.cpen321.movietier.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpen321.movietier.data.model.WatchlistItem
import com.cpen321.movietier.data.model.RankedMovie
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
import java.io.IOException
import javax.inject.Inject

data class FriendProfileUi(
    val isLoading: Boolean = false,
    val userName: String? = null,
    val userEmail: String? = null,
    val watchlist: List<WatchlistItem> = emptyList(),
    val rankings: List<RankedMovie> = emptyList(),
    val errorMessage: String? = null
)

@HiltViewModel
class FriendProfileViewModel @Inject constructor(
    private val watchlistRepository: WatchlistRepository,
    private val apiService: ApiService,
    private val movieRepository: MovieRepository,
    private val sseClient: com.cpen321.movietier.data.api.SseClient
) : ViewModel() {
    private val _uiState = MutableStateFlow(FriendProfileUi())
    val uiState: StateFlow<FriendProfileUi> = _uiState.asStateFlow()

    fun load(userId: String) {
        if (currentUserId == userId) return
        currentUserId = userId

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            var error: String? = null
            // Load user basic info
            val userRes = try { apiService.getUser(userId) } catch (e: IOException) { null }
            val user = if (userRes != null && userRes.isSuccessful && userRes.body()?.success == true) userRes.body()!!.data else null
            // Load watchlist
            val wlRes = watchlistRepository.getUserWatchlist(userId)
            val wl = if (wlRes is Result.Success) wlRes.data else { error = (wlRes as? Result.Error)?.message; emptyList() }
            // Load rankings
            val rankingsRes = movieRepository.getUserRankings(userId)
            val rankings = if (rankingsRes is Result.Success) rankingsRes.data else { error = (rankingsRes as? Result.Error)?.message; emptyList() }

            _uiState.value = FriendProfileUi(
                isLoading = false,
                userName = user?.name,
                userEmail = user?.email,
                watchlist = wl,
                rankings = rankings,
                errorMessage = error
            )
        }
        connectToSse(userId)
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

    private var currentUserId: String? = null

    private fun connectToSse(userId: String) {
        sseClient.connect("friends/stream") { event, data ->
            if (event == "ranking_changed") {
                val changedUserId = data?.let {
                    val match = Regex("\"userId\":\"([^\"]+)\"").find(it)
                    match?.groups?.get(1)?.value
                }
                if (changedUserId == userId) {
                    viewModelScope.launch {
                        val rankingsRes = movieRepository.getUserRankings(userId)
                        if (rankingsRes is Result.Success) {
                            _uiState.value = _uiState.value.copy(rankings = rankingsRes.data)
                        }
                    }
                }
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        viewModelScope.launch {
            sseClient.closePath("friends/stream")
        }
    }
}
