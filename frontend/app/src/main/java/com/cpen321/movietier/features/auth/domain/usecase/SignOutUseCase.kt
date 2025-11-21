package com.cpen321.movietier.features.auth.domain.usecase

import android.util.Log
import com.cpen321.movietier.features.auth.data.repository.AuthRepository
import com.cpen321.movietier.data.repository.Result
import javax.inject.Inject

/**
 * Use case for signing out the current user.
 */
class SignOutUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    companion object {
        private const val TAG = "SignOutUseCase"
    }

    suspend operator fun invoke(): Result<Unit> {
        return try {
            when (val result = authRepository.signOut()) {
                is Result.Success -> {
                    Log.d(TAG, "Sign-out successful")
                    Result.Success(Unit)
                }
                is Result.Error -> {
                    Log.e(TAG, "Sign-out failed: ${result.message}")
                    Result.Error(
                        message = result.message ?: "Sign-out failed",
                        exception = result.exception
                    )
                }
                is Result.Loading -> {
                    @Suppress("UNCHECKED_CAST")
                    Result.Loading as Result<Unit>
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error during sign-out", e)
            Result.Error(
                message = "An unexpected error occurred",
                exception = e
            )
        }
    }
}
