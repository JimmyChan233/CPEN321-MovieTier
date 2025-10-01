package com.cpen321.movietier.data.model

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
    val voteAverage: Double?
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
    val posterPath: String?
)

data class CompareMoviesRequest(
    @SerializedName("movieId")
    val movieId: Int,
    @SerializedName("comparedMovieId")
    val comparedMovieId: Int,
    @SerializedName("preferredMovieId")
    val preferredMovieId: Int
)
