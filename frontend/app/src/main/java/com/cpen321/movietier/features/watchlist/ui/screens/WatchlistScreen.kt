package com.cpen321.movietier.features.watchlist.ui.screens

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.cpen321.movietier.shared.components.StarRating
import com.cpen321.movietier.features.watchlist.ui.viewmodel.WatchlistViewModel
import kotlinx.coroutines.launch
import androidx.compose.ui.platform.LocalContext
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.cpen321.movietier.core.util.LocationHelper
import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun WatchlistScreen(
    navController: NavController,
    vm: WatchlistViewModel = hiltViewModel()
) {
    val ui by vm.ui.collectAsState()
    val compareState by vm.compareState.collectAsState()
    val details by vm.details.collectAsState()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }
    val listState = rememberLazyListState()
    var country by remember { mutableStateOf("CA") }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var itemToDelete by remember { mutableStateOf<com.cpen321.movietier.data.model.WatchlistItem?>(null) }

    WSLocationHandler(context, scope) { country = it }
    WSSideEffects(navController, vm, snackbarHostState)

    Scaffold(
        topBar = { WSTopBar(navController, vm, scope, listState) },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        WSContent(
            ui = ui,
            details = details,
            country = country,
            padding = padding,
            listState = listState,
            vm = vm,
            context = context,
            scope = scope,
            snackbarHostState = snackbarHostState,
            onLongClick = { itemToDelete = it; showDeleteDialog = true }
        )
        WSComparisonDialog(compareState, vm)
        WSDeleteDialog(showDeleteDialog, itemToDelete, vm, context, scope, snackbarHostState, { showDeleteDialog = it }, { itemToDelete = it })
    }
}

@Composable
private fun WSLocationHandler(
    context: android.content.Context,
    scope: kotlinx.coroutines.CoroutineScope,
    onCountryChanged: (String) -> Unit
) {
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true ||
            permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true) {
            scope.launch { onCountryChanged(LocationHelper.getCountryCode(context)) }
        }
    }
    LaunchedEffect(Unit) {
        if (LocationHelper.hasLocationPermission(context)) {
            onCountryChanged(LocationHelper.getCountryCode(context))
        } else {
            locationPermissionLauncher.launch(LocationHelper.getLocationPermissions())
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WSTopBar(
    navController: NavController,
    vm: WatchlistViewModel,
    scope: kotlinx.coroutines.CoroutineScope,
    listState: LazyListState
) {
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
            WSTopBarSortMenu(sortMenu, vm, scope, listState) { sortMenu = it }
        }
    )
}

@Composable
private fun WSTopBarSortMenu(
    expanded: Boolean,
    vm: WatchlistViewModel,
    scope: kotlinx.coroutines.CoroutineScope,
    listState: LazyListState,
    onDismiss: (Boolean) -> Unit
) {
    DropdownMenu(expanded = expanded, onDismissRequest = { onDismiss(false) }) {
        DropdownMenuItem(text = { Text("Date Added (Newest)") }, onClick = {
            onDismiss(false)
            vm.setSort(com.cpen321.movietier.ui.viewmodels.WatchlistSort.DATE_DESC)
            scope.launch { listState.animateScrollToItem(0) }
        })
        DropdownMenuItem(text = { Text("Date Added (Oldest)") }, onClick = {
            onDismiss(false)
            vm.setSort(com.cpen321.movietier.ui.viewmodels.WatchlistSort.DATE_ASC)
            scope.launch { listState.animateScrollToItem(0) }
        })
        DropdownMenuItem(text = { Text("Rating (High → Low)") }, onClick = {
            onDismiss(false)
            vm.setSort(com.cpen321.movietier.ui.viewmodels.WatchlistSort.RATING_DESC)
            scope.launch { listState.animateScrollToItem(0) }
        })
        DropdownMenuItem(text = { Text("Rating (Low → High)") }, onClick = {
            onDismiss(false)
            vm.setSort(com.cpen321.movietier.ui.viewmodels.WatchlistSort.RATING_ASC)
            scope.launch { listState.animateScrollToItem(0) }
        })
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun WSContent(
    ui: com.cpen321.movietier.ui.viewmodels.WatchlistUiState,
    details: Map<Int, com.cpen321.movietier.data.model.Movie>,
    country: String,
    padding: PaddingValues,
    listState: LazyListState,
    vm: WatchlistViewModel,
    context: android.content.Context,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbarHostState: SnackbarHostState,
    onLongClick: (com.cpen321.movietier.data.model.WatchlistItem) -> Unit
) {

    if (ui.isLoading) {
        Box(Modifier.fillMaxSize().padding(padding)) { CircularProgressIndicator(Modifier.padding(24.dp)) }
    } else {
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(ui.displayed, key = { it.id }) { item ->
                WSWatchlistItemCard(item, details[item.movieId], country, vm, context, scope, snackbarHostState, onLongClick)
            }
            if (ui.displayed.isEmpty()) {
                item { Text("Your watchlist is empty", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun WSWatchlistItemCard(
    item: com.cpen321.movietier.data.model.WatchlistItem,
    details: com.cpen321.movietier.data.model.Movie?,
    country: String,
    vm: WatchlistViewModel,
    context: android.content.Context,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbarHostState: SnackbarHostState,
    onLongClick: (com.cpen321.movietier.data.model.WatchlistItem) -> Unit
) {
    Card(Modifier.fillMaxWidth().combinedClickable(onClick = {}, onLongClick = { onLongClick(item) })) {
        Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            AsyncImage(model = item.posterPath?.let { "https://image.tmdb.org/t/p/w185$it" }, contentDescription = item.title, modifier = Modifier.height(140.dp).aspectRatio(2f/3f))
            WSWatchlistItemInfo(item, details, country, vm, context, scope, snackbarHostState)
        }
    }
}

@Composable
private fun androidx.compose.foundation.layout.RowScope.WSWatchlistItemInfo(
    item: com.cpen321.movietier.data.model.WatchlistItem,
    details: com.cpen321.movietier.data.model.Movie?,
    country: String,
    vm: WatchlistViewModel,
    context: android.content.Context,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbarHostState: SnackbarHostState
) {
    Column(Modifier.weight(1f)) {
        Text(item.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        WSWatchlistItemMetadata(details)
        if (details != null) Spacer(Modifier.height(4.dp))
        item.overview?.let { Text(it, maxLines = 4, style = MaterialTheme.typography.bodyMedium) }
        Spacer(Modifier.height(8.dp))
        WSWatchlistItemActions(item, country, vm, context, scope, snackbarHostState)
    }
}

@Composable
private fun WSWatchlistItemMetadata(details: com.cpen321.movietier.data.model.Movie?) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
        details?.releaseDate?.take(4)?.let { year ->
            Text(text = year, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        details?.voteAverage?.let { rating -> StarRating(rating = rating, starSize = 14.dp) }
    }
}

@Composable
private fun WSWatchlistItemActions(
    item: com.cpen321.movietier.data.model.WatchlistItem,
    country: String,
    vm: WatchlistViewModel,
    context: android.content.Context,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbarHostState: SnackbarHostState
) {
    FilledTonalButton(onClick = {
        scope.launch {
            val tmdbLink = "https://www.themoviedb.org/movie/${item.movieId}/watch?locale=${country}"
            var tmdbOpened = false
            try { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(tmdbLink))); tmdbOpened = true } catch (_: Exception) {}
            if (!tmdbOpened) {
                when (val res = vm.getWatchProviders(item.movieId, country)) {
                    is com.cpen321.movietier.data.repository.Result.Success -> {
                        val providers = (res.data.providers.flatrate + res.data.providers.rent + res.data.providers.buy).distinct()
                        if (!res.data.link.isNullOrBlank()) {
                            try { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(res.data.link))) }
                            catch (e: ActivityNotFoundException) { snackbarHostState.showSnackbar("Open link failed. Available: ${providers.joinToString()}") }
                        } else if (providers.isNotEmpty()) { snackbarHostState.showSnackbar("Available on: ${providers.joinToString()}") }
                        else { snackbarHostState.showSnackbar("No streaming info found") }
                    }
                    is com.cpen321.movietier.data.repository.Result.Error -> { snackbarHostState.showSnackbar(res.message ?: "Failed to load providers") }
                    else -> {}
                }
            }
        }
    }, modifier = Modifier.fillMaxWidth()) { Text("Where to Watch") }
    Spacer(Modifier.height(8.dp))
    Button(onClick = { vm.addToRanking(item) }, modifier = Modifier.fillMaxWidth()) { Text("Add to Ranking") }
}

@Composable
private fun WSComparisonDialog(
    compareState: com.cpen321.movietier.ui.viewmodels.WatchlistCompareState?,
    vm: WatchlistViewModel
) {
    compareState?.let { state ->
        AlertDialog(
            onDismissRequest = {},
            title = { Text("Which movie do you prefer?") },
            text = {
                Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("Help us place '${state.newMovie.title}' in your rankings:", style = MaterialTheme.typography.bodyMedium)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        WSComparisonOption(state.newMovie, state, vm, Modifier.weight(1f))
                        WSComparisonOption(state.compareWith, state, vm, Modifier.weight(1f))
                    }
                }
            },
            confirmButton = {},
            dismissButton = {}
        )
    }
}

@Composable
private fun WSComparisonOption(
    movie: com.cpen321.movietier.data.model.Movie,
    state: com.cpen321.movietier.ui.viewmodels.WatchlistCompareState,
    vm: WatchlistViewModel,
    modifier: Modifier
) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        AsyncImage(
            model = movie.posterPath?.let { "https://image.tmdb.org/t/p/w342$it" },
            contentDescription = movie.title,
            modifier = Modifier.fillMaxWidth().aspectRatio(2f / 3f).clip(MaterialTheme.shapes.medium),
            contentScale = ContentScale.Crop
        )
        Button(
            onClick = { vm.choosePreferred(state.newMovie, state.compareWith, movie) },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(movie.title, maxLines = 2, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun WSDeleteDialog(
    showDeleteDialog: Boolean,
    itemToDelete: com.cpen321.movietier.data.model.WatchlistItem?,
    vm: WatchlistViewModel,
    context: android.content.Context,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbarHostState: SnackbarHostState,
    onShowDialogChange: (Boolean) -> Unit,
    onItemToDeleteChange: (com.cpen321.movietier.data.model.WatchlistItem?) -> Unit
) {
    if (showDeleteDialog && itemToDelete != null) {
        AlertDialog(
            onDismissRequest = { onShowDialogChange(false); onItemToDeleteChange(null) },
            title = { Text("Remove from Watchlist") },
            text = { Text("Remove \"${itemToDelete.title}\" from your watchlist?") },
            confirmButton = {
                Button(
                    onClick = {
                        itemToDelete.let { vm.removeFromWatchlist(it.movieId) }
                        onShowDialogChange(false)
                        onItemToDeleteChange(null)
                        scope.launch { snackbarHostState.showSnackbar("Removed from watchlist") }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) { Text("Remove") }
            },
            dismissButton = {
                TextButton(onClick = { onShowDialogChange(false); onItemToDeleteChange(null) }) { Text("Cancel") }
            }
        )
    }
}

@Composable
private fun WSSideEffects(
    navController: NavController,
    vm: WatchlistViewModel,
    snackbarHostState: SnackbarHostState
) {
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) vm.load()
        }
        val lifecycle = lifecycleOwner.lifecycle
        lifecycle.addObserver(observer)
        onDispose { lifecycle.removeObserver(observer) }
    }
    LaunchedEffect(navController.currentBackStackEntry) { vm.load() }
    LaunchedEffect(Unit) {
        vm.events.collect { event ->
            when (event) {
                is com.cpen321.movietier.ui.viewmodels.FeedEvent.Message -> snackbarHostState.showSnackbar(event.text)
                is com.cpen321.movietier.ui.viewmodels.FeedEvent.Error -> snackbarHostState.showSnackbar(event.text)
            }
        }
    }
}
