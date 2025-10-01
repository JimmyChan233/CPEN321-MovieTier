package com.cpen321.movietier.data.api

import com.cpen321.movietier.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // Authentication
    @POST("auth/signin")
    suspend fun signIn(@Body request: LoginRequest): Response<LoginResponse>

    @POST("auth/signup")
    suspend fun signUp(@Body request: LoginRequest): Response<LoginResponse>

    @POST("auth/signout")
    suspend fun signOut(): Response<ApiResponse<Unit>>

    @DELETE("auth/account")
    suspend fun deleteAccount(): Response<ApiResponse<Unit>>

    // User
    @GET("users/{userId}")
    suspend fun getUser(@Path("userId") userId: String): Response<ApiResponse<User>>

    @PUT("users/{userId}")
    suspend fun updateUser(
        @Path("userId") userId: String,
        @Body user: User
    ): Response<ApiResponse<User>>

    // Friends
    @GET("friends")
    suspend fun getFriends(): Response<ApiResponse<List<Friend>>>

    @GET("friends/requests")
    suspend fun getFriendRequests(): Response<ApiResponse<List<FriendRequest>>>

    @POST("friends/request")
    suspend fun sendFriendRequest(@Body request: SendFriendRequestBody): Response<ApiResponse<FriendRequest>>

    @POST("friends/respond")
    suspend fun respondToFriendRequest(@Body request: RespondFriendRequestBody): Response<ApiResponse<Unit>>

    @DELETE("friends/{friendId}")
    suspend fun removeFriend(@Path("friendId") friendId: String): Response<ApiResponse<Unit>>

    // Movies
    @GET("movies/search")
    suspend fun searchMovies(@Query("query") query: String): Response<ApiResponse<List<Movie>>>

    @GET("movies/ranked")
    suspend fun getRankedMovies(): Response<ApiResponse<List<RankedMovie>>>

    @POST("movies/rank")
    suspend fun addMovie(@Body request: AddMovieRequest): Response<ApiResponse<RankedMovie>>

    @POST("movies/compare")
    suspend fun compareMovies(@Body request: CompareMoviesRequest): Response<ApiResponse<Unit>>

    // Feed
    @GET("feed")
    suspend fun getFeed(): Response<ApiResponse<List<FeedActivity>>>

    // Recommendations
    @GET("recommendations")
    suspend fun getRecommendations(): Response<ApiResponse<List<Movie>>>
}
