package com.cpen321.movietier.shared.models

import com.google.gson.annotations.SerializedName

data class FeedActivity(
    @SerializedName("_id")
    val id: String,
    @SerializedName("userId")
    val userId: String,
    @SerializedName("userName")
    val userName: String,
    @SerializedName("userProfileImage")
    val userProfileImage: String?,
    @SerializedName("activityType")
    val activityType: String, // "ranked_movie"
    @SerializedName("movie")
    val movie: Movie,
    @SerializedName("rank")
    val rank: Int?,
    @SerializedName("likeCount")
    val likeCount: Int = 0,
    @SerializedName("commentCount")
    val commentCount: Int = 0,
    @SerializedName("isLikedByUser")
    val isLikedByUser: Boolean = false,
    @SerializedName("createdAt")
    val createdAt: String
)

data class FeedComment(
    @SerializedName("_id")
    val id: String,
    @SerializedName("userId")
    val userId: String,
    @SerializedName("userName")
    val userName: String,
    @SerializedName("userProfileImage")
    val userProfileImage: String?,
    @SerializedName("text")
    val text: String,
    @SerializedName("createdAt")
    val createdAt: String
)
