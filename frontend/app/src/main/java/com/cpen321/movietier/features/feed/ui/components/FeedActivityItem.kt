package com.cpen321.movietier.features.feed.ui.components

import androidx.compose.runtime.*
import com.cpen321.movietier.shared.models.FeedActivity
import com.cpen321.movietier.shared.models.Movie
import com.cpen321.movietier.shared.repository.Result
import com.cpen321.movietier.shared.components.FeedActivityCard
import com.cpen321.movietier.features.feed.ui.viewmodel.FeedViewModel

@Composable
internal fun FeedActivityItem(
    activity: FeedActivity,
    feedViewModel: FeedViewModel,
    country: String,
    onMovieSelected: (Movie) -> Unit,
    onShowComments: (String) -> Unit
) {
    var availability by remember(activity.movie.id) { mutableStateOf<String?>(null) }

    LaunchedEffect(activity.movie.id) {
        when (val res = feedViewModel.getWatchProviders(activity.movie.id, country)) {
            is Result.Success -> {
                val providers = buildList {
                    addAll(res.data.providers.flatrate)
                    addAll(res.data.providers.rent)
                    addAll(res.data.providers.buy)
                }.distinct()
                val top = pickTopProviders(providers, 4)
                val more = providers.size > top.size
                availability = if (top.isNotEmpty()) {
                    "Available on: ${top.joinToString()}" + if (more) " …" else ""
                } else null
            }
            else -> {
                availability = null
            }
        }
    }

    FeedActivityCard(
        activity = activity,
        availabilityText = availability,
        onClick = { onMovieSelected(activity.movie) },
        onLikeClick = { feedViewModel.toggleLike(activity.id) },
        onCommentClick = { onShowComments(activity.id); feedViewModel.loadComments(activity.id) }
    )
}
