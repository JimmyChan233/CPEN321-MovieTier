package com.cpen321.movietier.ui.feed.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.ui.viewmodels.FeedUiState
import com.cpen321.movietier.ui.viewmodels.FeedViewModel

@Composable
fun FeedContentState(
    uiState: FeedUiState,
    feedViewModel: FeedViewModel,
    country: String,
    onMovieSelected: (Movie) -> Unit,
    onShowComments: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("feed_list"),
        contentPadding = PaddingValues(
            start = 16.dp,
            end = 16.dp,
            top = 16.dp,
            bottom = 112.dp
        ),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(
            items = uiState.feedActivities,
            key = { it.id }
        ) { activity ->
            FeedActivityItem(
                activity = activity,
                feedViewModel = feedViewModel,
                country = country,
                onMovieSelected = onMovieSelected,
                onShowComments = onShowComments
            )
        }
    }
}
