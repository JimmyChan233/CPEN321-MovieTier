package com.cpen321.movietier.ui.recommendation

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.ui.components.*
import com.cpen321.movietier.ui.viewmodels.RecommendationViewModel
import com.cpen321.movietier.ui.viewmodels.RankingViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecommendationScreen(
    navController: NavController,
    recommendationViewModel: RecommendationViewModel = hiltViewModel(),
    rankingViewModel: RankingViewModel = hiltViewModel()
) {
    val uiState by recommendationViewModel.uiState.collectAsState()
    var selectedMovie by remember { mutableStateOf<Movie?>(null) }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Discover", style = MaterialTheme.typography.titleMedium) }
            )
        }
    ) { padding ->

        Crossfade(
            targetState = when {
                uiState.isLoading -> RecommendationState.LOADING
                uiState.errorMessage != null -> RecommendationState.ERROR
                uiState.recommendations.isEmpty() -> RecommendationState.EMPTY
                else -> RecommendationState.CONTENT
            },
            label = "recommendation_state"
        ) { state ->
            when (state) {
                RecommendationState.LOADING -> {
                    LoadingState(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding),
                        hint = "Finding recommendations..."
                    )
                }

                RecommendationState.ERROR -> {
                    ErrorState(
                        message = uiState.errorMessage ?: "Failed to load recommendations",
                        onRetry = { recommendationViewModel.loadRecommendations() },
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                    )
                }

                RecommendationState.EMPTY -> {
                    EmptyState(
                        icon = Icons.Default.Favorite,
                        title = "No recommendations yet",
                        message = "Rank some movies to get personalized suggestions",
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                    )
                }

                RecommendationState.CONTENT -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                    ) {
                        Text(
                            text = "Recommended for You",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                        )

                        LazyColumn(
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            items(uiState.recommendations, key = { it.id }) { movie ->
                                RecommendationCard(
                                    movie = movie,
                                    onClick = { selectedMovie = movie },
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }

                        selectedMovie?.let { movie ->
                            MovieDetailBottomSheet(
                                movie = movie,
                                onAddToRanking = { rankingViewModel.addMovieFromSearch(movie) },
                                onDismissRequest = { selectedMovie = null }
                            )
                        }
                    }
                }
            }
        }
    }
}

private enum class RecommendationState {
    LOADING, ERROR, EMPTY, CONTENT
}
