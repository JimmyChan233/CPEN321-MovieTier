package com.cpen321.movietier.features.recommendation.data.repository

import com.cpen321.movietier.core.network.ApiService
import com.cpen321.movietier.shared.models.ApiResponse
import com.cpen321.movietier.shared.models.Movie
import retrofit2.Response
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RecommendationRepository @Inject constructor(
    private val apiService: ApiService
) {
    suspend fun getRecommendations(): Result<List<Movie>> {
        return try {
            val response = apiService.getRecommendations()
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()?.data ?: emptyList())
            } else {
                Result.Error(Exception("Failed to get recommendations: ${response.message()}"))
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun getTrendingMovies(): Result<List<Movie>> {
        return try {
            val response = apiService.getTrendingMovies()
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()?.data ?: emptyList())
            } else {
                Result.Error(Exception("Failed to get trending movies: ${response.message()}"))
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }
}
