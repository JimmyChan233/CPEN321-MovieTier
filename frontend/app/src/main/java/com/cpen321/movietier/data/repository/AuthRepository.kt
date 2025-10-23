package com.cpen321.movietier.data.repository

import com.cpen321.movietier.data.api.ApiService
import com.cpen321.movietier.data.local.TokenManager
import com.cpen321.movietier.data.model.LoginRequest
import com.cpen321.movietier.data.model.LoginResponse
import com.cpen321.movietier.data.model.UpdateProfileRequest
import com.cpen321.movietier.data.model.User
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

sealed class Result<out T> {
    data class Success<out T>(val data: T) : Result<T>()
    data class Error(val exception: Throwable, val message: String? = null) : Result<Nothing>()
    object Loading : Result<Nothing>()
}

@Singleton
class AuthRepository @Inject constructor(
    private val apiService: ApiService,
    private val tokenManager: TokenManager
) {
    val authToken: Flow<String?> = tokenManager.authToken
    val userId: Flow<String?> = tokenManager.userId
    val userEmail: Flow<String?> = tokenManager.userEmail
    val userName: Flow<String?> = tokenManager.userName
    val userProfileImageUrl: Flow<String?> = tokenManager.userProfileImageUrl

    suspend fun signIn(idToken: String): Result<LoginResponse> {
        return try {
            val response = apiService.signIn(LoginRequest(idToken))
            if (response.isSuccessful && response.body() != null) {
                val loginResponse = response.body()!!
                if (loginResponse.success && loginResponse.token != null && loginResponse.user != null) {
                    tokenManager.saveAuthToken(loginResponse.token)
                    tokenManager.saveUserInfo(
                        loginResponse.user.id,
                        loginResponse.user.email,
                        loginResponse.user.name,
                        loginResponse.user.profileImageUrl
                    )
                    Result.Success(loginResponse)
                } else {
                    Result.Error(Exception(loginResponse.message))
                }
            } else {
                // Parse error response body
                val errorBody = response.errorBody()?.string()
                val errorMessage = if (errorBody != null) {
                    try {
                        val gson = com.google.gson.Gson()
                        val errorResponse = gson.fromJson(errorBody, LoginResponse::class.java)
                        errorResponse.message
                    } catch (e: Exception) {
                        "Sign in failed"
                    }
                } else {
                    "Sign in failed"
                }
                Result.Error(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun signUp(idToken: String): Result<LoginResponse> {
        return try {
            val response = apiService.signUp(LoginRequest(idToken))
            if (response.isSuccessful && response.body() != null) {
                val loginResponse = response.body()!!
                if (loginResponse.success && loginResponse.token != null && loginResponse.user != null) {
                    tokenManager.saveAuthToken(loginResponse.token)
                    tokenManager.saveUserInfo(
                        loginResponse.user.id,
                        loginResponse.user.email,
                        loginResponse.user.name,
                        loginResponse.user.profileImageUrl
                    )
                    Result.Success(loginResponse)
                } else {
                    Result.Error(Exception(loginResponse.message))
                }
            } else {
                Result.Error(Exception("Sign up failed: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun signOut(): Result<Unit> {
        return try {
            val response = apiService.signOut()
            tokenManager.clearAll()
            if (response.isSuccessful) {
                Result.Success(Unit)
            } else {
                Result.Error(Exception("Sign out failed: ${response.message()}"))
            }
        } catch (e: Exception) {
            tokenManager.clearAll() // Clear locally even if API call fails
            Result.Success(Unit)
        }
    }

    suspend fun deleteAccount(): Result<Unit> {
        return try {
            val response = apiService.deleteAccount()
            if (response.isSuccessful) {
                // Treat any 2xx as success; backend may return 204 with no body
                tokenManager.clearAll()
                Result.Success(Unit)
            } else {
                Result.Error(Exception("Delete account failed: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    suspend fun updateProfile(name: String?, profileImageUrl: String?): Result<User> {
        return try {
            val request = UpdateProfileRequest(name = name, profileImageUrl = profileImageUrl)
            val response = apiService.updateProfile(request)
            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    val updatedUser = apiResponse.data
                    // Update local storage
                    tokenManager.saveUserInfo(
                        updatedUser.id,
                        updatedUser.email,
                        updatedUser.name,
                        updatedUser.profileImageUrl
                    )
                    Result.Success(updatedUser)
                } else {
                    Result.Error(Exception(apiResponse.message))
                }
            } else {
                val errorBody = response.errorBody()?.string()
                val errorMessage = if (errorBody != null) {
                    try {
                        val gson = com.google.gson.Gson()
                        val errorResponse = gson.fromJson(errorBody, com.cpen321.movietier.data.model.ApiResponse::class.java)
                        errorResponse.message
                    } catch (e: Exception) {
                        "Failed to update profile"
                    }
                } else {
                    "Failed to update profile"
                }
                Result.Error(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }
}
