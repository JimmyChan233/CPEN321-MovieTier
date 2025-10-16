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
    val snackbarHostState = remember { SnackbarHostState() }
    var showAddDialog by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    val searchResults by rankingViewModel.searchResults.collectAsState()

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .testTag("ranking_screen"),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            CenterAlignedTopAppBar(title = { Text("My Rankings", style = MaterialTheme.typography.titleMedium) })
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                modifier = Modifier.testTag("add_movie_fab")
            ) { Text("+") }
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
                            message = "Start adding and ranking movies to build your list",
                            primaryCta = {
                                Button(onClick = { showAddDialog = true }, modifier = Modifier.testTag("empty_add_movie_button")) {
                                    Text("Add Watched Movie")
                                }
                            }
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

    LaunchedEffect(Unit) {
        rankingViewModel.events.collect { ev ->
            when (ev) {
                is com.cpen321.movietier.ui.viewmodels.RankingEvent.Message -> snackbarHostState.showSnackbar(ev.text)
            }
        }
    }

    if (showAddDialog) {
        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            title = { Text("Add Watched Movie") },
            text = {
                Column(Modifier.fillMaxWidth()) {
                    OutlinedTextField(
                        value = query,
                        onValueChange = {
                            query = it
                            rankingViewModel.searchMovies(it)
                        },
                        label = { Text("Search title") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth().testTag("search_movie_input")
                    )
                    Spacer(Modifier.height(12.dp))
                    if (query.length >= 2 && searchResults.isEmpty()) {
                        Text("No results", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.heightIn(max = 300.dp)
                    ) {
                        items(searchResults, key = { it.id }) { movie ->
                            Card(Modifier.fillMaxWidth().testTag("search_result_${'$'}{movie.id}")) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column(Modifier.weight(1f)) {
                                        Text(movie.title, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
                                        movie.releaseDate?.take(4)?.let { year ->
                                            Text(year, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }
                                    TextButton(onClick = {
                                        rankingViewModel.addMovieFromSearch(movie)
                                        showAddDialog = false
                                    }) { Text("Add") }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showAddDialog = false }) { Text("Close") }
            }
        )
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

@Composable
private fun AddWatchedMovieDialog(
    onDismiss: () -> Unit,
    onConfirm: (String, String?) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var poster by remember { mutableStateOf("") }
    val isValid = title.isNotBlank()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Watched Movie") },
        text = {
            Column(Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Title") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().testTag("add_movie_title")
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = poster,
                    onValueChange = { poster = it },
                    label = { Text("Poster URL (optional)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().testTag("add_movie_poster")
                )
            }
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(title, poster.ifBlank { null }) }, enabled = isValid, modifier = Modifier.testTag("add_movie_confirm")) {
                Text("Add")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, modifier = Modifier.testTag("add_movie_cancel")) { Text("Cancel") }
        }
    )
}

@Preview(showBackground = true)
@Composable
private fun RankingScreenPreview() {
    MovieTierTheme {
        val navController = rememberNavController()
        RankingScreen(navController = navController)
    }
}
