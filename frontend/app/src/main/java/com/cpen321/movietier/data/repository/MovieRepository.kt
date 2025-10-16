package com.cpen321.movietier.data.repository

import com.cpen321.movietier.data.api.ApiService
import com.cpen321.movietier.data.model.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MovieRepository @Inject constructor(
    private val apiService: ApiService
) {
    suspend fun searchMovies(query: String): Result<List<Movie>> {
        return try {
            val response = apiService.searchMovies(query)
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()!!.data ?: emptyList())
            } else {
                Result.Error(Exception("Failed to search movies: ${response.message()}"))
            }
        } catch (e: Exception) {
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
        } catch (e: Exception) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun addMovie(movieId: Int, title: String, posterPath: String?, overview: String? = null): Result<RankedMovie> {
        return try {
            val response = apiService.addMovie(AddMovieRequest(movieId, title, posterPath, overview))
            if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
                Result.Success(response.body()!!.data!!)
            } else {
                Result.Error(Exception("Failed to add movie: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun compareMovies(movieId: Int, comparedMovieId: Int, preferredMovieId: Int): Result<Unit> {
        return try {
            val response = apiService.compareMovies(
                CompareMoviesRequest(movieId, comparedMovieId, preferredMovieId)
            )
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(Unit)
            } else {
                Result.Error(Exception("Failed to compare movies: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun getRecommendations(): Result<List<Movie>> {
        return try {
            val response = apiService.getRecommendations()
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()!!.data ?: emptyList())
            } else {
                Result.Error(Exception("Failed to get recommendations: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }
}
