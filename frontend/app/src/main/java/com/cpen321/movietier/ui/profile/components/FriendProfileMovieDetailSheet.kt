package com.cpen321.movietier.ui.profile.components

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarResult
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.navigation.NavController
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.data.repository.Result
import com.cpen321.movietier.ui.components.MovieDetailActions
import com.cpen321.movietier.ui.components.MovieDetailBottomSheet
import com.cpen321.movietier.ui.navigation.NavRoutes
import com.cpen321.movietier.ui.viewmodels.FriendProfileViewModel
import com.cpen321.movietier.ui.viewmodels.RankingViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import androidx.compose.material3.SnackbarHostState
import android.content.Context

/**
 * Movie detail bottom sheet for friend profile with trailer and watch provider handling.
 */
@Composable
internal fun FriendProfileMovieDetailSheet(
    movie: Movie,
    trailerKey: String?,
    country: String,
    friendProfileViewModel: FriendProfileViewModel,
    rankingViewModel: RankingViewModel,
    navController: NavController,
    context: Context,
    scope: CoroutineScope,
    snackbarHostState: SnackbarHostState,
    onTrailerKeyUpdate: (String?) -> Unit,
    onShowTrailer: (String) -> Unit,
    onDismissMovie: () -> Unit
) {
    LaunchedEffect(movie.id) {
        val result = friendProfileViewModel.getMovieVideos(movie.id)
        onTrailerKeyUpdate(when (result) {
            is Result.Success -> result.data?.key
            else -> null
        })
    }

    MovieDetailBottomSheet(
        movie = movie,
        actions = MovieDetailActions(
            onAddToRanking = { rankingViewModel.addMovieFromSearch(movie) },
            onAddToWatchlist = {
                handleAddToWatchlist(
                    movie = movie,
                    vm = friendProfileViewModel,
                    navController = navController,
                    context = context,
                    scope = scope,
                    snackbarHostState = snackbarHostState,
                    onDismissMovie = onDismissMovie
                )
            },
            onOpenWhereToWatch = {
                handleWhereToWatch(
                    movie = movie,
                    country = country,
                    vm = friendProfileViewModel,
                    context = context,
                    scope = scope,
                    snackbarHostState = snackbarHostState
                )
            },
            onPlayTrailer = trailerKey?.let { { onShowTrailer(movie.title) } },
            onDismissRequest = onDismissMovie
        )
    )
}

private fun handleAddToWatchlist(
    movie: Movie,
    vm: FriendProfileViewModel,
    navController: NavController,
    context: Context,
    scope: CoroutineScope,
    snackbarHostState: SnackbarHostState,
    onDismissMovie: () -> Unit
) {
    scope.launch {
        onDismissMovie()
        when (val res = vm.addToMyWatchlist(movie.id, movie.title, movie.overview, movie.posterPath)) {
            is Result.Success -> {
                val result = snackbarHostState.showSnackbar("Added to my watchlist", "View", false, SnackbarDuration.Short)
                if (result == SnackbarResult.ActionPerformed) { navController.navigate(NavRoutes.WATCHLIST) }
            }
            is Result.Error -> {
                val msg = if (res.message?.contains("already", ignoreCase = true) == true) "Already in Watchlist" else res.message ?: "Already in Watchlist"
                snackbarHostState.showSnackbar(msg, null, false, SnackbarDuration.Short)
            }
            else -> {}
        }
    }
}

private fun handleWhereToWatch(
    movie: Movie,
    country: String,
    vm: FriendProfileViewModel,
    context: Context,
    scope: CoroutineScope,
    snackbarHostState: SnackbarHostState
) {
    scope.launch {
        val tmdbLink = "https://www.themoviedb.org/movie/${movie.id}/watch?locale=${country}"
        var tmdbOpened = false
        try { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(tmdbLink))); tmdbOpened = true } catch (_: Exception) {}
        if (!tmdbOpened) {
            when (val res = vm.getWatchProviders(movie.id, country)) {
                is Result.Success -> {
                    val link = res.data.link
                    val providers = (res.data.providers.flatrate + res.data.providers.rent + res.data.providers.buy).distinct()
                    if (!link.isNullOrBlank()) {
                        try { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(link))) }
                        catch (e: ActivityNotFoundException) { snackbarHostState.showSnackbar("Open link failed. Available: ${providers.joinToString()}") }
                    } else if (providers.isNotEmpty()) { snackbarHostState.showSnackbar("Available on: ${providers.joinToString()}") }
                    else { snackbarHostState.showSnackbar("No streaming info found") }
                }
                is Result.Error -> { snackbarHostState.showSnackbar(res.message ?: "Failed to load providers") }
                else -> {}
            }
        }
    }
}
