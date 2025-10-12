package com.cpen321.movietier.ui.recommendation

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import androidx.navigation.compose.rememberNavController
import com.cpen321.movietier.ui.components.EmptyState
import com.cpen321.movietier.ui.components.ErrorState
import com.cpen321.movietier.ui.components.LoadingState
import com.cpen321.movietier.ui.components.PosterGrid
import com.cpen321.movietier.ui.components.MovieDetailBottomSheet
import com.cpen321.movietier.ui.theme.MovieTierTheme
import com.cpen321.movietier.ui.viewmodels.RecommendationViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecommendationScreen(
    navController: NavController,
    recommendationViewModel: RecommendationViewModel = hiltViewModel()
) {
    val uiState by recommendationViewModel.uiState.collectAsState()
    var selectedMovie by remember { mutableStateOf<com.cpen321.movietier.data.model.Movie?>(null) }

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .testTag("recommendation_screen"),
        topBar = {
            CenterAlignedTopAppBar(title = { Text("Discover", style = MaterialTheme.typography.titleMedium) })
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
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                            .testTag("recommendation_error")
                    ) {
                        ErrorState(
                            message = uiState.errorMessage ?: "Failed to load recommendations",
                            onRetry = { recommendationViewModel.loadRecommendations() }
                        )
                    }
                }
                RecommendationState.EMPTY -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                            .testTag("recommendation_empty")
                    ) {
                        EmptyState(
                            icon = Icons.Default.Favorite,
                            title = "No recommendations yet",
                            message = "Rank some movies to get personalized recommendations"
                        )
                    }
                }
                RecommendationState.CONTENT -> {
                    Box(modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)) {
                        PosterGrid(
                            movies = uiState.recommendations,
                            onMovieClick = { movie -> selectedMovie = movie },
                            modifier = Modifier.fillMaxSize()
                        )

                        selectedMovie?.let { movie ->
                            MovieDetailBottomSheet(
                                movie = movie,
                                onAddToRanking = { /* TODO: hook to ranking action */ },
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

@Preview(showBackground = true)
@Composable
private fun RecommendationScreenPreview() {
    MovieTierTheme {
        val navController = rememberNavController()
        RecommendationScreen(navController = navController)
    }
}
