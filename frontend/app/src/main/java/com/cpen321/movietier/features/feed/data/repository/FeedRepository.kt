package com.cpen321.movietier.features.feed.data.repository

import com.cpen321.movietier.core.network.ApiService
import com.cpen321.movietier.shared.models.FeedActivity
import com.cpen321.movietier.shared.models.FeedComment
import com.cpen321.movietier.shared.repository.Result
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FeedRepository @Inject constructor(
    private val apiService: ApiService
) {
    suspend fun getFeed(): Result<List<FeedActivity>> {
        return try {
            val response = apiService.getFeed()
            val body = response.body()
            if (response.isSuccessful && body?.success == true) {
                Result.Success(body.data ?: emptyList())
            } else {
                val message = body?.message ?: response.message()
                Result.Error(Exception("Failed to get feed: $message"), message)
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun getMyFeed(): Result<List<FeedActivity>> {
        return try {
            val response = apiService.getMyFeed()
            val body = response.body()
            if (response.isSuccessful && body?.success == true) {
                Result.Success(body.data ?: emptyList())
            } else {
                val message = body?.message ?: response.message()
                Result.Error(Exception("Failed to get my feed: $message"), message)
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun likeActivity(activityId: String): Result<Unit> {
        return try {
            val response = apiService.likeActivity(activityId)
            val body = response.body()
            if (response.isSuccessful && body?.success == true) {
                Result.Success(Unit)
            } else {
                val message = body?.message ?: response.message()
                Result.Error(Exception("Failed to like activity: $message"), message)
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun unlikeActivity(activityId: String): Result<Unit> {
        return try {
            val response = apiService.unlikeActivity(activityId)
            val body = response.body()
            if (response.isSuccessful && body?.success == true) {
                Result.Success(Unit)
            } else {
                val message = body?.message ?: response.message()
                Result.Error(Exception("Failed to unlike activity: $message"), message)
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun getComments(activityId: String): Result<List<FeedComment>> {
        return try {
            val response = apiService.getComments(activityId)
            val body = response.body()
            if (response.isSuccessful && body?.success == true) {
                Result.Success(body.data ?: emptyList())
            } else {
                val message = body?.message ?: response.message()
                Result.Error(Exception("Failed to get comments: $message"), message)
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun addComment(activityId: String, text: String): Result<FeedComment> {
        return try {
            val response = apiService.addComment(activityId, mapOf("text" to text))
            val body = response.body()
            if (response.isSuccessful && body?.success == true && body.data != null) {
                Result.Success(body.data)
            } else {
                val message = body?.message ?: response.message()
                Result.Error(Exception("Failed to add comment: $message"), message)
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun deleteComment(activityId: String, commentId: String): Result<Unit> {
        return try {
            val response = apiService.deleteComment(activityId, commentId)
            val body = response.body()
            if (response.isSuccessful && body?.success == true) {
                Result.Success(Unit)
            } else {
                val message = body?.message ?: response.message()
                Result.Error(Exception("Failed to delete comment: $message"), message)
            }
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }
}
