package com.cpen321.movietier.domain.usecase.ranking

import com.cpen321.movietier.data.model.AddMovieResponse
import com.cpen321.movietier.data.repository.MovieRepository
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
