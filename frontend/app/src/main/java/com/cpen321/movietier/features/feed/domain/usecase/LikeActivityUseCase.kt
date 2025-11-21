package com.cpen321.movietier.features.feed.domain.usecase

import android.util.Log
import com.cpen321.movietier.features.feed.data.repository.FeedRepository
import com.cpen321.movietier.data.repository.Result
import javax.inject.Inject

/**
 * Use case for liking or unliking a feed activity.
 *
 * Handles the business logic for toggling likes on feed activities.
 * @param activityId The ID of the activity to like/unlike
 * @param like true to like, false to unlike
 */
class LikeActivityUseCase @Inject constructor(
    private val feedRepository: FeedRepository
) {
    companion object {
        private const val TAG = "LikeActivityUseCase"
    }

    suspend operator fun invoke(
        activityId: String,
        like: Boolean
    ): Result<Unit> {
        return try {
            // Validate activity ID
            if (activityId.isBlank()) {
                return Result.Error(
                    message = "Activity ID cannot be empty",
                    exception = IllegalArgumentException("Invalid activity ID")
                )
            }

            val result = if (like) {
                Log.d(TAG, "Liking activity $activityId")
                feedRepository.likeActivity(activityId)
            } else {
                Log.d(TAG, "Unliking activity $activityId")
                feedRepository.unlikeActivity(activityId)
            }

            when (result) {
                is Result.Success -> {
                    val action = if (like) "liked" else "unliked"
                    Log.d(TAG, "Activity $action: $activityId")
                    Result.Success(Unit)
                }
                is Result.Error -> {
                    Log.e(TAG, "Failed to like/unlike activity: ${result.message}")
                    result
                }
                is Result.Loading -> result
            }
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error liking activity", e)
            Result.Error(
                message = "Failed to like activity",
                exception = e
            )
        }
    }
}
