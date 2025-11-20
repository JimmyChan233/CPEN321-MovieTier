package com.cpen321.movietier.domain.usecase.auth

import android.util.Log
import com.cpen321.movietier.data.repository.AuthRepository
import com.cpen321.movietier.data.repository.Result
import javax.inject.Inject

/**
 * Use case for deleting the current user's account.
 */
class DeleteAccountUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    companion object {
        private const val TAG = "DeleteAccountUseCase"
    }

    suspend operator fun invoke(): Result<Unit> {
        return try {
            when (val result = authRepository.deleteAccount()) {
                is Result.Success -> {
                    Log.d(TAG, "Account deletion successful")
                    Result.Success(Unit)
                }
                is Result.Error -> {
                    Log.e(TAG, "Account deletion failed: ${result.message}")
                    Result.Error(
                        message = result.message ?: "Failed to delete account",
                        exception = result.exception
                    )
                }
                is Result.Loading -> {
                    @Suppress("UNCHECKED_CAST")
                    Result.Loading as Result<Unit>
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error during account deletion", e)
            Result.Error(
                message = "An unexpected error occurred",
                exception = e
            )
        }
    }
}
