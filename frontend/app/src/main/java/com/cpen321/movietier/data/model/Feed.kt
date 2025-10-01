package com.cpen321.movietier.data.model

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
    @SerializedName("createdAt")
    val createdAt: String
)
