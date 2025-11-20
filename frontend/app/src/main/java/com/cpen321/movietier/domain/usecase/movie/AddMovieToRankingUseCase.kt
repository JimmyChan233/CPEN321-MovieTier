package com.cpen321.movietier.domain.usecase.movie

import com.cpen321.movietier.data.model.AddMovieResponse
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.data.repository.MovieRepository
import com.cpen321.movietier.data.repository.Result
import javax.inject.Inject

/**
 * Use case for adding a movie to user's ranking
 * Handles the business logic for initiating movie comparison flow
 */
class AddMovieToRankingUseCase @Inject constructor(
    private val movieRepository: MovieRepository
) {
    suspend operator fun invoke(movie: Movie): Result<AddMovieResponse> {
        return movieRepository.addMovie(
            movieId = movie.id,
            title = movie.title,
            posterPath = movie.posterPath,
            overview = movie.overview
        )
    }
}
