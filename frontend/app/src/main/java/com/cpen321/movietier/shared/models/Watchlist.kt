package com.cpen321.movietier.shared.models

import com.google.gson.annotations.SerializedName

data class WatchlistItem(
    @SerializedName("_id") val id: String,
    @SerializedName("userId") val userId: String,
    @SerializedName("movieId") val movieId: Int,
    @SerializedName("title") val title: String,
    @SerializedName("posterPath") val posterPath: String?,
    @SerializedName("overview") val overview: String?,
    @SerializedName("createdAt") val createdAt: String
)

data class AddWatchlistRequest(
    @SerializedName("movieId") val movieId: Int,
    @SerializedName("title") val title: String,
    @SerializedName("posterPath") val posterPath: String?,
    @SerializedName("overview") val overview: String?
)

