package com.cpen321.movietier.data.api.services

import com.cpen321.movietier.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface FeedApiService {

    @GET("feed")
    suspend fun getFeed(): Response<ApiResponse<List<FeedActivity>>>

    @GET("feed/me")
    suspend fun getMyFeed(): Response<ApiResponse<List<FeedActivity>>>

    @GET("feed/stream")
    suspend fun connectFeedStream(): Response<Unit>

    @POST("feed/{activityId}/like")
    suspend fun likeActivity(@Path("activityId") activityId: String): Response<ApiResponse<Unit>>

    @DELETE("feed/{activityId}/like")
    suspend fun unlikeActivity(@Path("activityId") activityId: String): Response<ApiResponse<Unit>>

    @GET("feed/{activityId}/comments")
    suspend fun getComments(@Path("activityId") activityId: String): Response<ApiResponse<List<FeedComment>>>

    @POST("feed/{activityId}/comments")
    suspend fun addComment(
        @Path("activityId") activityId: String,
        @Body body: Map<String, String>
    ): Response<ApiResponse<FeedComment>>

    @DELETE("feed/{activityId}/comments/{commentId}")
    suspend fun deleteComment(
        @Path("activityId") activityId: String,
        @Path("commentId") commentId: String
    ): Response<ApiResponse<Unit>>
}
