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
import com.cpen321.movietier.ui.components.StarRating
import com.cpen321.movietier.ui.theme.MovieTierTheme
import com.cpen321.movietier.ui.viewmodels.RankingViewModel
import coil.compose.AsyncImage
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.foundation.clickable
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.HorizontalDivider
import androidx.compose.foundation.Image
import androidx.compose.ui.res.painterResource
import com.cpen321.movietier.R

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

    val compareState by rankingViewModel.compareState.collectAsState()


    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .testTag("ranking_screen"),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Image(
                            painter = painterResource(id = R.drawable.in_app_icon),
                            contentDescription = "MovieTier",
                            modifier = Modifier.size(32.dp)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text("MovieTier", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    }
                },
                windowInsets = WindowInsets(0, 0, 0, 0)
            )
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
                            var showActions by remember { mutableStateOf(false) }

                            RankedMovieRow(
                                rankedMovie = rankedMovie,
                                onClick = { showActions = true }
                            )

                            if (showActions) {
                                MovieActionSheet(
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
                        modifier = Modifier.heightIn(max = 520.dp)
                    ) {
                        items(searchResults, key = { it.id }) { movie ->
                            Card(Modifier.fillMaxWidth().testTag("search_result_${'$'}{movie.id}")) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    AsyncImage(
                                        model = movie.posterPath?.let { "https://image.tmdb.org/t/p/w154$it" },
                                        contentDescription = movie.title,
                                        modifier = Modifier
                                            .height(96.dp)
                                            .aspectRatio(2f / 3f)
                                            .clip(MaterialTheme.shapes.small),
                                        contentScale = ContentScale.Crop
                                    )
                                    Column(Modifier.weight(1f)) {
                                        Text(
                                            movie.title,
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Medium
                                        )
                                        val subtitle = buildString {
                                            movie.releaseDate?.take(4)?.let { append(it) }
                                            val castStr = movie.cast?.take(3)?.joinToString()
                                            if (!castStr.isNullOrBlank()) {
                                                if (isNotEmpty()) append(" • ")
                                                append(castStr)
                                            }
                                        }
                                        if (subtitle.isNotBlank()) {
                                            Text(
                                                subtitle,
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                maxLines = 3
                                            )
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
    // 🔹 Comparison Dialog
    if (compareState != null) {
        val state = compareState!!
        AlertDialog(
            onDismissRequest = { /* Disabled during ranking */ },
            title = { Text("Which movie do you prefer?") },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        "Help us place '${state.newMovie.title}' in your rankings:",
                        style = MaterialTheme.typography.bodyLarge
                    )
                    Button(
                        onClick = {
                            rankingViewModel.compareMovies(
                                newMovie = state.newMovie,
                                compareWith = state.compareWith,
                                preferredMovie = state.newMovie
                            )
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(state.newMovie.title)
                    }
                    Button(
                        onClick = {
                            rankingViewModel.compareMovies(
                                newMovie = state.newMovie,
                                compareWith = state.compareWith,
                                preferredMovie = state.compareWith
                            )
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(state.compareWith.title)
                    }
                }
            },
            confirmButton = {},
            dismissButton = {}
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
    val vm: RankingViewModel = hiltViewModel()
    var details by remember(rankedMovie.movie.id) { mutableStateOf<com.cpen321.movietier.data.model.Movie?>(null) }

    LaunchedEffect(rankedMovie.movie.id) {
        when (val res = vm.getMovieDetails(rankedMovie.movie.id)) {
            is com.cpen321.movietier.data.repository.Result.Success -> details = res.data
            else -> {}
        }
    }
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
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
            // Left column: rank number on top, poster below
            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Surface(
                    shape = MaterialTheme.shapes.medium,
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Text(
                        text = "#${rankedMovie.rank}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                    )
                }

                rankedMovie.movie.posterPath?.let { poster ->
                    AsyncImage(
                        model = "https://image.tmdb.org/t/p/w185$poster",
                        contentDescription = rankedMovie.movie.title,
                        modifier = Modifier
                            .height(140.dp)
                            .aspectRatio(2f / 3f)
                            .clip(MaterialTheme.shapes.small),
                        contentScale = ContentScale.Crop
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
                Spacer(modifier = Modifier.height(4.dp))
                // Year and rating row
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val year = (details?.releaseDate ?: rankedMovie.movie.releaseDate)?.take(4)
                    if (!year.isNullOrBlank()) {
                        Text(
                            text = year,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    val rating = (details?.voteAverage ?: rankedMovie.movie.voteAverage)
                    rating?.let {
                        StarRating(rating = it, starSize = 14.dp)
                    }
                }
                details?.cast?.take(3)?.let { cast ->
                    if (cast.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = cast.joinToString(),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
                (details?.overview ?: rankedMovie.movie.overview)?.let { overview ->
                    if (overview.isNotBlank()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = overview,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 4,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MovieActionSheet(
    movieTitle: String,
    onDismiss: () -> Unit,
    onRerank: () -> Unit,
    onDelete: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState()
    var showDeleteConfirm by remember { mutableStateOf(false) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 32.dp)
        ) {
            // Title
            Text(
                text = movieTitle,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

            // Rerank option
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        onRerank()
                    }
                    .padding(horizontal = 24.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Refresh,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Column {
                    Text(
                        text = "Rerank",
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = "Compare and adjust position",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Delete option
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        showDeleteConfirm = true
                    }
                    .padding(horizontal = 24.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.error
                )
                Column {
                    Text(
                        text = "Delete from Rankings",
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.error
                    )
                    Text(
                        text = "Remove from your list",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }

    // Delete confirmation dialog
    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            icon = {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.error
                )
            },
            title = { Text("Delete Ranking?") },
            text = {
                Text("Are you sure you want to remove \"$movieTitle\" from your rankings? This action cannot be undone.")
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteConfirm = false
                        onDelete()
                    },
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text("Cancel")
                }
            }
        )
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
