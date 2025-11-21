package com.cpen321.movietier.features.ranking.domain.usecase

import com.cpen321.movietier.shared.models.RankedMovie
import com.cpen321.movietier.features.ranking.data.repository.MovieRepository
import com.cpen321.movietier.data.repository.Result
import javax.inject.Inject

/**
 * Use case for loading user's ranked movies
 * Encapsulates business logic for retrieving and organizing rankings
 */
class GetRankedMoviesUseCase @Inject constructor(
    private val movieRepository: MovieRepository
) {
    suspend operator fun invoke(): Result<List<RankedMovie>> {
        return when (val result = movieRepository.getRankedMovies()) {
            is Result.Success -> {
                // Business logic: ensure movies are sorted by rank
                val sortedMovies = result.data.sortedBy { it.rank }
                Result.Success(sortedMovies)
            }
            is Result.Error -> result
            is Result.Loading -> result
        }
    }
}
