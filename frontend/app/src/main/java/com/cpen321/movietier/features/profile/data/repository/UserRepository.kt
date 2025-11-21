package com.cpen321.movietier.features.profile.data.repository

import com.cpen321.movietier.core.network.ApiService
import com.cpen321.movietier.core.datastore.TokenManager
import com.cpen321.movietier.shared.models.UpdateProfileRequest
import com.cpen321.movietier.shared.models.User
import com.cpen321.movietier.shared.models.ApiResponse
import com.cpen321.movietier.shared.repository.Result
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserRepository @Inject constructor(
    private val apiService: ApiService,
    private val tokenManager: TokenManager
) {

    suspend fun updateProfile(name: String?): Result<User> {
        return try {
            val request = UpdateProfileRequest(name = name, profilePicture = null)
            val response = apiService.updateProfile(request)
            handleUpdateProfileResponse(response)
        } catch (e: IOException) {
            Result.Error(e, "Network error: ${e.message}")
        }
    }

    private suspend fun handleUpdateProfileResponse(
        response: retrofit2.Response<ApiResponse<User>>
    ): Result<User> {
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
            val errorResponse =
                gson.fromJson(errorBody, ApiResponse::class.java)
            errorResponse.message
        } catch (e: IOException) {
            "Failed to update profile"
        }
    }
}
