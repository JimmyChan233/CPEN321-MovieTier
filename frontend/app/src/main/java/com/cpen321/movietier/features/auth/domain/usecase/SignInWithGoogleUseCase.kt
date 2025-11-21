package com.cpen321.movietier.features.auth.domain.usecase

import android.util.Log
import com.cpen321.movietier.shared.models.User
import com.cpen321.movietier.features.auth.data.repository.AuthRepository
import com.cpen321.movietier.shared.repository.Result
import javax.inject.Inject

/**
 * Use case for Google sign-in with fallback to sign-up.
 *
 * Handles the following flow:
 * 1. Attempt sign-in with the provided ID token
 * 2. If sign-in fails with "user not found", attempt sign-up
 * 3. Return the result of either operation
 */
class SignInWithGoogleUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    companion object {
        private const val TAG = "SignInWithGoogleUseCase"
    }

    private val userNotFoundKeywords = listOf("not found", "User not found")

    suspend operator fun invoke(idToken: String): Result<AuthResponse> {
        return try {
            // Attempt sign-in first
            when (val signInResult = authRepository.signIn(idToken)) {
                is Result.Success -> {
                    Log.d(TAG, "Sign-in successful")
                    val user = signInResult.data.user
                    if (user != null) {
                        Result.Success(
                            AuthResponse(
                                user = user,
                                isNewUser = false
                            )
                        )
                    } else {
                        Result.Error(
                            message = "User data is null after sign-in",
                            exception = Exception("Null user from repository")
                        )
                    }
                }
                is Result.Error -> {
                    val errorMessage = signInResult.message ?: signInResult.exception.message ?: ""

                    // Check if error is "user not found"
                    if (isUserNotFoundError(errorMessage)) {
                        Log.d(TAG, "User not found during sign-in, attempting sign-up")
                        attemptSignUp(idToken)
                    } else {
                        Log.e(TAG, "Sign-in failed: $errorMessage")
                        Result.Error(
                            message = errorMessage.ifEmpty { "Sign-in failed" },
                            exception = signInResult.exception
                        )
                    }
                }
                is Result.Loading -> {
                    @Suppress("UNCHECKED_CAST")
                    Result.Loading as Result<AuthResponse>
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error during sign-in", e)
            Result.Error(
                message = "An unexpected error occurred",
                exception = e
            )
        }
    }

    private suspend fun attemptSignUp(idToken: String): Result<AuthResponse> {
        return try {
            when (val signUpResult = authRepository.signUp(idToken)) {
                is Result.Success -> {
                    Log.d(TAG, "Sign-up successful")
                    val user = signUpResult.data.user
                    if (user != null) {
                        Result.Success(
                            AuthResponse(
                                user = user,
                                isNewUser = true
                            )
                        )
                    } else {
                        Result.Error(
                            message = "User data is null after sign-up",
                            exception = Exception("Null user from repository")
                        )
                    }
                }
                is Result.Error -> {
                    Log.e(TAG, "Sign-up failed: ${signUpResult.message}")
                    Result.Error(
                        message = signUpResult.message ?: "Sign-up failed",
                        exception = signUpResult.exception
                    )
                }
                is Result.Loading -> {
                    @Suppress("UNCHECKED_CAST")
                    Result.Loading as Result<AuthResponse>
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error during sign-up", e)
            Result.Error(
                message = "An unexpected error occurred",
                exception = e
            )
        }
    }

    private fun isUserNotFoundError(errorMessage: String): Boolean {
        return userNotFoundKeywords.any {
            errorMessage.contains(it, ignoreCase = true)
        }
    }
}

/**
 * Response from sign-in/sign-up operation
 */
data class AuthResponse(
    val user: User,
    val isNewUser: Boolean
)
