package com.cpen321.movietier.data.api.services

import com.cpen321.movietier.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface MoviesApiService {

    @GET("movies/search")
    suspend fun searchMovies(
        @Query("query") query: String,
        @Query("includeCast") includeCast: Boolean = true
    ): Response<ApiResponse<List<Movie>>>

    @GET("movies/ranked")
    suspend fun getRankedMovies(): Response<ApiResponse<List<RankedMovie>>>

    @POST("movies/add")
    suspend fun addMovie(@Body body: AddMovieRequest): Response<AddMovieResponse>

    @POST("movies/compare")
    suspend fun compareMovies(@Body body: CompareMoviesRequest): Response<AddMovieResponse>

    @DELETE("movies/ranked/{id}")
    suspend fun deleteRankedMovie(@Path("id") id: String): Response<ApiResponse<Unit>>

    @POST("movies/rerank/start")
    suspend fun startRerank(
        @Body body: Map<String, String>
    ): Response<AddMovieResponse>

    @GET("movies/{movieId}/providers")
    suspend fun getMovieProviders(
        @Path("movieId") movieId: Int,
        @Query("country") country: String = "US"
    ): Response<ApiResponse<WatchProviders>>

    @GET("movies/{movieId}/details")
    suspend fun getMovieDetails(@Path("movieId") movieId: Int): Response<ApiResponse<Movie>>

    @GET("movies/quotes")
    suspend fun getQuote(
        @Query("title") title: String,
        @Query("year") year: String? = null
    ): Response<ApiResponse<String>>

    @GET("movies/{movieId}/videos")
    suspend fun getMovieVideos(
        @Path("movieId") movieId: Int
    ): Response<ApiResponse<MovieVideo?>>
}
