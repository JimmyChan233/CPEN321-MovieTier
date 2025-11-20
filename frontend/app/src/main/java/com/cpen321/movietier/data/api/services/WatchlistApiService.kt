package com.cpen321.movietier.data.api.services

import com.cpen321.movietier.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface WatchlistApiService {

    @GET("watchlist")
    suspend fun getWatchlist(): Response<ApiResponse<List<WatchlistItem>>>

    @POST("watchlist")
    suspend fun addToWatchlist(
        @Body request: AddWatchlistRequest
    ): Response<ApiResponse<WatchlistItem>>

    @DELETE("watchlist/{movieId}")
    suspend fun removeFromWatchlist(@Path("movieId") movieId: Int): Response<ApiResponse<Unit>>

    @GET("users/{userId}/watchlist")
    suspend fun getUserWatchlist(
        @Path("userId") userId: String
    ): Response<ApiResponse<List<WatchlistItem>>>
}
