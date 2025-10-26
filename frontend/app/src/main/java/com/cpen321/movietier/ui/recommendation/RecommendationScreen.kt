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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import coil.compose.AsyncImage
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
import com.cpen321.movietier.data.local.MovieQuoteProvider
import java.time.LocalDate

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
    var featuredMovieOffset by remember { mutableStateOf(0) }
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
                    val dayOfYear = remember { LocalDate.now().dayOfYear }
                    val requestedEntry = remember(dayOfYear, featuredMovieOffset) {
                        MovieQuoteProvider.entryForIndex(dayOfYear + featuredMovieOffset)
                    }
                    var currentEntry by remember { mutableStateOf(requestedEntry) }
                    var currentMovie by remember { mutableStateOf<Movie?>(null) }
                    var currentQuote by remember { mutableStateOf("") }
                    var isLoadingQuote by remember { mutableStateOf(false) }

                    LaunchedEffect(requestedEntry, uiState.recommendations) {
                        val entry = requestedEntry
                        if (entry.title.isBlank()) {
                            uiState.recommendations.firstOrNull()?.let { fallback ->
                                currentEntry = entry
                                currentMovie = fallback
                            }
                            return@LaunchedEffect
                        }

                        val directMatch = uiState.recommendations.firstOrNull {
                            MovieQuoteProvider.matchesTitle(it.title, entry.title)
                        }
                        val searched = directMatch ?: recommendationViewModel.findMovieByTitle(entry.title)
                        val fallback = if (searched == null && uiState.recommendations.isNotEmpty()) {
                            val size = uiState.recommendations.size
                            val safeIndex = ((featuredMovieOffset % size) + size) % size
                            uiState.recommendations[safeIndex]
                        } else null
                        val resolved = searched ?: fallback
                        if (resolved != null) {
                            currentEntry = entry
                            currentMovie = resolved
                        }
                    }

                    // Fetch quote asynchronously when movie changes
                    LaunchedEffect(currentMovie) {
                        currentMovie?.let { movie ->
                            isLoadingQuote = true
                            val quote = recommendationViewModel.getQuote(
                                title = movie.title,
                                year = movie.releaseDate?.take(4),
                                rating = movie.voteAverage
                            )
                            currentQuote = quote
                            isLoadingQuote = false
                        }
                    }

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                    ) {
                        LazyColumn(
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            // Featured movie card
                            currentMovie?.let { movie ->
                                item {
                                    FeaturedMovieCard(
                                        movie = movie,
                                        quote = currentQuote.ifEmpty { if (isLoadingQuote) "Loading..." else currentEntry.quote },
                                        onClick = { selectedMovie = movie },
                                        onRefresh = { featuredMovieOffset++ },
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                }
                            }

                            // Section title
                            item {
                                Text(
                                    text = if (uiState.isShowingTrending) "Trending Now" else "Recommended for You",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(top = 8.dp)
                                )
                            }

                            // Recommendation cards
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
                                    // Sheet will close when success/error message is received
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
}

private enum class RecommendationState {
    LOADING, ERROR, EMPTY, CONTENT
}
