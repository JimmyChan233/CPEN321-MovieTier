package com.cpen321.movietier.ui.watchlist

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.cpen321.movietier.ui.viewmodels.WatchlistViewModel
import kotlinx.coroutines.launch
import androidx.compose.ui.platform.LocalContext
import android.content.Intent
import android.net.Uri
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun WatchlistScreen(
    navController: NavController,
    vm: WatchlistViewModel = hiltViewModel()
) {
    val ui by vm.ui.collectAsState()
    val compareState by vm.compareState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val country = remember { java.util.Locale.getDefault().country.takeIf { it.isNotBlank() } ?: "CA" }
    val details by vm.details.collectAsState()
    var showDeleteDialog by remember { mutableStateOf(false) }
    var itemToDelete by remember { mutableStateOf<com.cpen321.movietier.data.model.WatchlistItem?>(null) }

    Scaffold(topBar = {
        var sortMenu by remember { mutableStateOf(false) }
        CenterAlignedTopAppBar(
            title = { Text("My Watchlist", style = MaterialTheme.typography.titleMedium) },
            navigationIcon = {
                IconButton(onClick = { navController.navigateUp() }) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
            },
            actions = {
                IconButton(onClick = { sortMenu = true }) {
                    Icon(Icons.Filled.MoreVert, contentDescription = "Sort")
                }
                DropdownMenu(expanded = sortMenu, onDismissRequest = { sortMenu = false }) {
                    DropdownMenuItem(
                        text = { Text("Date Added (Newest)") },
                        onClick = { sortMenu = false; vm.setSort(com.cpen321.movietier.ui.viewmodels.WatchlistSort.DATE_DESC) }
                    )
                    DropdownMenuItem(
                        text = { Text("Date Added (Oldest)") },
                        onClick = { sortMenu = false; vm.setSort(com.cpen321.movietier.ui.viewmodels.WatchlistSort.DATE_ASC) }
                    )
                    DropdownMenuItem(
                        text = { Text("Rating (High → Low)") },
                        onClick = { sortMenu = false; vm.setSort(com.cpen321.movietier.ui.viewmodels.WatchlistSort.RATING_DESC) }
                    )
                    DropdownMenuItem(
                        text = { Text("Rating (Low → High)") },
                        onClick = { sortMenu = false; vm.setSort(com.cpen321.movietier.ui.viewmodels.WatchlistSort.RATING_ASC) }
                    )
                }
            }
        )
    }, snackbarHost = { SnackbarHost(snackbarHostState) }) { padding ->
        if (ui.isLoading) {
            Box(Modifier.fillMaxSize().padding(padding)) { CircularProgressIndicator(Modifier.padding(24.dp)) }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(ui.displayed, key = { it.id }) { item ->
                    Card(
                        Modifier
                            .fillMaxWidth()
                            .combinedClickable(
                                onClick = {},
                                onLongClick = {
                                    itemToDelete = item
                                    showDeleteDialog = true
                                }
                            )
                    ) {
                        Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            AsyncImage(model = item.posterPath?.let { "https://image.tmdb.org/t/p/w185$it" }, contentDescription = item.title, modifier = Modifier.height(140.dp).aspectRatio(2f/3f))
                            Column(Modifier.weight(1f)) {
                                Text(item.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                val det = details[item.movieId]
                                val metaLine = buildString {
                                    det?.releaseDate?.take(4)?.let { append(it) }
                                    det?.voteAverage?.let { rating ->
                                        if (isNotEmpty()) append(" • ")
                                        append("★ ")
                                        append("%.1f".format(rating))
                                    }
                                }
                                if (metaLine.isNotBlank()) {
                                    Spacer(Modifier.height(4.dp))
                                    Text(metaLine, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                item.overview?.let { Text(it, maxLines = 4, style = MaterialTheme.typography.bodyMedium) }
                                Spacer(Modifier.height(8.dp))
                                FilledTonalButton(onClick = {
                                    scope.launch {
                                        // Prefer exact TMDB watch page for the movie
                                        val tmdbLink = "https://www.themoviedb.org/movie/${item.movieId}/watch?locale=${country}"
                                        try {
                                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(tmdbLink))
                                            context.startActivity(intent)
                                            return@launch
                                        } catch (_: Exception) {}

                                        when (val res = vm.getWatchProviders(item.movieId, country)) {
                                            is com.cpen321.movietier.data.repository.Result.Success -> {
                                                val link = res.data.link
                                                val providers = buildList {
                                                    addAll(res.data.providers.flatrate)
                                                    addAll(res.data.providers.rent)
                                                    addAll(res.data.providers.buy)
                                                }.distinct()
                                                if (!link.isNullOrBlank()) {
                                                    try {
                                                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(link))
                                                        context.startActivity(intent)
                                                    } catch (e: Exception) {
                                                        snackbarHostState.showSnackbar("Open link failed. Available: ${providers.joinToString()}")
                                                    }
                                                } else if (providers.isNotEmpty()) {
                                                    snackbarHostState.showSnackbar("Available on: ${providers.joinToString()}")
                                                } else {
                                                    snackbarHostState.showSnackbar("No streaming info found")
                                                }
                                            }
                                            is com.cpen321.movietier.data.repository.Result.Error -> {
                                                snackbarHostState.showSnackbar(res.message ?: "Failed to load providers")
                                            }
                                            else -> {}
                                        }
                                    }
                                }, modifier = Modifier.fillMaxWidth()) {
                                    Text("Where to Watch")
                                }
                                Spacer(Modifier.height(8.dp))
                                Button(onClick = {
                                    vm.addToRanking(item)
                                }, modifier = Modifier.fillMaxWidth()) {
                                    Text("Add to Ranking")
                                }
                            }
                        }
                    }
                }
                if (ui.displayed.isEmpty()) {
                    item { Text("Your watchlist is empty", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
            }
        }

        // Comparison dialog
        if (compareState != null) {
            val state = compareState!!
            AlertDialog(
                onDismissRequest = { /* block dismiss during compare */ },
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
                                vm.choosePreferred(
                                    newMovie = state.newMovie,
                                    compareWith = state.compareWith,
                                    preferred = state.newMovie
                                )
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) { Text(state.newMovie.title) }
                        Button(
                            onClick = {
                                vm.choosePreferred(
                                    newMovie = state.newMovie,
                                    compareWith = state.compareWith,
                                    preferred = state.compareWith
                                )
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) { Text(state.compareWith.title) }
                    }
                },
                confirmButton = {},
                dismissButton = {}
            )
        }
    }

    // Delete confirmation dialog
    if (showDeleteDialog && itemToDelete != null) {
        AlertDialog(
            onDismissRequest = {
                showDeleteDialog = false
                itemToDelete = null
            },
            title = { Text("Remove from Watchlist") },
            text = { Text("Remove \"${itemToDelete?.title}\" from your watchlist?") },
            confirmButton = {
                Button(
                    onClick = {
                        itemToDelete?.let { vm.removeFromWatchlist(it.movieId) }
                        showDeleteDialog = false
                        itemToDelete = null
                        scope.launch {
                            snackbarHostState.showSnackbar("Removed from watchlist")
                        }
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Text("Remove")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showDeleteDialog = false
                        itemToDelete = null
                    }
                ) {
                    Text("Cancel")
                }
            }
        )
    }

    // Refresh watchlist when screen resumes to reflect changes from ranking actions
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                vm.load()
            }
        }
        val lifecycle = lifecycleOwner.lifecycle
        lifecycle.addObserver(observer)
        onDispose { lifecycle.removeObserver(observer) }
    }

    // Also refresh whenever navigating to this screen (handles bottom nav tab switching)
    LaunchedEffect(navController.currentBackStackEntry) {
        vm.load()
    }

    // Handle events (success/error messages)
    LaunchedEffect(Unit) {
        vm.events.collect { event ->
            when (event) {
                is com.cpen321.movietier.ui.viewmodels.FeedEvent.Message -> {
                    snackbarHostState.showSnackbar(event.text)
                }
                is com.cpen321.movietier.ui.viewmodels.FeedEvent.Error -> {
                    snackbarHostState.showSnackbar(event.text)
                }
            }
        }
    }
}
