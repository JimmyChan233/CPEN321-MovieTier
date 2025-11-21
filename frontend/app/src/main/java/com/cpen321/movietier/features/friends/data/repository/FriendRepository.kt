package com.cpen321.movietier.features.friends.data.repository

import com.cpen321.movietier.core.network.ApiService
import com.cpen321.movietier.shared.models.*
import com.cpen321.movietier.shared.repository.Result
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FriendRepository @Inject constructor(
    private val apiService: ApiService
) {
    suspend fun getFriends(): Result<List<Friend>> {
        return try {
            val response = apiService.getFriends()
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()!!.data ?: emptyList())
            } else {
                Result.Error(Exception("Failed to get friends: ${response.message()}"))
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun getFriendRequests(): Result<List<FriendRequest>> {
        return try {
            val response = apiService.getFriendRequests()
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()!!.data ?: emptyList())
            } else {
                Result.Error(Exception("Failed to get friend requests: ${response.message()}"))
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun searchUsers(query: String): Result<List<User>> {
        return try {
            val response = apiService.searchUsers(query)
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()!!.data ?: emptyList())
            } else {
                Result.Error(Exception("Failed to search users: ${response.message()}"))
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun sendFriendRequest(email: String): Result<FriendRequest> {
        return try {
            val response = apiService.sendFriendRequest(SendFriendRequestBody(email))
            if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
                Result.Success(response.body()!!.data!!)
            } else {
                Result.Error(Exception(response.body()?.message ?: "Failed to send friend request"))
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun respondToFriendRequest(requestId: String, accept: Boolean): Result<Unit> {
        return try {
            val response = apiService.respondToFriendRequest(RespondFriendRequestBody(requestId, accept))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(Unit)
            } else {
                Result.Error(Exception("Failed to respond to friend request: ${response.message()}"))
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun removeFriend(friendId: String): Result<Unit> {
        return try {
            val response = apiService.removeFriend(friendId)
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(Unit)
            } else {
                Result.Error(Exception("Failed to remove friend: ${response.message()}"))
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun getUser(userId: String): Result<User> {
        return try {
            val response = apiService.getUser(userId)
            if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
                Result.Success(response.body()!!.data!!)
            } else {
                Result.Error(Exception("Failed to get user: ${response.message()}"))
            }
        } catch (e: IOException) {
            Result.Error(e, e.message)
        }
    }

    suspend fun getFriendRequestsDetailed(): Result<List<FriendRequestDetailed>> {
        return try {
            val response = apiService.getFriendRequestsDetailed()
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()!!.data ?: emptyList())
            } else {
                Result.Error(Exception("Failed to get detailed friend requests: ${response.message()}"))
            }
        } catch (e: IOException) {
            Result.Error(e, e.message)
        }
    }

    suspend fun getOutgoingFriendRequestsDetailed(): Result<List<FriendRequestDetailed>> {
        return try {
            val response = apiService.getOutgoingFriendRequestsDetailed()
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()!!.data ?: emptyList())
            } else {
                Result.Error(Exception("Failed to get outgoing detailed requests: ${response.message()}"))
            }
        } catch (e: IOException) {
            Result.Error(e, e.message)
        }
    }

    suspend fun cancelFriendRequest(requestId: String): Result<Unit> {
        return try {
            val response = apiService.cancelFriendRequest(requestId)
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(Unit)
            } else {
                Result.Error(Exception(response.body()?.message ?: "Failed to cancel request"))
            }
        } catch (e: IOException) {
            Result.Error(e, e.message)
        }
    }
}
