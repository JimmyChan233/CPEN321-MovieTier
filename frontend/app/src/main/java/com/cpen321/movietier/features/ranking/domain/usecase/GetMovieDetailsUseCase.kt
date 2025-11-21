package com.cpen321.movietier.features.ranking.domain.usecase

import android.util.Log
import com.cpen321.movietier.shared.models.Movie
import com.cpen321.movietier.features.ranking.data.repository.MovieRepository
import com.cpen321.movietier.shared.repository.Result
import javax.inject.Inject

/**
 * Use case for fetching detailed movie information.
 *
 * Retrieves movie details including cast, ratings, and other metadata from TMDB.
 * Can be used for displaying movie details in detail sheets or screens.
 */
class GetMovieDetailsUseCase @Inject constructor(
    private val movieRepository: MovieRepository
) {
    companion object {
        private const val TAG = "GetMovieDetailsUseCase"
    }

    suspend operator fun invoke(movieId: Int): Result<Movie> {
        return try {
            val result = movieRepository.getMovieDetails(movieId)
            when (result) {
                is Result.Success -> {
                    Log.d(TAG, "Movie details retrieved for movieId=$movieId")
                    result
                }
                is Result.Error -> {
                    Log.e(TAG, "Failed to get movie details for movieId=$movieId: ${result.message}")
                    result
                }
                is Result.Loading -> result
            }
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error fetching movie details for movieId=$movieId", e)
            Result.Error(
                message = "Failed to fetch movie details",
                exception = e
            )
        }
    }
}
