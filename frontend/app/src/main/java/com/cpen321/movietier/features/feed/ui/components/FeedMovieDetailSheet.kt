package com.cpen321.movietier.features.feed.ui.components

import androidx.compose.runtime.*
import android.content.Context
import com.cpen321.movietier.shared.models.Movie
import com.cpen321.movietier.data.repository.Result
import com.cpen321.movietier.shared.components.AvailabilityInfo
import com.cpen321.movietier.shared.components.MovieDetailActions
import com.cpen321.movietier.shared.components.MovieDetailBottomSheet
import com.cpen321.movietier.ui.feed.CommonContext
import com.cpen321.movietier.ui.feed.MovieActionCallbacks
import com.cpen321.movietier.ui.feed.MovieDialogCallbacks
import com.cpen321.movietier.ui.feed.MovieDialogState
import com.cpen321.movietier.features.feed.ui.viewmodel.FeedViewModel
import androidx.compose.material3.SnackbarHostState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

internal fun pickTopProviders(providers: List<String>, limit: Int): List<String> {
    return providers.take(limit)
}

@Composable
internal fun FeedMovieDetailSheet(
    movie: Movie,
    dialogState: MovieDialogState,
    feedViewModel: FeedViewModel,
    country: String,
    commonContext: CommonContext,
    callbacks: MovieActionCallbacks,
    dialogCallbacks: MovieDialogCallbacks
) {
    var availability by remember(movie.id) { mutableStateOf<String?>(null) }
    var loadingAvail by remember(movie.id) { mutableStateOf(true) }

    // Fetch trailer key
    LaunchedEffect(movie.id) {
        val result = feedViewModel.getMovieVideos(movie.id)
        dialogCallbacks.onTrailerKeyUpdate(
            when (result) {
                is Result.Success -> result.data?.key
                else -> null
            }
        )
    }

    // Fetch watch providers
    LaunchedEffect(movie.id) {
        loadingAvail = true
        when (val res = feedViewModel.getWatchProviders(movie.id, country)) {
            is Result.Success -> {
                val providers = buildList {
                    addAll(res.data.providers.flatrate)
                    addAll(res.data.providers.rent)
                    addAll(res.data.providers.buy)
                }.distinct()
                val top = pickTopProviders(providers, 4)
                availability = if (top.isNotEmpty()) {
                    "Available on: ${top.joinToString()}" + if (providers.size > top.size) " …" else ""
                } else {
                    "No streaming info found"
                }
            }
            is Result.Error -> {
                availability = res.message ?: "Failed to load providers"
            }
            else -> {}
        }
        loadingAvail = false
    }

    MovieDetailBottomSheet(
        movie = movie,
        actions = MovieDetailActions(
            onOpenWhereToWatch = {
                handleWhereToWatchClick(
                    movie,
                    feedViewModel,
                    country,
                    commonContext.context,
                    commonContext.snackbarHostState,
                    commonContext.scope
                )
            },
            onAddToRanking = { callbacks.onAddToRanking(movie) },
            onAddToWatchlist = {
                callbacks.onAddToWatchlist(movie)
                callbacks.onDismiss()
            },
            onPlayTrailer = dialogState.trailerKey?.let {
                { dialogCallbacks.onShowTrailer(movie.title) }
            },
            onDismissRequest = callbacks.onDismiss
        ),
        availabilityInfo = AvailabilityInfo(
            availabilityText = availability,
            availabilityLoading = loadingAvail
        )
    )
}

private fun handleWhereToWatchClick(
    movie: Movie,
    feedViewModel: FeedViewModel,
    country: String,
    context: Context,
    snackbarHostState: SnackbarHostState,
    scope: CoroutineScope
) {
    scope.launch {
        val tmdbLink = "https://www.themoviedb.org/movie/${movie.id}/watch?locale=$country"
        var opened = false
        try {
            val intent = android.content.Intent(
                android.content.Intent.ACTION_VIEW,
                android.net.Uri.parse(tmdbLink)
            )
            context.startActivity(intent)
            opened = true
        } catch (_: Exception) {}

        if (!opened) {
            when (val res = feedViewModel.getWatchProviders(movie.id, country)) {
                is Result.Success -> {
                    val link = res.data.link
                    val providers = buildList {
                        addAll(res.data.providers.flatrate)
                        addAll(res.data.providers.rent)
                        addAll(res.data.providers.buy)
                    }.distinct()

                    if (!link.isNullOrBlank()) {
                        try {
                            val intent = android.content.Intent(
                                android.content.Intent.ACTION_VIEW,
                                android.net.Uri.parse(link)
                            )
                            context.startActivity(intent)
                        } catch (e: android.content.ActivityNotFoundException) {
                            val top = pickTopProviders(providers, 4)
                            snackbarHostState.showSnackbar(
                                "Available on: ${top.joinToString()}" +
                                    if (providers.size > top.size) " …" else ""
                            )
                        }
                    } else {
                        val top = pickTopProviders(providers, 4)
                        if (top.isNotEmpty()) {
                            snackbarHostState.showSnackbar(
                                "Available on: ${top.joinToString()}" +
                                    if (providers.size > top.size) " …" else ""
                            )
                        } else {
                            snackbarHostState.showSnackbar("No streaming info found")
                        }
                    }
                }
                is Result.Error -> {
                    snackbarHostState.showSnackbar(res.message ?: "Failed to load providers")
                }
                else -> {}
            }
        }
    }
}
