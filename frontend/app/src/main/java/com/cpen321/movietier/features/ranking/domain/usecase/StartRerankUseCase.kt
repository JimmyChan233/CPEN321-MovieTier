package com.cpen321.movietier.features.ranking.domain.usecase

import com.cpen321.movietier.shared.models.AddMovieResponse
import com.cpen321.movietier.features.ranking.data.repository.MovieRepository
import com.cpen321.movietier.data.repository.Result
import javax.inject.Inject

/**
 * Use case for starting the reranking process
 * Encapsulates business logic for repositioning an existing ranked movie
 */
class StartRerankUseCase @Inject constructor(
    private val movieRepository: MovieRepository
) {
    suspend operator fun invoke(rankedMovieId: String): Result<AddMovieResponse> {
        return movieRepository.startRerank(rankedMovieId)
    }
}
