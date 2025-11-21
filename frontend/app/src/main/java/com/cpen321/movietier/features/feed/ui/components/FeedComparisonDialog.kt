package com.cpen321.movietier.features.feed.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.cpen321.movietier.shared.models.Movie
import com.cpen321.movietier.features.feed.ui.state.FeedCompareState
import com.cpen321.movietier.features.feed.ui.viewmodel.FeedViewModel

@Composable
fun FeedComparisonDialog(
    state: FeedCompareState,
    feedViewModel: FeedViewModel
) {
    AlertDialog(
        onDismissRequest = { /* block dismiss during compare */ },
        title = { Text("Which movie do you prefer?") },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    "Help us place '${state.newMovie.title}' in your rankings:",
                    style = MaterialTheme.typography.bodyMedium
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    FeedComparisonOption(
                        movie = state.newMovie,
                        state = state,
                        feedViewModel = feedViewModel,
                        modifier = Modifier.weight(1f)
                    )
                    FeedComparisonOption(
                        movie = state.compareWith,
                        state = state,
                        feedViewModel = feedViewModel,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        },
        confirmButton = {},
        dismissButton = {}
    )
}

@Composable
private fun FeedComparisonOption(
    movie: Movie,
    state: FeedCompareState,
    feedViewModel: FeedViewModel,
    modifier: Modifier
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        AsyncImage(
            model = movie.posterPath?.let { "https://image.tmdb.org/t/p/w342$it" },
            contentDescription = movie.title,
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(2f / 3f)
                .clip(MaterialTheme.shapes.medium),
            contentScale = ContentScale.Crop
        )
        Button(
            onClick = { feedViewModel.choosePreferred(state.newMovie, state.compareWith, movie) },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                movie.title,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}
