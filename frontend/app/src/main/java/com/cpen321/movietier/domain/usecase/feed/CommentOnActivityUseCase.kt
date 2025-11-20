package com.cpen321.movietier.domain.usecase.feed

import android.util.Log
import com.cpen321.movietier.data.repository.FeedRepository
import com.cpen321.movietier.data.repository.Result
import javax.inject.Inject

/**
 * Use case for adding a comment to a feed activity.
 *
 * Validates comment content and delegates to the repository.
 */
class CommentOnActivityUseCase @Inject constructor(
    private val feedRepository: FeedRepository
) {
    companion object {
        private const val TAG = "CommentOnActivityUseCase"
        private const val MIN_COMMENT_LENGTH = 1
        private const val MAX_COMMENT_LENGTH = 500
    }

    suspend operator fun invoke(
        activityId: String,
        commentText: String
    ): Result<Unit> {
        return try {
            // Validate inputs
            if (activityId.isBlank()) {
                return Result.Error(
                    message = "Activity ID cannot be empty",
                    exception = IllegalArgumentException("Invalid activity ID")
                )
            }

            if (commentText.isBlank() || commentText.length < MIN_COMMENT_LENGTH) {
                return Result.Error(
                    message = "Comment cannot be empty",
                    exception = IllegalArgumentException("Invalid comment")
                )
            }

            if (commentText.length > MAX_COMMENT_LENGTH) {
                return Result.Error(
                    message = "Comment exceeds maximum length ($MAX_COMMENT_LENGTH characters)",
                    exception = IllegalArgumentException("Comment too long")
                )
            }

            val result = feedRepository.addComment(activityId, commentText)
            when (result) {
                is Result.Success -> {
                    Log.d(TAG, "Comment added to activity $activityId")
                    Result.Success(Unit)
                }
                is Result.Error -> {
                    Log.e(TAG, "Failed to add comment: ${result.message}")
                    result
                }
                is Result.Loading -> result
            }
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error adding comment", e)
            Result.Error(
                message = "Failed to add comment",
                exception = e
            )
        }
    }
}
