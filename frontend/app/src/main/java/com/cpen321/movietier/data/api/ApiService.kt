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

    @PUT("users/profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): Response<ApiResponse<User>>

    @GET("users/search")
    suspend fun searchUsers(@Query("query") query: String): Response<ApiResponse<List<User>>>

    // Friends
    @GET("friends")
    suspend fun getFriends(): Response<ApiResponse<List<Friend>>>

    @GET("friends/requests")
    suspend fun getFriendRequests(): Response<ApiResponse<List<FriendRequest>>>

    @GET("friends/requests/detailed")
    suspend fun getFriendRequestsDetailed(): Response<ApiResponse<List<FriendRequestDetailed>>>

    @GET("friends/requests/outgoing")
    suspend fun getOutgoingFriendRequests(): Response<ApiResponse<List<FriendRequest>>>

    @GET("friends/requests/outgoing/detailed")
    suspend fun getOutgoingFriendRequestsDetailed(): Response<ApiResponse<List<FriendRequestDetailed>>>

    @POST("friends/request")
    suspend fun sendFriendRequest(@Body request: SendFriendRequestBody): Response<ApiResponse<FriendRequest>>

    @POST("friends/respond")
    suspend fun respondToFriendRequest(@Body request: RespondFriendRequestBody): Response<ApiResponse<Unit>>

    @DELETE("friends/{friendId}")
    suspend fun removeFriend(@Path("friendId") friendId: String): Response<ApiResponse<Unit>>

    @DELETE("friends/requests/{requestId}")
    suspend fun cancelFriendRequest(@Path("requestId") requestId: String): Response<ApiResponse<Unit>>

    // Movies
    @GET("movies/search")
    suspend fun searchMovies(
        @Query("query") query: String,
        @Query("includeCast") includeCast: Boolean = true
    ): Response<ApiResponse<List<Movie>>>

    @GET("movies/ranked")
    suspend fun getRankedMovies(): Response<ApiResponse<List<RankedMovie>>>

//    @POST("movies/rank")
//    suspend fun addMovie(@Body request: AddMovieRequest): Response<ApiResponse<RankedMovie>>

//    @POST("movies/compare")
//    suspend fun compareMovies(@Body request: CompareMoviesRequest): Response<ApiResponse<Unit>>

    @POST("movies/add")
    suspend fun addMovie(
        @Body body: AddMovieRequest
    ): Response<AddMovieResponse>

    @POST("movies/compare")
    suspend fun compareMovies(
        @Body body: CompareMoviesRequest
    ): Response<AddMovieResponse>

    @DELETE("movies/ranked/{id}")
    suspend fun deleteRankedMovie(
        @Path("id") id: String
    ): Response<ApiResponse<Unit>>

    @POST("movies/rerank/start")
    suspend fun startRerank(
        @Body body: Map<String, String> // { rankedId }
    ): Response<AddMovieResponse>

    @GET("movies/{movieId}/providers")
    suspend fun getMovieProviders(
        @Path("movieId") movieId: Int,
        @Query("country") country: String = "US"
    ): Response<ApiResponse<WatchProviders>>

    @GET("movies/{movieId}/details")
    suspend fun getMovieDetails(
        @Path("movieId") movieId: Int
    ): Response<ApiResponse<Movie>>

    // Feed
    @GET("feed")
    suspend fun getFeed(): Response<ApiResponse<List<FeedActivity>>>

    @GET("feed/stream")
    suspend fun connectFeedStream(): Response<Unit>

    // Watchlist
    @GET("watchlist")
    suspend fun getWatchlist(): Response<ApiResponse<List<WatchlistItem>>>

    @POST("watchlist")
    suspend fun addToWatchlist(@Body request: AddWatchlistRequest): Response<ApiResponse<WatchlistItem>>

    @DELETE("watchlist/{movieId}")
    suspend fun removeFromWatchlist(@Path("movieId") movieId: Int): Response<ApiResponse<Unit>>

    @GET("users/{userId}/watchlist")
    suspend fun getUserWatchlist(@Path("userId") userId: String): Response<ApiResponse<List<WatchlistItem>>>

    // Recommendations
    @GET("recommendations")
    suspend fun getRecommendations(): Response<ApiResponse<List<Movie>>>

}
