package com.cpen321.movietier.shared.models

import com.google.gson.annotations.SerializedName

data class Movie(
    @SerializedName("id")
    val id: Int,
    @SerializedName("title")
    val title: String,
    @SerializedName("overview")
    val overview: String?,
    @SerializedName("posterPath")
    val posterPath: String?,
    @SerializedName("releaseDate")
    val releaseDate: String?,
    @SerializedName("voteAverage")
    val voteAverage: Double?,
    @SerializedName("cast")
    val cast: List<String>? = null
)

data class RankedMovie(
    @SerializedName("_id")
    val id: String,
    @SerializedName("userId")
    val userId: String,
    @SerializedName("movie")
    val movie: Movie,
    @SerializedName("rank")
    val rank: Int,
    @SerializedName("createdAt")
    val createdAt: String
)

data class AddMovieRequest(
    @SerializedName("movieId")
    val movieId: Int,
    @SerializedName("title")
    val title: String,
    @SerializedName("posterPath")
    val posterPath: String?,
    @SerializedName("overview")
    val overview: String? = null
)

data class CompareMoviesRequest(
    @SerializedName("movieId")
    val movieId: Int,
    @SerializedName("comparedMovieId")
    val comparedMovieId: Int,
    @SerializedName("preferredMovieId")
    val preferredMovieId: Int
)

data class AddMovieResponse(
    @SerializedName("success")
    val success: Boolean,
    @SerializedName("status")
    val status: String?, // "added" or "compare"
    @SerializedName("message")
    val message: String?,
    @SerializedName("data")
    val data: CompareData?
)

data class CompareWithResponse(
    @SerializedName("movieId")
    val movieId: Int,
    @SerializedName("title")
    val title: String,
    @SerializedName("posterPath")
    val posterPath: String?
)

data class CompareData(
    @SerializedName("compareWith")
    val compareWith: CompareWithResponse?
)

data class MovieVideo(
    @SerializedName("key")
    val key: String,
    @SerializedName("name")
    val name: String,
    @SerializedName("type")
    val type: String,
    @SerializedName("site")
    val site: String
)
