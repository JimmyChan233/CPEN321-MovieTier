package com.cpen321.movietier.data.api.services

import com.cpen321.movietier.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface FriendsApiService {

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
}
