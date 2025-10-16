package com.cpen321.movietier.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.cpen321.movietier.data.model.Movie

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MovieDetailBottomSheet(
    movie: Movie,
    onAddToRanking: (() -> Unit)? = null,
    onAddToWatchlist: (() -> Unit)? = null,
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        sheetState = sheetState
    ) {
        Column(
            modifier = modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.Start
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                AsyncImage(
                    model = movie.posterPath?.let { "https://image.tmdb.org/t/p/w342$it" },
                    contentDescription = "Poster: ${movie.title}",
                    modifier = Modifier
                        .height(160.dp)
                        .aspectRatio(2f / 3f),
                    contentScale = ContentScale.Crop
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = movie.title,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        movie.releaseDate?.take(4)?.let { year ->
                            AssistChip(onClick = {}, label = { Text(year) })
                        }
                        movie.voteAverage?.let { rating ->
                            AssistChip(onClick = {}, label = { Text("★ %.1f".format(rating)) })
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (onAddToRanking != null) {
                            FilledTonalButton(onClick = onAddToRanking, modifier = Modifier.fillMaxWidth()) {
                                Text("Add to Ranking")
                            }
                        }
                        if (onAddToWatchlist != null) {
                            Button(onClick = onAddToWatchlist, modifier = Modifier.fillMaxWidth()) {
                                Text("Add to Watchlist")
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            movie.overview?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
