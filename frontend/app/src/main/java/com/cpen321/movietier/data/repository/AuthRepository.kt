package com.cpen321.movietier.data.repository

import com.cpen321.movietier.data.api.ApiService
import com.cpen321.movietier.data.local.TokenManager
import com.cpen321.movietier.data.model.LoginRequest
import com.cpen321.movietier.data.model.LoginResponse
import com.cpen321.movietier.data.model.UpdateProfileRequest
import com.cpen321.movietier.data.model.User
import java.io.IOException
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
            handleSignInResponse(response)
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    private suspend fun handleSignInResponse(response: retrofit2.Response<LoginResponse>): Result<LoginResponse> {
        if (!response.isSuccessful || response.body() == null) {
            val errorMessage = parseErrorMessage(response.errorBody()?.string())
            return Result.Error(Exception(errorMessage))
        }

        val loginResponse = response.body()!!
        if (!loginResponse.success || loginResponse.token == null || loginResponse.user == null) {
            return Result.Error(Exception(loginResponse.message))
        }

        saveUserSession(loginResponse)
        return Result.Success(loginResponse)
    }

    private fun parseErrorMessage(errorBody: String?): String {
        if (errorBody == null) return "Sign in failed"

        return try {
            val gson = com.google.gson.Gson()
            val errorResponse = gson.fromJson(errorBody, LoginResponse::class.java)
            errorResponse.message
        } catch (e: IOException) {
            "Sign in failed"
        }
    }

    private suspend fun saveUserSession(loginResponse: LoginResponse) {
        tokenManager.saveAuthToken(loginResponse.token!!)
        tokenManager.saveUserInfo(
            loginResponse.user!!.id,
            loginResponse.user.email,
            loginResponse.user.name,
            loginResponse.user.profileImageUrl
        )
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
        } catch (e: IOException) {
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
        } catch (e: IOException) {
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

    suspend fun updateProfile(name: String?): Result<User> {
        return try {
            val request = UpdateProfileRequest(name = name, profilePicture = null)
            val response = apiService.updateProfile(request)
            handleUpdateProfileResponse(response)
        } catch (e: Exception) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    private suspend fun handleUpdateProfileResponse(response: retrofit2.Response<com.cpen321.movietier.data.model.ApiResponse<User>>): Result<User> {
        if (!response.isSuccessful || response.body() == null) {
            val errorMessage = parseUpdateProfileError(response.errorBody()?.string())
            return Result.Error(Exception(errorMessage))
        }

        val apiResponse = response.body()!!
        if (!apiResponse.success || apiResponse.data == null) {
            return Result.Error(Exception(apiResponse.message))
        }

        val updatedUser = apiResponse.data
        tokenManager.saveUserInfo(
            updatedUser.id,
            updatedUser.email,
            updatedUser.name,
            updatedUser.profileImageUrl
        )
        return Result.Success(updatedUser)
    }

    private fun parseUpdateProfileError(errorBody: String?): String {
        if (errorBody == null) return "Failed to update profile"

        return try {
            val gson = com.google.gson.Gson()
            val errorResponse = gson.fromJson(errorBody, com.cpen321.movietier.data.model.ApiResponse::class.java)
            errorResponse.message
        } catch (e: IOException) {
            "Failed to update profile"
        }
    }
}
