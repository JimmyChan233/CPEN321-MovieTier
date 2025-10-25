package com.cpen321.movietier.ui.recommendation

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.res.painterResource
import androidx.compose.foundation.Image
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.font.FontWeight
import com.cpen321.movietier.R
import androidx.compose.foundation.layout.WindowInsets
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.ui.components.*
import com.cpen321.movietier.ui.components.YouTubePlayerDialog
import com.cpen321.movietier.ui.viewmodels.RecommendationViewModel
import com.cpen321.movietier.ui.viewmodels.RankingViewModel
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.launch
import android.content.Intent
import android.net.Uri
import com.cpen321.movietier.utils.LocationHelper
import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecommendationScreen(
    navController: NavController,
    recommendationViewModel: RecommendationViewModel = hiltViewModel(),
    rankingViewModel: RankingViewModel = hiltViewModel()
) {
    val uiState by recommendationViewModel.uiState.collectAsState()
    val compareState by rankingViewModel.compareState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var selectedMovie by remember { mutableStateOf<Movie?>(null) }
    var trailerKey by remember { mutableStateOf<String?>(null) }
    var showTrailerDialog by remember { mutableStateOf(false) }
    var trailerMovieTitle by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var country by remember { mutableStateOf("CA") }

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

    LaunchedEffect(Unit) {
        recommendationViewModel.events.collect { event ->
            when (event) {
                is com.cpen321.movietier.ui.viewmodels.FeedEvent.Message -> {
                    println("Snack: ${event.text}") // for debugging
                    snackbarHostState.showSnackbar(event.text)
                }
                is com.cpen321.movietier.ui.viewmodels.FeedEvent.Error -> {
                    // Close bottom sheet if open and show error
                    selectedMovie = null
                    snackbarHostState.showSnackbar(event.text)
                }
            }
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
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
                actions = {
                    IconButton(onClick = { recommendationViewModel.loadRecommendations() }) {
                        Icon(imageVector = Icons.Default.Refresh, contentDescription = "Refresh recommendations")
                    }
                },
                windowInsets = WindowInsets(0, 0, 0, 0)
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
                            text = if (uiState.isShowingTrending) "Trending Now" else "Recommended for You",
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
                            // Fetch trailer when movie is selected
                            LaunchedEffect(movie.id) {
                                val result = recommendationViewModel.getMovieVideos(movie.id)
                                trailerKey = when (result) {
                                    is com.cpen321.movietier.data.repository.Result.Success -> result.data?.key
                                    else -> null
                                }
                            }

                            MovieDetailBottomSheet(
                                movie = movie,
                                onAddToRanking = {
                                    rankingViewModel.addMovieFromSearch(movie)
                                    selectedMovie = null
                                },
                                onPlayTrailer = trailerKey?.let {
                                    {
                                        trailerMovieTitle = movie.title
                                        showTrailerDialog = true
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

                                        when (val res = recommendationViewModel.getWatchProviders(movie.id, country)) {
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
                                                        snackbarHostState.showSnackbar("Available on: ${providers.joinToString()}")
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
                                onAddToWatchlist = {
                                    recommendationViewModel.addToWatchlist(movie)
                                    // Close sheet so snackbar is visible immediately
                                    selectedMovie = null
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
                }
            }
        }
    }

    // Listen to ranking events
    LaunchedEffect(Unit) {
        rankingViewModel.events.collect { event ->
            when (event) {
                is com.cpen321.movietier.ui.viewmodels.RankingEvent.Message -> {
                    snackbarHostState.showSnackbar(event.text)
                }
            }
        }
    }
}

private enum class RecommendationState {
    LOADING, ERROR, EMPTY, CONTENT
}
