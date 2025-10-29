package com.cpen321.movietier.ui.profile

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.cpen321.movietier.ui.components.Avatar
import com.cpen321.movietier.data.model.WatchlistItem
import com.cpen321.movietier.ui.viewmodels.FriendProfileViewModel
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.launch
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import androidx.compose.material3.SnackbarResult
import com.cpen321.movietier.ui.navigation.NavRoutes
import com.cpen321.movietier.utils.LocationHelper
import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.ui.Alignment
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.ui.components.MovieDetailBottomSheet
import com.cpen321.movietier.ui.components.MovieDetailActions
import com.cpen321.movietier.ui.components.YouTubePlayerDialog
import com.cpen321.movietier.ui.components.StarRating
import androidx.compose.ui.draw.clip
import com.cpen321.movietier.ui.common.CommonContext
import com.cpen321.movietier.ui.common.MovieDialogState
import com.cpen321.movietier.ui.common.MovieDialogCallbacks

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendProfileScreen(
    navController: NavController,
    userId: String,
    vm: FriendProfileViewModel = hiltViewModel(),
    rankingViewModel: com.cpen321.movietier.ui.viewmodels.RankingViewModel = hiltViewModel()
) {
    val ui by vm.uiState.collectAsState()
    val compareState by rankingViewModel.compareState.collectAsState()
    LaunchedEffect(userId) { vm.load(userId) }

    val commonContext = CommonContext(
        context = LocalContext.current,
        scope = rememberCoroutineScope(),
        snackbarHostState = remember { SnackbarHostState() }
    )
    var country by remember { mutableStateOf("CA") }
    var selectedMovie by remember { mutableStateOf<Movie?>(null) }
    var dialogState by remember { mutableStateOf(MovieDialogState()) }
    var movieDetailsMap by remember { mutableStateOf<Map<Int, Movie>>(emptyMap()) }

    val dialogCallbacks = remember {
        MovieDialogCallbacks(
            onTrailerKeyUpdate = { dialogState = dialogState.copy(trailerKey = it) },
            onDismissMovie = { selectedMovie = null; dialogState = dialogState.copy(trailerKey = null) },
            onShowTrailer = { title -> dialogState = dialogState.copy(trailerMovieTitle = title, showTrailerDialog = true) },
            onDismissTrailer = { dialogState = dialogState.copy(showTrailerDialog = it) }
        )
    }

    FPSideEffects(userId, ui.watchlist, commonContext, vm, rankingViewModel, movieDetailsMap, { country = it }, { movieDetailsMap = it }, { selectedMovie = null })

    Scaffold(
        topBar = { FPTopBar(ui.userName, navController) },
        snackbarHost = { SnackbarHost(commonContext.snackbarHostState) }
    ) { padding ->
        Box(Modifier.fillMaxSize()) {
            FPContent(ui, movieDetailsMap, padding) { movie -> selectedMovie = movie }
            FPDialogs(selectedMovie, dialogState, compareState, country, vm, rankingViewModel, navController, commonContext, dialogCallbacks)
        }
    }
}

@Composable
private fun WatchItemCard(
    item: WatchlistItem,
    releaseDate: String?,
    voteAverage: Double?,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            WatchItemPoster(item)
            WatchItemInfo(item, releaseDate, voteAverage)
        }
    }
}

@Composable
private fun WatchItemPoster(item: WatchlistItem) {
    AsyncImage(
        model = item.posterPath?.let { "https://image.tmdb.org/t/p/w342$it" },
        contentDescription = "Poster: ${item.title}",
        modifier = Modifier
            .width(90.dp)
            .aspectRatio(2f / 3f),
        contentScale = ContentScale.Crop
    )
}

@Composable
private fun androidx.compose.foundation.layout.RowScope.WatchItemInfo(
    item: WatchlistItem,
    releaseDate: String?,
    voteAverage: Double?
) {
    Column(modifier = Modifier.weight(1f)) {
        Text(
            text = item.title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )

        Spacer(Modifier.height(6.dp))

        item.overview?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )
        }

        Spacer(Modifier.height(8.dp))

        WatchItemMetadata(releaseDate, voteAverage)
    }
}

@Composable
private fun WatchItemMetadata(
    releaseDate: String?,
    voteAverage: Double?
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        releaseDate?.take(4)?.let { year ->
            Text(
                text = year,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        voteAverage?.let { rating ->
            StarRating(rating = rating, starSize = 14.dp)
        }
    }
}

@Composable
private fun FPSideEffects(
    userId: String,
    watchlist: List<WatchlistItem>,
    commonContext: CommonContext,
    vm: FriendProfileViewModel,
    rankingViewModel: com.cpen321.movietier.ui.viewmodels.RankingViewModel,
    movieDetailsMap: Map<Int, Movie>,
    onCountryChanged: (String) -> Unit,
    onMovieDetailsUpdated: (Map<Int, Movie>) -> Unit,
    onCloseSheet: () -> Unit
) {
    LaunchedEffect(userId) { vm.load(userId) }

    LaunchedEffect(watchlist) {
        watchlist.forEach { item ->
            if (!movieDetailsMap.containsKey(item.movieId)) {
                val result = vm.getMovieDetails(item.movieId)
                if (result is com.cpen321.movietier.data.repository.Result.Success) {
                    onMovieDetailsUpdated(movieDetailsMap + (item.movieId to result.data))
                }
            }
        }
    }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true ||
            permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true) {
            commonContext.scope.launch { onCountryChanged(LocationHelper.getCountryCode(commonContext.context)) }
        }
    }

    LaunchedEffect(Unit) {
        if (LocationHelper.hasLocationPermission(commonContext.context)) {
            onCountryChanged(LocationHelper.getCountryCode(commonContext.context))
        } else {
            locationPermissionLauncher.launch(LocationHelper.getLocationPermissions())
        }
    }

    LaunchedEffect(Unit) {
        rankingViewModel.events.collect { event ->
            when (event) {
                is com.cpen321.movietier.ui.viewmodels.RankingEvent.Message -> {
                    onCloseSheet()
                    commonContext.snackbarHostState.showSnackbar(event.text)
                }
                is com.cpen321.movietier.ui.viewmodels.RankingEvent.Error -> {
                    onCloseSheet()
                    commonContext.snackbarHostState.showSnackbar(event.text)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FPTopBar(userName: String?, navController: NavController) {
    CenterAlignedTopAppBar(
        title = { Text(userName ?: "Profile", maxLines = 1, overflow = TextOverflow.Ellipsis) },
        navigationIcon = {
            IconButton(onClick = { navController.navigateUp() }) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            }
        },
        windowInsets = WindowInsets(0, 0, 0, 0)
    )
}

@Composable
private fun FPContent(
    ui: com.cpen321.movietier.ui.viewmodels.FriendProfileUi,
    movieDetailsMap: Map<Int, Movie>,
    padding: PaddingValues,
    onMovieSelect: (Movie) -> Unit
) {
    Column(Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Avatar(imageUrl = null, name = ui.userName ?: "", size = 64.dp)
            Column(Modifier.weight(1f)) {
                Text(ui.userName ?: "", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text(ui.userEmail ?: "", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Spacer(Modifier.height(16.dp))
        Text("Watchlist", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(8.dp))
        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(ui.watchlist, key = { it.id }) { item ->
                val movieDetails = movieDetailsMap[item.movieId]
                WatchItemCard(item, movieDetails?.releaseDate, movieDetails?.voteAverage) {
                    onMovieSelect(movieDetails ?: Movie(item.movieId, item.title, item.overview, item.posterPath, null, null))
                }
            }
        }
    }
}

@Composable
private fun FPDialogs(
    selectedMovie: Movie?,
    dialogState: MovieDialogState,
    compareState: com.cpen321.movietier.ui.viewmodels.CompareUiState?,
    country: String,
    vm: FriendProfileViewModel,
    rankingViewModel: com.cpen321.movietier.ui.viewmodels.RankingViewModel,
    navController: NavController,
    commonContext: CommonContext,
    callbacks: MovieDialogCallbacks
) {
    selectedMovie?.let { movie ->
        LaunchedEffect(movie.id) {
            val result = vm.getMovieVideos(movie.id)
            callbacks.onTrailerKeyUpdate(when (result) {
                is com.cpen321.movietier.data.repository.Result.Success -> result.data?.key
                else -> null
            })
        }
        MovieDetailBottomSheet(
            movie = movie,
            actions = MovieDetailActions(
                onAddToRanking = { rankingViewModel.addMovieFromSearch(movie) },
                onAddToWatchlist = {
                    commonContext.scope.launch {
                        callbacks.onDismissMovie()
                        when (val res = vm.addToMyWatchlist(movie.id, movie.title, movie.overview, movie.posterPath)) {
                            is com.cpen321.movietier.data.repository.Result.Success -> {
                                val result = commonContext.snackbarHostState.showSnackbar("Added to my watchlist", "View", false, SnackbarDuration.Short)
                                if (result == SnackbarResult.ActionPerformed) { navController.navigate(NavRoutes.WATCHLIST) }
                            }
                            is com.cpen321.movietier.data.repository.Result.Error -> {
                                val msg = if (res.message?.contains("already", ignoreCase = true) == true) "Already in Watchlist" else res.message ?: "Already in Watchlist"
                                commonContext.snackbarHostState.showSnackbar(msg, null, false, SnackbarDuration.Short)
                            }
                            else -> {}
                        }
                    }
                },
                onOpenWhereToWatch = {
                    commonContext.scope.launch {
                        val tmdbLink = "https://www.themoviedb.org/movie/${movie.id}/watch?locale=${country}"
                        var tmdbOpened = false
                        try { commonContext.context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(tmdbLink))); tmdbOpened = true } catch (_: Exception) {}
                        if (!tmdbOpened) {
                            when (val res = vm.getWatchProviders(movie.id, country)) {
                                is com.cpen321.movietier.data.repository.Result.Success -> {
                                    val link = res.data.link
                                    val providers = (res.data.providers.flatrate + res.data.providers.rent + res.data.providers.buy).distinct()
                                    if (!link.isNullOrBlank()) {
                                        try { commonContext.context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(link))) }
                                        catch (e: ActivityNotFoundException) { commonContext.snackbarHostState.showSnackbar("Open link failed. Available: ${providers.joinToString()}") }
                                    } else if (providers.isNotEmpty()) { commonContext.snackbarHostState.showSnackbar("Available on: ${providers.joinToString()}") }
                                    else { commonContext.snackbarHostState.showSnackbar("No streaming info found") }
                                }
                                is com.cpen321.movietier.data.repository.Result.Error -> { commonContext.snackbarHostState.showSnackbar(res.message ?: "Failed to load providers") }
                                else -> {}
                            }
                        }
                    }
                },
                onPlayTrailer = dialogState.trailerKey?.let { { callbacks.onShowTrailer(movie.title) } },
                onDismissRequest = callbacks.onDismissMovie
            )
        )
    }
    if (dialogState.showTrailerDialog && dialogState.trailerKey != null) {
        YouTubePlayerDialog(dialogState.trailerKey!!, dialogState.trailerMovieTitle) { callbacks.onDismissTrailer(false) }
    }
    if (compareState != null) {
        AlertDialog(
            onDismissRequest = {},
            title = { Text("Which movie do you prefer?") },
            text = {
                Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("Help us place '${compareState.newMovie.title}' in your rankings:", style = MaterialTheme.typography.bodyMedium)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        FPComparisonOption(compareState.newMovie, compareState, rankingViewModel, Modifier.weight(1f))
                        FPComparisonOption(compareState.compareWith, compareState, rankingViewModel, Modifier.weight(1f))
                    }
                }
            },
            confirmButton = {},
            dismissButton = {}
        )
    }
}

@Composable
private fun FPComparisonOption(
    movie: Movie,
    compareState: com.cpen321.movietier.ui.viewmodels.CompareUiState,
    rankingViewModel: com.cpen321.movietier.ui.viewmodels.RankingViewModel,
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
            onClick = { rankingViewModel.compareMovies(compareState.newMovie, compareState.compareWith, movie) },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(movie.title, maxLines = 2, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodySmall)
        }
    }
}
