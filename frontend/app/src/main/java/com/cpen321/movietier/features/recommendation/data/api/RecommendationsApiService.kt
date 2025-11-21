package com.cpen321.movietier.features.recommendation.data.api

import com.cpen321.movietier.shared.models.*
import retrofit2.Response
import retrofit2.http.*

interface RecommendationsApiService {

    @GET("recommendations")
    suspend fun getRecommendations(): Response<ApiResponse<List<Movie>>>

    @GET("recommendations/trending")
    suspend fun getTrendingMovies(): Response<ApiResponse<List<Movie>>>
}
