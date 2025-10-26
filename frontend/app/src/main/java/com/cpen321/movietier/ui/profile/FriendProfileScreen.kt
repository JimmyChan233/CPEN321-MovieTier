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
import com.cpen321.movietier.ui.components.YouTubePlayerDialog
import com.cpen321.movietier.ui.components.StarRating
import androidx.compose.ui.draw.clip

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

    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var country by remember { mutableStateOf("CA") }
    var selectedMovie by remember { mutableStateOf<Movie?>(null) }
    var trailerKey by remember { mutableStateOf<String?>(null) }
    var showTrailerDialog by remember { mutableStateOf(false) }
    var trailerMovieTitle by remember { mutableStateOf("") }
    var movieDetailsMap by remember { mutableStateOf<Map<Int, Movie>>(emptyMap()) }

    // Fetch movie details for all watchlist items
    LaunchedEffect(ui.watchlist) {
        ui.watchlist.forEach { item ->
            if (!movieDetailsMap.containsKey(item.movieId)) {
                val result = vm.getMovieDetails(item.movieId)
                if (result is com.cpen321.movietier.data.repository.Result.Success) {
                    movieDetailsMap = movieDetailsMap + (item.movieId to result.data)
                }
            }
        }
    }

    // Request location permission and get country code
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true ||
            permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true) {
            scope.launch {
                country = LocationHelper.getCountryCode(context)
            }
        }
    }

    LaunchedEffect(Unit) {
        if (LocationHelper.hasLocationPermission(context)) {
            country = LocationHelper.getCountryCode(context)
        } else {
            locationPermissionLauncher.launch(LocationHelper.getLocationPermissions())
        }
    }

    // Listen to ranking events
    LaunchedEffect(Unit) {
        rankingViewModel.events.collect { event ->
            when (event) {
                is com.cpen321.movietier.ui.viewmodels.RankingEvent.Message -> {
                    // Close bottom sheet so message is visible at top
                    selectedMovie = null
                    snackbarHostState.showSnackbar(event.text)
                }
                is com.cpen321.movietier.ui.viewmodels.RankingEvent.Error -> {
                    // Close bottom sheet so error message is visible at top
                    selectedMovie = null
                    snackbarHostState.showSnackbar(event.text)
                }
            }
        }
    }

    Scaffold(topBar = {
        CenterAlignedTopAppBar(
            title = {
                Text(
                    text = ui.userName ?: "Profile",
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            },
            navigationIcon = {
                IconButton(onClick = { navController.navigateUp() }) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
            },
            windowInsets = WindowInsets(0, 0, 0, 0)
        )
    }, snackbarHost = { SnackbarHost(snackbarHostState) }) { padding ->
        Box(Modifier.fillMaxSize()) {
            Column(Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
                // Header
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
                        WatchItemCard(
                            item = item,
                            releaseDate = movieDetails?.releaseDate,
                            voteAverage = movieDetails?.voteAverage,
                            onClick = {
                                // Convert WatchlistItem to Movie for the bottom sheet
                                selectedMovie = movieDetails ?: Movie(
                                    id = item.movieId,
                                    title = item.title,
                                    overview = item.overview,
                                    posterPath = item.posterPath,
                                    releaseDate = null as String?,
                                    voteAverage = null as Double?
                                )
                            }
                        )
                    }
                }
            }

        // Movie Detail Bottom Sheet
        selectedMovie?.let { movie ->
            // Fetch trailer when movie is selected
            LaunchedEffect(movie.id) {
                val result = vm.getMovieVideos(movie.id)
                trailerKey = when (result) {
                    is com.cpen321.movietier.data.repository.Result.Success -> result.data?.key
                    else -> null
                }
            }

            MovieDetailBottomSheet(
                movie = movie,
                onAddToRanking = {
                    rankingViewModel.addMovieFromSearch(movie)
                    // Sheet will close when success/error message is received
                },
                onAddToWatchlist = {
                    scope.launch {
                        // Close the bottom sheet first so snackbar is visible at top
                        selectedMovie = null

                        when (val res = vm.addToMyWatchlist(movie.id, movie.title, movie.overview, movie.posterPath)) {
                            is com.cpen321.movietier.data.repository.Result.Success -> {
                                val result = snackbarHostState.showSnackbar(
                                    message = "Added to my watchlist",
                                    actionLabel = "View",
                                    duration = SnackbarDuration.Short
                                )
                                if (result == SnackbarResult.ActionPerformed) {
                                    navController.navigate(NavRoutes.WATCHLIST)
                                }
                            }
                            is com.cpen321.movietier.data.repository.Result.Error -> {
                                val msg = if (res.message?.contains("already", ignoreCase = true) == true) {
                                    "Already in Watchlist"
                                } else {
                                    res.message ?: "Failed to add to watchlist"
                                }
                                snackbarHostState.showSnackbar(
                                    message = msg,
                                    duration = SnackbarDuration.Short
                                )
                            }
                            else -> {}
                        }
                    }
                },
                onOpenWhereToWatch = {
                    scope.launch {
                        // Prefer exact TMDB watch page for the movie
                        val tmdbLink = "https://www.themoviedb.org/movie/${movie.id}/watch?locale=${country}"
                        try {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(tmdbLink))
                            context.startActivity(intent)
                            return@launch
                        } catch (_: Exception) {}

                        when (val res = vm.getWatchProviders(movie.id, country)) {
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
                },
                onPlayTrailer = trailerKey?.let {
                    {
                        trailerMovieTitle = movie.title
                        showTrailerDialog = true
                    }
                },
                onDismissRequest = {
                    selectedMovie = null
                    trailerKey = null
                }
            )
        }

        // Trailer Player Dialog
        if (showTrailerDialog && trailerKey != null) {
            YouTubePlayerDialog(
                videoKey = trailerKey!!,
                movieTitle = trailerMovieTitle,
                onDismiss = {
                    showTrailerDialog = false
                }
            )
        }

            // Comparison Dialog
            if (compareState != null) {
                val state = compareState!!
                AlertDialog(
                    onDismissRequest = { /* Disabled during ranking */ },
                    title = { Text("Which movie do you prefer?") },
                    text = {
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            Text(
                                "Help us place '${state.newMovie.title}' in your rankings:",
                                style = MaterialTheme.typography.bodyMedium
                            )

                            // Side-by-side posters with clickable movie names
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                // First movie
                                Column(
                                    modifier = Modifier.weight(1f),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    AsyncImage(
                                        model = state.newMovie.posterPath?.let { "https://image.tmdb.org/t/p/w342$it" },
                                        contentDescription = state.newMovie.title,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .aspectRatio(2f / 3f)
                                            .clip(MaterialTheme.shapes.medium),
                                        contentScale = ContentScale.Crop
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
                                        Text(
                                            state.newMovie.title,
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis,
                                            style = MaterialTheme.typography.bodySmall
                                        )
                                    }
                                }

                                // Second movie
                                Column(
                                    modifier = Modifier.weight(1f),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    AsyncImage(
                                        model = state.compareWith.posterPath?.let { "https://image.tmdb.org/t/p/w342$it" },
                                        contentDescription = state.compareWith.title,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .aspectRatio(2f / 3f)
                                            .clip(MaterialTheme.shapes.medium),
                                        contentScale = ContentScale.Crop
                                    )
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
                                        Text(
                                            state.compareWith.title,
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis,
                                            style = MaterialTheme.typography.bodySmall
                                        )
                                    }
                                }
                            }
                        }
                    },
                    confirmButton = {},
                    dismissButton = {}
                )
            }
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
            // Poster image
            AsyncImage(
                model = item.posterPath?.let { "https://image.tmdb.org/t/p/w342$it" },
                contentDescription = "Poster: ${item.title}",
                modifier = Modifier
                    .width(90.dp)
                    .aspectRatio(2f / 3f),
                contentScale = ContentScale.Crop
            )

            // Title + overview + year/rating
            Column(
                modifier = Modifier.weight(1f)
            ) {
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

                // Year and rating on single line (consistent with Ranking/Watchlist format)
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
        }
    }
}
