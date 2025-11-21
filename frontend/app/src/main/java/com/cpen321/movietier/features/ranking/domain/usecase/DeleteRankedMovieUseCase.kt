package com.cpen321.movietier.features.ranking.domain.usecase

import com.cpen321.movietier.features.ranking.data.repository.MovieRepository
import com.cpen321.movietier.data.repository.Result
import javax.inject.Inject

/**
 * Use case for deleting a ranked movie
 * Encapsulates business logic for removing movies from user's ranking
 */
class DeleteRankedMovieUseCase @Inject constructor(
    private val movieRepository: MovieRepository
) {
    suspend operator fun invoke(rankedMovieId: String): Result<Unit> {
        return movieRepository.deleteRankedMovie(rankedMovieId)
    }
}
