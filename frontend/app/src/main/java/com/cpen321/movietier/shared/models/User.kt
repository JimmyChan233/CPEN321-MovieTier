package com.cpen321.movietier.shared.models

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
    @SerializedName("profilePicture")
    val profilePicture: String? = null
)

data class MediaUploadData(
    @SerializedName("url")
    val url: String,
    @SerializedName("filename")
    val filename: String?,
    @SerializedName("size")
    val size: Int?,
    @SerializedName("mimetype")
    val mimetype: String?
)

data class MediaUploadResponse(
    @SerializedName("success")
    val success: Boolean,
    @SerializedName("message")
    val message: String? = null,
    @SerializedName("data")
    val data: MediaUploadData?
)
