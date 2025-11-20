package com.cpen321.movietier.domain.usecase.movie

import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.data.repository.MovieRepository
import com.cpen321.movietier.data.repository.Result
import javax.inject.Inject

/**
 * Use case for searching movies
 * Encapsulates business logic for movie search (e.g., minimum query length)
 */
class SearchMoviesUseCase @Inject constructor(
    private val movieRepository: MovieRepository
) {
    suspend operator fun invoke(query: String): Result<List<Movie>> {
        // Business logic: require minimum 2 characters
        if (query.length < 2) {
            return Result.Success(emptyList())
        }
        return movieRepository.searchMovies(query)
    }
}
