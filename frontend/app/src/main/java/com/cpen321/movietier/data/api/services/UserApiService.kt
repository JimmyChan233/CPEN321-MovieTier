package com.cpen321.movietier.data.api.services

import com.cpen321.movietier.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface UserApiService {

    @GET("users/{userId}")
    suspend fun getUser(@Path("userId") userId: String): Response<ApiResponse<User>>

    @PUT("users/{userId}")
    suspend fun updateUser(
        @Path("userId") userId: String,
        @Body user: User
    ): Response<ApiResponse<User>>

    @PUT("users/profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): Response<ApiResponse<User>>

    @POST("users/fcm-token")
    suspend fun registerFcmToken(@Body body: Map<String, String>): Response<ApiResponse<Unit>>

    @GET("users/search")
    suspend fun searchUsers(@Query("query") query: String): Response<ApiResponse<List<User>>>

    @GET("users/{userId}/rankings")
    suspend fun getUserRankings(
        @Path("userId") userId: String
    ): Response<ApiResponse<List<RankedMovie>>>
}
