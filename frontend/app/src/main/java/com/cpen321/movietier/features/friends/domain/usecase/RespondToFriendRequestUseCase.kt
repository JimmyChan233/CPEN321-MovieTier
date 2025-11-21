package com.cpen321.movietier.features.friends.domain.usecase

import android.util.Log
import com.cpen321.movietier.features.friends.data.repository.FriendRepository
import com.cpen321.movietier.shared.repository.Result
import javax.inject.Inject

/**
 * Use case for accepting or rejecting a friend request.
 *
 * Handles the business logic for friend request responses.
 * @param accept true to accept the request, false to reject
 */
class RespondToFriendRequestUseCase @Inject constructor(
    private val friendRepository: FriendRepository
) {
    companion object {
        private const val TAG = "RespondToFriendRequestUseCase"
    }

    suspend operator fun invoke(
        requestId: String,
        accept: Boolean
    ): Result<Unit> {
        return try {
            // Validate request ID
            if (requestId.isBlank()) {
                return Result.Error(
                    message = "Request ID cannot be empty",
                    exception = IllegalArgumentException("Invalid request ID")
                )
            }

            val action = if (accept) "accepting" else "rejecting"
            Log.d(TAG, "$action friend request $requestId")

            val result = friendRepository.respondToFriendRequest(requestId, accept)
            when (result) {
                is Result.Success -> {
                    val verb = if (accept) "accepted" else "rejected"
                    Log.d(TAG, "Friend request $verb: $requestId")
                    Result.Success(Unit)
                }
                is Result.Error -> {
                    Log.e(TAG, "Failed to respond to friend request: ${result.message}")
                    result
                }
                is Result.Loading -> result
            }
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error responding to friend request", e)
            Result.Error(
                message = "Failed to respond to friend request",
                exception = e
            )
        }
    }
}
