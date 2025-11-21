package com.cpen321.movietier.shared.models

import com.google.gson.annotations.SerializedName

data class FriendRequest(
    @SerializedName("_id")
    val id: String,
    @SerializedName("senderId")
    val senderId: String,
    @SerializedName("receiverId")
    val receiverId: String,
    @SerializedName("status")
    val status: String, // "pending", "accepted", "rejected"
    @SerializedName("createdAt")
    val createdAt: String
)

data class FriendRequestDetailed(
    @SerializedName("_id") val id: String,
    @SerializedName("sender") val sender: User?,
    @SerializedName("receiver") val receiver: User?,
    @SerializedName("receiverId") val receiverId: String?,
    @SerializedName("senderId") val senderId: String?,
    @SerializedName("status") val status: String,
    @SerializedName("createdAt") val createdAt: String
)

data class Friend(
    @SerializedName("_id")
    val id: String,
    @SerializedName("email")
    val email: String,
    @SerializedName("name")
    val name: String,
    @SerializedName("profileImageUrl")
    val profileImageUrl: String? = null
)

data class SendFriendRequestBody(
    @SerializedName("email")
    val email: String
)

data class RespondFriendRequestBody(
    @SerializedName("requestId")
    val requestId: String,
    @SerializedName("accept")
    val accept: Boolean
)
