package com.cpen321.movietier.ui.recommendation.screen

import androidx.compose.animation.Crossfade
import androidx.annotation.VisibleForTesting
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
import com.cpen321.movietier.ui.common.components.YouTubePlayerDialog
import com.cpen321.movietier.ui.common.components.MovieDetailActions
import com.cpen321.movietier.ui.recommendation.viewmodel.RecommendationViewModel
import com.cpen321.movietier.ui.movie.viewmodel.RankingViewModel
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.launch
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import com.cpen321.movietier.utils.LocationHelper
import android.Manifest
import android.content.Context
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import com.cpen321.movietier.data.repository.Result
import com.cpen321.movietier.ui.common.components.EmptyState
import com.cpen321.movietier.ui.common.components.ErrorState
import com.cpen321.movietier.ui.common.components.LoadingState
import com.cpen321.movietier.ui.common.components.MovieDetailBottomSheet
import java.time.LocalDate
import com.cpen321.movietier.ui.common.model.CommonContext
import com.cpen321.movietier.ui.common.model.MovieDialogState
import com.cpen321.movietier.ui.common.model.MovieDialogCallbacks
import com.cpen321.movietier.ui.recommendation.model.RecommendationViewModels
import com.cpen321.movietier.ui.feed.viewmodel.FeedEvent
import com.cpen321.movietier.ui.recommendation.components.RecommendationCard
import com.cpen321.movietier.ui.movie.viewmodel.CompareUiState
import com.cpen321.movietier.ui.movie.viewmodel.RankingEvent
import com.cpen321.movietier.ui.recommendation.components.FeaturedMovieCard
import com.cpen321.movietier.ui.recommendation.viewmodel.RecommendationUiState
import kotlinx.coroutines.CoroutineScope

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecommendationScreen(
    navController: NavController,
    recommendationViewModel: RecommendationViewModel = hiltViewModel(),
    rankingViewModel: RankingViewModel = hiltViewModel()
) {
    val uiState by recommendationViewModel.uiState.collectAsState()
    val compareState by rankingViewModel.compareState.collectAsState()
    val commonContext = CommonContext(
        context = LocalContext.current,
        scope = rememberCoroutineScope(),
        snackbarHostState = remember { SnackbarHostState() }
    )
    var selectedMovie by remember { mutableStateOf<Movie?>(null) }
    var dialogState by remember { mutableStateOf(MovieDialogState()) }
    var featuredMovieOffset by remember { mutableStateOf(0) }
    var country by remember { mutableStateOf("CA") }

    val dialogCallbacks = remember {
        MovieDialogCallbacks(
            onTrailerKeyUpdate = { dialogState = dialogState.copy(trailerKey = it) },
            onDismissMovie = { selectedMovie = null; dialogState = dialogState.copy(trailerKey = null) },
            onShowTrailer = { title -> dialogState = dialogState.copy(trailerMovieTitle = title, showTrailerDialog = true) },
            onDismissTrailer = { dialogState = dialogState.copy(showTrailerDialog = it) }
        )
    }

    RSLocationHandler(commonContext.context, commonContext.scope) { country = it }
    RSSideEffects(recommendationViewModel, rankingViewModel, commonContext.snackbarHostState, { selectedMovie = null })

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(commonContext.snackbarHostState) },
        topBar = { RSTopBar(recommendationViewModel) }
    ) { padding ->
        RSContent(uiState, padding, featuredMovieOffset, recommendationViewModel, { featuredMovieOffset++ }, { selectedMovie = it })
        RSDialogs(
            selectedMovie = selectedMovie,
            dialogState = dialogState,
            compareState = compareState,
            country = country,
            viewModels = RecommendationViewModels(
                recommendationViewModel = recommendationViewModel,
                rankingViewModel = rankingViewModel
            ),
            commonContext = commonContext,
            callbacks = dialogCallbacks
        )
    }
}

@Composable
private fun RSLocationHandler(
    context: Context,
    scope: CoroutineScope,
    onCountryChanged: (String) -> Unit
) {
    var hasRequestedLocationPermission by remember { mutableStateOf(false) }
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true ||
            permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true) {
            scope.launch { onCountryChanged(LocationHelper.getCountryCode(context)) }
        }
    }
    LaunchedEffect(Unit) {
        if (!hasRequestedLocationPermission) {
            hasRequestedLocationPermission = true
            if (LocationHelper.hasLocationPermission(context)) {
                onCountryChanged(LocationHelper.getCountryCode(context))
            } else {
                locationPermissionLauncher.launch(LocationHelper.getLocationPermissions())
            }
        }
    }
}

@Composable
private fun RSSideEffects(
    recommendationViewModel: RecommendationViewModel,
    rankingViewModel: RankingViewModel,
    snackbarHostState: SnackbarHostState,
    onCloseSheet: () -> Unit
) {
    LaunchedEffect(Unit) {
        recommendationViewModel.events.collect { event ->
            when (event) {
                is FeedEvent.Message -> snackbarHostState.showSnackbar(event.text)
                is FeedEvent.Error -> { onCloseSheet(); snackbarHostState.showSnackbar(event.text) }
            }
        }
    }
    LaunchedEffect(Unit) {
        rankingViewModel.events.collect { event ->
            when (event) {
                is RankingEvent.Message -> { onCloseSheet(); snackbarHostState.showSnackbar(event.text) }
                is RankingEvent.Error -> { onCloseSheet(); snackbarHostState.showSnackbar(event.text) }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RSTopBar(recommendationViewModel: RecommendationViewModel) {
    TopAppBar(
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Image(painter = painterResource(id = R.drawable.in_app_icon), contentDescription = "MovieTier", modifier = Modifier.size(32.dp))
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

@Composable
@VisibleForTesting
fun RSContent(
    uiState: RecommendationUiState,
    padding: PaddingValues,
    featuredMovieOffset: Int,
    recommendationViewModel: RecommendationViewModel,
    onRefreshFeatured: () -> Unit,
    onMovieSelect: (Movie) -> Unit
) {
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
            RecommendationState.LOADING -> LoadingState(
                modifier = Modifier.fillMaxSize().padding(padding),
                hint = "Finding recommendations..."
            )
            RecommendationState.ERROR -> ErrorState(
                message = uiState.errorMessage ?: "Failed to load recommendations",
                onRetry = { recommendationViewModel.loadRecommendations() },
                modifier = Modifier.fillMaxSize().padding(padding)
            )
            RecommendationState.EMPTY -> EmptyState(
                icon = Icons.Default.Favorite,
                title = "No recommendations yet",
                message = "Rank some movies to get personalized suggestions",
                modifier = Modifier.fillMaxSize().padding(padding)
            )
            RecommendationState.CONTENT -> RSContentList(uiState, padding, featuredMovieOffset, recommendationViewModel, onRefreshFeatured, onMovieSelect)
        }
    }
}

@Composable
private fun RSContentList(
    uiState: RecommendationUiState,
    padding: PaddingValues,
    featuredMovieOffset: Int,
    recommendationViewModel: RecommendationViewModel,
    onRefreshFeatured: () -> Unit,
    onMovieSelect: (Movie) -> Unit
) {
    val dayOfYear = remember { LocalDate.now().dayOfYear }
    var currentMovie by remember { mutableStateOf<Movie?>(null) }
    var currentQuote by remember { mutableStateOf("") }
    var isLoadingQuote by remember { mutableStateOf(false) }

    LaunchedEffect(dayOfYear, featuredMovieOffset, uiState.trendingMovies) {
        if (uiState.trendingMovies.isNotEmpty()) {
            val size = uiState.trendingMovies.size
            val index = ((dayOfYear + featuredMovieOffset) % size + size) % size
            currentMovie = uiState.trendingMovies[index]
            currentQuote = ""
        }
    }

    LaunchedEffect(currentMovie) {
        currentMovie?.let { movie ->
            isLoadingQuote = true
            currentQuote = recommendationViewModel.getQuote(movie.title, movie.releaseDate?.take(4), movie.voteAverage)
            isLoadingQuote = false
        }
    }

    Column(Modifier.fillMaxSize().padding(padding)) {
        LazyColumn(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            currentMovie?.let { movie ->
                item {
                    FeaturedMovieCard(
                        movie,
                        currentQuote,
                        { onMovieSelect(movie) },
                        onRefreshFeatured,
                        Modifier.fillMaxWidth(),
                        isLoadingQuote
                    )
                }
            }
            item {
                Text(
                    text = if (uiState.isShowingTrending) "Trending Now" else "Recommended for You",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
            items(uiState.recommendations, key = { it.id }) { movie ->
                RecommendationCard(movie, { onMovieSelect(movie) }, Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
private fun RSDialogs(
    selectedMovie: Movie?,
    dialogState: MovieDialogState,
    compareState: CompareUiState?,
    country: String,
    viewModels: RecommendationViewModels,
    commonContext: CommonContext,
    callbacks: MovieDialogCallbacks
) {
    val recommendationViewModel = viewModels.recommendationViewModel
    val rankingViewModel = viewModels.rankingViewModel

    selectedMovie?.let { movie ->
        LaunchedEffect(movie.id) {
            val result = recommendationViewModel.getMovieVideos(movie.id)
            callbacks.onTrailerKeyUpdate(when (result) {
                is Result.Success -> result.data?.key
                else -> null
            })
        }
        val actions = remember(movie, dialogState.trailerKey, country) {
            buildMovieActions(
                movie = movie,
                dialogState = dialogState,
                country = country,
                recommendationViewModel = recommendationViewModel,
                rankingViewModel = rankingViewModel,
                commonContext = commonContext,
                callbacks = callbacks
            )
        }
        MovieDetailBottomSheet(movie = movie, actions = actions)
    }
    if (dialogState.showTrailerDialog && dialogState.trailerKey != null) {
        YouTubePlayerDialog(dialogState.trailerKey!!, dialogState.trailerMovieTitle) { callbacks.onDismissTrailer(false) }
    }
    if (compareState != null) {
        RSComparisonDialog(compareState, rankingViewModel)
    }
}

private fun buildMovieActions(
    movie: Movie,
    dialogState: MovieDialogState,
    country: String,
    recommendationViewModel: RecommendationViewModel,
    rankingViewModel: RankingViewModel,
    commonContext: CommonContext,
    callbacks: MovieDialogCallbacks
): MovieDetailActions {
    return MovieDetailActions(
        onAddToRanking = { rankingViewModel.addMovieFromSearch(movie) },
        onPlayTrailer = dialogState.trailerKey?.let { { callbacks.onShowTrailer(movie.title) } },
        onOpenWhereToWatch = {
            launchWatchProviders(
                movie = movie,
                country = country,
                recommendationViewModel = recommendationViewModel,
                commonContext = commonContext
            )
        },
        onAddToWatchlist = { recommendationViewModel.addToWatchlist(movie); callbacks.onDismissMovie() },
        onDismissRequest = callbacks.onDismissMovie
    )
}

private fun launchWatchProviders(
    movie: Movie,
    country: String,
    recommendationViewModel: RecommendationViewModel,
    commonContext: CommonContext
) {
    commonContext.scope.launch {
        val tmdbLink = "https://www.themoviedb.org/movie/${movie.id}/watch?locale=${country}"
        var tmdbOpened = false
        try {
            commonContext.context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(tmdbLink)))
            tmdbOpened = true
        } catch (_: Exception) {
        }
        if (!tmdbOpened) {
            when (val res = recommendationViewModel.getWatchProviders(movie.id, country)) {
                is Result.Success -> {
                    val providers = (res.data.providers.flatrate + res.data.providers.rent + res.data.providers.buy).distinct()
                    if (!res.data.link.isNullOrBlank()) {
                        try {
                            commonContext.context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(res.data.link)))
                        } catch (e: ActivityNotFoundException) {
                            commonContext.snackbarHostState.showSnackbar("Available on: ${providers.joinToString()}")
                        }
                    } else if (providers.isNotEmpty()) {
                        commonContext.snackbarHostState.showSnackbar("Available on: ${providers.joinToString()}")
                    } else {
                        commonContext.snackbarHostState.showSnackbar("No streaming info found")
                    }
                }

                is Result.Error -> commonContext.snackbarHostState.showSnackbar(
                    res.message ?: "Failed to load providers"
                )

                else -> {}
            }
        }
    }
}

@Composable
private fun RSComparisonDialog(
    compareState: CompareUiState,
    rankingViewModel: RankingViewModel
) {
    AlertDialog(
        onDismissRequest = {},
        title = { Text("Which movie do you prefer?") },
        text = {
            Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("Help us place '${compareState.newMovie.title}' in your rankings:", style = MaterialTheme.typography.bodyMedium)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    RSComparisonOption(compareState.newMovie, compareState, rankingViewModel, Modifier.weight(1f))
                    RSComparisonOption(compareState.compareWith, compareState, rankingViewModel, Modifier.weight(1f))
                }
            }
        },
        confirmButton = {},
        dismissButton = {}
    )
}

@Composable
private fun RSComparisonOption(
    movie: Movie,
    state: CompareUiState,
    rankingViewModel: RankingViewModel,
    modifier: Modifier
) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        AsyncImage(
            model = movie.posterPath?.let { "https://image.tmdb.org/t/p/w342$it" },
            contentDescription = movie.title,
            modifier = Modifier.fillMaxWidth().aspectRatio(2f / 3f).clip(MaterialTheme.shapes.medium),
            contentScale = ContentScale.Crop
        )
        Button(onClick = { rankingViewModel.compareMovies(state.newMovie, state.compareWith, movie) }, modifier = Modifier.fillMaxWidth()) {
            Text(movie.title, maxLines = 2, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodySmall)
        }
    }
}

private enum class RecommendationState {
    LOADING, ERROR, EMPTY, CONTENT
}
