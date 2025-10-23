package com.cpen321.movietier.data.model

import com.google.gson.annotations.SerializedName

data class User(
    @SerializedName("_id")
    val id: String,
    @SerializedName("email")
    val email: String,
    @SerializedName("name")
    val name: String,
    @SerializedName("profileImageUrl")
    val profileImageUrl: String? = null,
    @SerializedName("createdAt")
    val createdAt: String? = null
)

data class LoginRequest(
    @SerializedName("idToken")
    val idToken: String
)

data class LoginResponse(
    @SerializedName("success")
    val success: Boolean,
    @SerializedName("message")
    val message: String,
    @SerializedName("user")
    val user: User?,
    @SerializedName("token")
    val token: String?
)

data class ApiResponse<T>(
    @SerializedName("success")
    val success: Boolean,
    @SerializedName("message")
    val message: String,
    @SerializedName("data")
    val data: T?
)

data class UpdateProfileRequest(
    @SerializedName("name")
    val name: String? = null,
    @SerializedName("profileImageUrl")
    val profileImageUrl: String? = null
)
