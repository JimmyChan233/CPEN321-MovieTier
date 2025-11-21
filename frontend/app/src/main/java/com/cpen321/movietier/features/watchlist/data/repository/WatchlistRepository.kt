package com.cpen321.movietier.features.watchlist.data.repository

import com.cpen321.movietier.core.network.ApiService
import com.cpen321.movietier.shared.models.AddWatchlistRequest
import com.cpen321.movietier.shared.models.WatchlistItem
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WatchlistRepository @Inject constructor(
    private val apiService: ApiService
) {
    suspend fun getWatchlist(): Result<List<WatchlistItem>> = try {
        val res = apiService.getWatchlist()
        if (res.isSuccessful && res.body()?.success == true) Result.Success(res.body()!!.data ?: emptyList())
        else Result.Error(Exception(res.body()?.message ?: "Failed to get watchlist"))
    } catch (e: IOException) { Result.Error(e, e.message) }

    suspend fun getUserWatchlist(userId: String): Result<List<WatchlistItem>> = try {
        val res = apiService.getUserWatchlist(userId)
        if (res.isSuccessful && res.body()?.success == true) Result.Success(res.body()!!.data ?: emptyList())
        else Result.Error(Exception(res.body()?.message ?: "Failed to get user watchlist"))
    } catch (e: IOException) { Result.Error(e, e.message) }

    suspend fun addToWatchlist(movieId: Int, title: String, posterPath: String?, overview: String?): Result<WatchlistItem> = try {
        val res = apiService.addToWatchlist(AddWatchlistRequest(movieId, title, posterPath, overview))
        if (res.isSuccessful && res.body()?.success == true && res.body()?.data != null) Result.Success(res.body()!!.data!!)
        else Result.Error(Exception(res.body()?.message ?: "Already in Watchlist"))
    } catch (e: IOException) { Result.Error(e, e.message) }

    suspend fun removeFromWatchlist(movieId: Int): Result<Unit> = try {
        val res = apiService.removeFromWatchlist(movieId)
        if (res.isSuccessful && res.body()?.success == true) Result.Success(Unit)
        else Result.Error(Exception(res.body()?.message ?: "Failed to remove from watchlist"))
    } catch (e: IOException) { Result.Error(e, e.message) }
}

