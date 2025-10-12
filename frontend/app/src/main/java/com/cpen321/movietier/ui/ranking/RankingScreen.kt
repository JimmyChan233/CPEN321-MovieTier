package com.cpen321.movietier.ui.ranking

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import androidx.navigation.compose.rememberNavController
import com.cpen321.movietier.ui.components.EmptyState
import com.cpen321.movietier.ui.components.LoadingState
import com.cpen321.movietier.ui.components.MovieCard
import com.cpen321.movietier.ui.theme.MovieTierTheme
import com.cpen321.movietier.ui.viewmodels.RankingViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RankingScreen(
    navController: NavController,
    rankingViewModel: RankingViewModel = hiltViewModel()
) {
    val uiState by rankingViewModel.uiState.collectAsState()

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .testTag("ranking_screen"),
        topBar = {
            CenterAlignedTopAppBar(title = { Text("My Rankings", style = MaterialTheme.typography.titleMedium) })
        }
    ) { padding ->
        Crossfade(
            targetState = when {
                uiState.isLoading -> RankingState.LOADING
                uiState.rankedMovies.isEmpty() -> RankingState.EMPTY
                else -> RankingState.CONTENT
            },
            label = "ranking_state"
        ) { state ->
            when (state) {
                RankingState.LOADING -> {
                    LoadingState(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding),
                        hint = "Loading rankings..."
                    )
                }
                RankingState.EMPTY -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                            .testTag("ranking_empty")
                    ) {
                        EmptyState(
                            icon = Icons.Default.Star,
                            title = "No movies ranked yet",
                            message = "Start adding and ranking movies to build your list"
                        )
                    }
                }
                RankingState.CONTENT -> {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                            .testTag("ranking_list"),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        items(
                            items = uiState.rankedMovies,
                            key = { it.id }
                        ) { rankedMovie ->
                            RankedMovieRow(
                                rankedMovie = rankedMovie,
                                onClick = { /* Navigate to detail or rerank */ }
                            )
                        }
                    }
                }
            }
        }
    }
}

private enum class RankingState {
    LOADING, EMPTY, CONTENT
}

@Composable
private fun RankedMovieRow(
    rankedMovie: com.cpen321.movietier.data.model.RankedMovie,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("ranked_movie_${rankedMovie.rank}"),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Large rank number/chip
            Surface(
                shape = MaterialTheme.shapes.medium,
                color = MaterialTheme.colorScheme.primaryContainer,
                modifier = Modifier.size(60.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = "#${rankedMovie.rank}",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }

            // Movie info in a smaller MovieCard style
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = rankedMovie.movie.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                rankedMovie.movie.releaseDate?.let { releaseDate ->
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = releaseDate.take(4),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                rankedMovie.movie.voteAverage?.let { rating ->
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Rating: %.1f".format(rating),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun RankingScreenPreview() {
    MovieTierTheme {
        val navController = rememberNavController()
        RankingScreen(navController = navController)
    }
}
