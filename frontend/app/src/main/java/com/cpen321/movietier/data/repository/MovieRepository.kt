package com.cpen321.movietier.data.repository

import com.cpen321.movietier.data.api.ApiService
import com.cpen321.movietier.data.local.MovieQuoteProvider
import com.cpen321.movietier.data.local.ProvidersCache
import com.cpen321.movietier.data.model.*
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MovieRepository @Inject constructor(
    private val apiService: ApiService,
    private val providersCache: ProvidersCache
) {
    private val detailsCache = mutableMapOf<Int, Movie>()
    suspend fun searchMovies(query: String): Result<List<Movie>> {
        return try {
            val response = apiService.searchMovies(query)
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()!!.data ?: emptyList())
            } else {
                Result.Error(Exception("Failed to search movies: ${response.message()}"))
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun getRankedMovies(): Result<List<RankedMovie>> {
        return try {
            val response = apiService.getRankedMovies()
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()!!.data ?: emptyList())
            } else {
                Result.Error(Exception("Failed to get ranked movies: ${response.message()}"))
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }


    suspend fun addMovie(
        movieId: Int,
        title: String,
        posterPath: String?,
        overview: String? = null
    ): Result<AddMovieResponse> {
        return try {
            val response = apiService.addMovie(AddMovieRequest(movieId, title, posterPath, overview))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()!!)
            } else {
                Result.Error(Exception(response.body()?.message ?: "Failed to add movie"))
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun compareMovies(
        movieId: Int,
        comparedMovieId: Int,
        preferredMovieId: Int
    ): Result<AddMovieResponse> {
        return try {
            val response = apiService.compareMovies(
                CompareMoviesRequest(movieId, comparedMovieId, preferredMovieId)
            )
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()!!)
            } else {
                Result.Error(Exception(response.body()?.message ?: "Failed to compare movies"))
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun getMovieVideos(movieId: Int): Result<MovieVideo?> {
        return try {
            val response = apiService.getMovieVideos(movieId)
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()!!.data)
            } else {
                Result.Error(Exception("Failed to get movie videos: ${response.message()}"))
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun getWatchProviders(movieId: Int, country: String = "CA"): Result<WatchProviders> {
        // 1) Try cache first
        providersCache.get(movieId, country)?.let { return Result.Success(it) }

        // 2) Fetch network and store
        return try {
            val response = apiService.getMovieProviders(movieId, country)
            if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
                val data = response.body()!!.data!!
                try { providersCache.put(movieId, country, data) } catch (_: Exception) {}
                Result.Success(data)
            } else {
                Result.Error(Exception("Failed to get watch providers: ${response.message()}"))
            }
        } catch (e: IOException) {
            // Optional: fall back to stale cache in the future
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun getMovieDetails(movieId: Int): Result<Movie> {
        detailsCache[movieId]?.let { return Result.Success(it) }
        return try {
            val response = apiService.getMovieDetails(movieId)
            if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
                val data = response.body()!!.data!!
                detailsCache[movieId] = data
                Result.Success(data)
            } else {
                Result.Error(Exception("Failed to get details: ${response.message()}"))
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun getUserRankings(userId: String): Result<List<RankedMovie>> {
        return try {
            val response = apiService.getUserRankings(userId)
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()!!.data ?: emptyList())
            } else {
                Result.Error(Exception("Failed to get user rankings: ${response.message()}"))
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun deleteRankedMovie(id: String): Result<Unit> {
        return try {
            val response = apiService.deleteRankedMovie(id)
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(Unit)
            } else {
                Result.Error(Exception("Failed to delete ranked movie: ${response.message()}"))
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun startRerank(rankedId: String): Result<AddMovieResponse> {
        return try {
            val response = apiService.startRerank(mapOf("rankedId" to rankedId))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()!!)
            } else {
                Result.Error(Exception("Failed to start rerank: ${response.message()}"))
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    // Cache for backend-fetched quotes
    private val apiQuoteCache = mutableMapOf<String, String>()

    private fun getCacheKey(title: String, year: String?): String {
        return "$title${year?.let { "::$it" } ?: ""}"
    }

    suspend fun getQuote(
        title: String,
        year: String? = null,
        rating: Double? = null
    ): Result<String> {
        // Step 1: Check if this title exists in the hardcoded database
        if (MovieQuoteProvider.hasQuoteInDatabase(title)) {
            val localQuote = MovieQuoteProvider.getQuote(title, year, rating)
            return Result.Success(localQuote)
        }

        // Step 2: Not in local database, try backend API for better quote
        val cacheKey = getCacheKey(title, year)

        // Check if we've already fetched from API for this title
        apiQuoteCache[cacheKey]?.let { return Result.Success(it) }

        // Fetch from backend API
        return try {
            val response = apiService.getQuote(title, year)
            if (response.isSuccessful && response.body()?.success == true && !response.body()?.data.isNullOrBlank()) {
                val quote = response.body()!!.data!!
                apiQuoteCache[cacheKey] = quote
                Result.Success(quote)
            } else {
                // API failed or returned empty, fall back to local quote
                val localQuote = MovieQuoteProvider.getQuote(title, year, rating)
                Result.Success(localQuote)
            }
        } catch (e: IOException) {
            // Network error, fall back to local quote
            val localQuote = MovieQuoteProvider.getQuote(title, year, rating)
            Result.Success(localQuote)
        }
    }

}
