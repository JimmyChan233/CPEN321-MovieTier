package com.cpen321.movietier.features.watchlist.domain.usecase

import com.cpen321.movietier.shared.models.Movie
import com.cpen321.movietier.shared.repository.Result
import com.cpen321.movietier.features.watchlist.data.repository.WatchlistRepository
import javax.inject.Inject

/**
 * Use case for adding a movie to watchlist
 * Encapsulates business logic for watchlist additions
 */
class AddToWatchlistUseCase @Inject constructor(
    private val watchlistRepository: WatchlistRepository
) {
    suspend operator fun invoke(movie: Movie): Result<com.cpen321.movietier.data.model.WatchlistItem> {
        return watchlistRepository.addToWatchlist(
            movieId = movie.id,
            title = movie.title,
            posterPath = movie.posterPath,
            overview = movie.overview
        )
    }
}
