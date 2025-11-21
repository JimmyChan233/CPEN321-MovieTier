package com.cpen321.movietier.features.friends.domain.usecase

import android.util.Log
import com.cpen321.movietier.features.friends.data.repository.FriendRepository
import com.cpen321.movietier.shared.repository.Result
import javax.inject.Inject

/**
 * Use case for sending a friend request to another user.
 *
 * Validates recipient ID and delegates to the repository to send the request.
 */
class SendFriendRequestUseCase @Inject constructor(
    private val friendRepository: FriendRepository
) {
    companion object {
        private const val TAG = "SendFriendRequestUseCase"
    }

    suspend operator fun invoke(recipientId: String): Result<Unit> {
        return try {
            // Validate recipient ID
            if (recipientId.isBlank()) {
                return Result.Error(
                    message = "Recipient ID cannot be empty",
                    exception = IllegalArgumentException("Invalid recipient ID")
                )
            }

            val result = friendRepository.sendFriendRequest(recipientId)
            when (result) {
                is Result.Success -> {
                    Log.d(TAG, "Friend request sent to $recipientId")
                    Result.Success(Unit)
                }
                is Result.Error -> {
                    Log.e(TAG, "Failed to send friend request to $recipientId: ${result.message}")
                    result
                }
                is Result.Loading -> result
            }
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error sending friend request", e)
            Result.Error(
                message = "Failed to send friend request",
                exception = e
            )
        }
    }
}
