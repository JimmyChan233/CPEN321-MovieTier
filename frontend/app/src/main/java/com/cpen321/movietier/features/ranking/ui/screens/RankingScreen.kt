package com.cpen321.movietier.features.ranking.ui.screens

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import androidx.navigation.compose.rememberNavController
import com.cpen321.movietier.shared.models.RankedMovie
import com.cpen321.movietier.shared.components.EmptyState
import com.cpen321.movietier.shared.components.LoadingState
import com.cpen321.movietier.features.ranking.ui.components.AddWatchedMovieDialog
import com.cpen321.movietier.features.ranking.ui.components.ComparisonMovieOption
import com.cpen321.movietier.features.ranking.ui.components.MovieComparisonDialog
import com.cpen321.movietier.features.ranking.ui.components.RankedMovieRow
import com.cpen321.movietier.features.ranking.ui.components.RankingTopBar
import com.cpen321.movietier.shared.components.MovieTierTheme
import com.cpen321.movietier.features.ranking.ui.state.CompareUiState
import com.cpen321.movietier.features.ranking.ui.state.RankingEvent
import com.cpen321.movietier.features.ranking.ui.viewmodel.RankingViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RankingScreen(
    navController: NavController,
    rankingViewModel: RankingViewModel = hiltViewModel()
) {
    val uiState by rankingViewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showAddDialog by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }

    RankingEventHandler(rankingViewModel, snackbarHostState)

    Scaffold(
        modifier = Modifier.fillMaxSize().testTag("ranking_screen"),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = { RankingTopBar() },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                modifier = Modifier.testTag("add_movie_fab")
            ) {
                Text("+")
            }
        }
    ) { padding ->
        RankingMainContent(padding, uiState, rankingViewModel) { showAddDialog = true }
    }

    if (showAddDialog) {
        AddWatchedMovieDialog(
            query = query,
            onQueryChange = { newQuery ->
                query = newQuery
                rankingViewModel.searchMovies(newQuery)
            },
            searchResults = uiState.searchResults,
            onAddMovie = { movie ->
                rankingViewModel.addMovieFromSearch(movie)
                showAddDialog = false
            },
            onDismiss = { showAddDialog = false }
        )
    }

    uiState.compareState?.let { compareState ->
        MovieComparisonDialog(
            compareState = compareState as Any,
            onCompare = { newMovie, compareWith, preferred ->
                rankingViewModel.compareMovies(newMovie, compareWith, preferred)
            }
        )
    }
}

@Composable
private fun RankingEventHandler(
    rankingViewModel: RankingViewModel,
    snackbarHostState: SnackbarHostState
) {
    LaunchedEffect(Unit) {
        rankingViewModel.events.collect { ev ->
            when (ev) {
                is RankingEvent.Message -> snackbarHostState.showSnackbar(ev.text)
                is RankingEvent.Error -> snackbarHostState.showSnackbar(ev.text)
            }
        }
    }
}

@Composable
private fun RankingMainContent(
    padding: PaddingValues,
    uiState: com.cpen321.movietier.features.ranking.ui.state.RankingUiState,
    rankingViewModel: RankingViewModel,
    onShowAddDialog: () -> Unit
) {
    Crossfade(
        targetState = when {
            uiState.isLoading -> RankingState.LOADING
            uiState.rankedMovies.isEmpty() -> RankingState.EMPTY
            else -> RankingState.CONTENT
        },
        label = "ranking_state"
    ) { state ->
        when (state) {
            RankingState.LOADING -> LoadingState(
                Modifier.fillMaxSize().padding(padding),
                "Loading rankings..."
            )
            RankingState.EMPTY -> RankingEmptyState(padding, onShowAddDialog)
            RankingState.CONTENT -> RankingContentList(
                padding,
                uiState.rankedMovies,
                rankingViewModel
            )
        }
    }
}

private enum class RankingState {
    LOADING, EMPTY, CONTENT
}

@Composable
private fun RankingEmptyState(
    padding: PaddingValues,
    onAddMovie: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .testTag("ranking_empty")
    ) {
        EmptyState(
            icon = Icons.Default.Star,
            title = "No movies ranked yet",
            message = "Start adding and ranking movies to build your list",
            primaryCta = {
                Button(
                    onClick = onAddMovie,
                    modifier = Modifier.testTag("empty_add_movie_button")
                ) {
                    Text("Add Watched Movie")
                }
            }
        )
    }
}

@Composable
private fun RankingContentList(
    padding: PaddingValues,
    rankedMovies: List<RankedMovie>,
    rankingViewModel: RankingViewModel
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .testTag("ranking_list"),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        items(
            items = rankedMovies,
            key = { it.id }
        ) { rankedMovie ->
            var showActions by remember { mutableStateOf(false) }

            RankedMovieRow(
                rankedMovie = rankedMovie,
                onClick = { showActions = true }
            )

            if (showActions) {
                MovieActionSheetDialog(
                    movieTitle = rankedMovie.movie.title,
                    onDismiss = { showActions = false },
                    onRerank = {
                        showActions = false
                        rankingViewModel.startRerank(rankedMovie)
                    },
                    onDelete = {
                        showActions = false
                        rankingViewModel.deleteRank(rankedMovie.id)
                    }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MovieActionSheetDialog(
    movieTitle: String,
    onDismiss: () -> Unit,
    onRerank: () -> Unit,
    onDelete: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState()
    val scope = rememberCoroutineScope()

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                "\"$movieTitle\"",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            Button(
                onClick = onRerank,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp)
            ) {
                Text("Re-rank")
            }

            Button(
                onClick = onDelete,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.error
                )
            ) {
                Text("Delete")
            }

            Spacer(modifier = Modifier.height(16.dp))
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
