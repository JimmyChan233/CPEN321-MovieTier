package com.cpen321.movietier.ui.feed

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.Alignment
import androidx.compose.foundation.Image
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.graphics.vector.ImageVector
import coil.compose.AsyncImage
import com.cpen321.movietier.R
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import androidx.navigation.compose.rememberNavController
import com.cpen321.movietier.data.model.FeedActivity
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.ui.components.EmptyState
import com.cpen321.movietier.ui.components.FeedActivityCard
import com.cpen321.movietier.ui.components.MovieDetailBottomSheet
import com.cpen321.movietier.ui.components.MovieDetailActions
import com.cpen321.movietier.ui.components.AvailabilityInfo
import com.cpen321.movietier.ui.components.CommentBottomSheet
import com.cpen321.movietier.ui.components.YouTubePlayerDialog
import com.cpen321.movietier.ui.components.shimmerPlaceholder
import com.cpen321.movietier.ui.navigation.NavRoutes
import com.cpen321.movietier.ui.theme.MovieTierTheme
import com.cpen321.movietier.ui.viewmodels.FeedViewModel
import kotlinx.coroutines.launch
import com.cpen321.movietier.utils.LocationHelper
import android.Manifest
import android.content.ActivityNotFoundException
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import com.cpen321.movietier.ui.common.CommonContext
import com.cpen321.movietier.ui.common.MovieActionCallbacks
import com.cpen321.movietier.ui.common.CommentsState
import com.cpen321.movietier.ui.common.DismissCallbacks
import com.cpen321.movietier.ui.common.MovieDialogState
import com.cpen321.movietier.ui.common.MovieDialogCallbacks

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(
    navController: NavController,
    feedViewModel: FeedViewModel = hiltViewModel()
) {
    val uiState by feedViewModel.uiState.collectAsState()
    val compareState by feedViewModel.compareState.collectAsState()
    val commentsState by feedViewModel.commentsState.collectAsState()
    val context = androidx.compose.ui.platform.LocalContext.current
    val commonContext = rememberFeedCommonContext(context)
    val feedState = rememberFeedScreenState(context)
    val callbacks = rememberFeedCallbacks(feedState)

    FeedLocationHandler(context, commonContext.scope, onCountryCodeChanged = { feedState.country = it })

    FeedScaffold(
        uiState = uiState,
        feedViewModel = feedViewModel,
        feedState = feedState,
        navController = navController,
        commonContext = commonContext
    )

    FeedSideEffects(
        params = FeedSideEffectsParams(
            selectedMovie = feedState.selectedMovie,
            dialogState = feedState.dialogState,
            compareState = compareState,
            commentsState = CommentsState(
                showCommentsForActivity = feedState.showCommentsForActivity,
                commentsData = commentsState,
                currentUserId = feedState.currentUserId
            ),
            feedViewModel = feedViewModel,
            country = feedState.country,
            commonContext = commonContext,
            callbacks = callbacks,
            dialogCallbacks = feedState.dialogCallbacks
        )
    )
}

@Composable
private fun rememberFeedCommonContext(context: android.content.Context): CommonContext {
    return CommonContext(
        context = context,
        scope = rememberCoroutineScope(),
        snackbarHostState = remember { SnackbarHostState() }
    )
}

@Composable
private fun FeedScaffold(
    uiState: com.cpen321.movietier.ui.viewmodels.FeedUiState,
    feedViewModel: FeedViewModel,
    feedState: FeedScreenState,
    navController: NavController,
    commonContext: CommonContext
) {
    Scaffold(
        modifier = Modifier.fillMaxSize().testTag("feed_screen"),
        snackbarHost = { SnackbarHost(commonContext.snackbarHostState) },
        topBar = { FeedTopBar(onRefresh = { feedViewModel.refreshFeed() }) },
        floatingActionButtonPosition = FabPosition.Center,
        floatingActionButton = { FeedFilterBar(uiState.feedFilter, feedViewModel::setFeedFilter) }
    ) { padding ->
        FeedMainContent(
            uiState = uiState,
            padding = padding,
            feedViewModel = feedViewModel,
            country = feedState.country,
            onMovieSelected = { feedState.selectedMovie = it },
            onShowComments = { activityId ->
                feedState.showCommentsForActivity = activityId
                feedViewModel.loadComments(activityId)
            },
            navController = navController
        )
    }
}

@Stable
private class FeedScreenState {
    var selectedMovie by mutableStateOf<com.cpen321.movietier.data.model.Movie?>(null)
    var showCommentsForActivity by mutableStateOf<String?>(null)
    var dialogState by mutableStateOf(MovieDialogState())
    lateinit var dialogCallbacks: MovieDialogCallbacks
    var country by mutableStateOf("CA")
    var currentUserId by mutableStateOf<String?>(null)
}

@Composable
private fun rememberFeedScreenState(context: android.content.Context): FeedScreenState {
    val tokenManager = remember { com.cpen321.movietier.data.local.TokenManager(context) }
    val currentUserId by tokenManager.userId.collectAsState(initial = null)

    val state = remember { FeedScreenState() }

    state.currentUserId = currentUserId

    state.dialogCallbacks = remember(state) {
        MovieDialogCallbacks(
            onTrailerKeyUpdate = { state.dialogState = state.dialogState.copy(trailerKey = it) },
            onDismissMovie = { state.selectedMovie = null; state.dialogState = state.dialogState.copy(trailerKey = null) },
            onShowTrailer = { title -> state.dialogState = state.dialogState.copy(trailerMovieTitle = title, showTrailerDialog = true) },
            onDismissTrailer = { state.dialogState = state.dialogState.copy(showTrailerDialog = it) }
        )
    }

    return state
}

@Composable
private fun rememberFeedCallbacks(feedState: FeedScreenState): DismissCallbacks {
    return remember {
        DismissCallbacks(
            onDismissMovie = feedState.dialogCallbacks.onDismissMovie,
            onDismissComments = { feedState.showCommentsForActivity = null }
        )
    }
}

private enum class FeedState {
    LOADING, EMPTY, CONTENT
}

@Composable
private fun FeedLocationHandler(
    context: android.content.Context,
    scope: kotlinx.coroutines.CoroutineScope,
    onCountryCodeChanged: (String) -> Unit
) {
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true ||
            permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true) {
            scope.launch {
                onCountryCodeChanged(LocationHelper.getCountryCode(context))
            }
        }
    }

    LaunchedEffect(Unit) {
        if (LocationHelper.hasLocationPermission(context)) {
            onCountryCodeChanged(LocationHelper.getCountryCode(context))
        } else {
            locationPermissionLauncher.launch(LocationHelper.getLocationPermissions())
        }
    }
}

@Composable
private fun FeedMainContent(
    uiState: com.cpen321.movietier.ui.viewmodels.FeedUiState,
    padding: PaddingValues,
    feedViewModel: FeedViewModel,
    country: String,
    onMovieSelected: (com.cpen321.movietier.data.model.Movie) -> Unit,
    onShowComments: (String) -> Unit,
    navController: NavController
) {
    Column(modifier = Modifier.fillMaxSize().padding(padding)) {
        Crossfade(
            targetState = when {
                uiState.isLoading -> FeedState.LOADING
                uiState.feedActivities.isEmpty() -> FeedState.EMPTY
                else -> FeedState.CONTENT
            },
            label = "feed_state"
        ) { state ->
            when (state) {
                FeedState.LOADING -> FeedLoadingState()
                FeedState.EMPTY -> FeedEmptyState(navController)
                FeedState.CONTENT -> FeedContentState(uiState, feedViewModel, country, onMovieSelected, onShowComments)
            }
        }
    }
}

@Composable
private fun FeedContentState(
    uiState: com.cpen321.movietier.ui.viewmodels.FeedUiState,
    feedViewModel: FeedViewModel,
    country: String,
    onMovieSelected: (com.cpen321.movietier.data.model.Movie) -> Unit,
    onShowComments: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().testTag("feed_list"),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 112.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(items = uiState.feedActivities, key = { it.id }) { activity ->
            FeedActivityItem(activity, feedViewModel, country, onMovieSelected, onShowComments)
        }
    }
}

@Composable
private fun FeedActivityItem(
    activity: com.cpen321.movietier.data.model.FeedActivity,
    feedViewModel: FeedViewModel,
    country: String,
    onMovieSelected: (com.cpen321.movietier.data.model.Movie) -> Unit,
    onShowComments: (String) -> Unit
) {
    var availability by remember(activity.movie.id) { mutableStateOf<String?>(null) }
    LaunchedEffect(activity.movie.id) {
        when (val res = feedViewModel.getWatchProviders(activity.movie.id, country)) {
            is com.cpen321.movietier.data.repository.Result.Success -> {
                val providers = buildList {
                    addAll(res.data.providers.flatrate)
                    addAll(res.data.providers.rent)
                    addAll(res.data.providers.buy)
                }.distinct()
                val top = pickTopProviders(providers, 4)
                val more = providers.size > top.size
                availability = if (top.isNotEmpty()) {
                    "Available on: ${top.joinToString()}" + if (more) " …" else ""
                } else null
            }
            else -> { availability = null }
        }
    }
    FeedActivityCard(
        activity = activity,
        availabilityText = availability,
        onClick = { onMovieSelected(activity.movie) },
        onLikeClick = { feedViewModel.toggleLike(activity.id) },
        onCommentClick = { onShowComments(activity.id); feedViewModel.loadComments(activity.id) }
    )
}

@Stable
private data class FeedSideEffectsParams(
    val selectedMovie: com.cpen321.movietier.data.model.Movie?,
    val dialogState: MovieDialogState,
    val compareState: com.cpen321.movietier.ui.viewmodels.FeedCompareState?,
    val commentsState: CommentsState,
    val feedViewModel: FeedViewModel,
    val country: String,
    val commonContext: CommonContext,
    val callbacks: DismissCallbacks,
    val dialogCallbacks: MovieDialogCallbacks
)

@Composable
private fun FeedSideEffects(params: FeedSideEffectsParams) {
    params.selectedMovie?.let { movie ->
        FeedMovieDetailSheet(
            movie = movie,
            dialogState = params.dialogState,
            feedViewModel = params.feedViewModel,
            country = params.country,
            commonContext = params.commonContext,
            callbacks = MovieActionCallbacks(
                onAddToRanking = params.feedViewModel::addToRanking,
                onAddToWatchlist = params.feedViewModel::addToWatchlist,
                onDismiss = params.callbacks.onDismissMovie
            ),
            dialogCallbacks = params.dialogCallbacks
        )
    }

    if (params.dialogState.showTrailerDialog && params.dialogState.trailerKey != null) {
        YouTubePlayerDialog(params.dialogState.trailerKey!!, params.dialogState.trailerMovieTitle) {
            params.dialogCallbacks.onDismissTrailer(false)
        }
    }

    params.compareState?.let {
        FeedComparisonDialog(it, params.feedViewModel)
    }

    params.commentsState.showCommentsForActivity?.let { activityId ->
        val comments = params.commentsState.commentsData[activityId] ?: emptyList()
        CommentBottomSheet(
            comments = comments,
            currentUserId = params.commentsState.currentUserId,
            onDismiss = params.callbacks.onDismissComments,
            onAddComment = { text -> params.feedViewModel.addComment(activityId, text) },
            onDeleteComment = { commentId -> params.feedViewModel.deleteComment(activityId, commentId) }
        )
    }

    FeedEventHandler(params.feedViewModel, params.commonContext.scope, params.commonContext.snackbarHostState, params.callbacks.onDismissMovie)
}

@Composable
private fun FeedMovieDetailSheet(
    movie: com.cpen321.movietier.data.model.Movie,
    dialogState: MovieDialogState,
    feedViewModel: FeedViewModel,
    country: String,
    commonContext: CommonContext,
    callbacks: MovieActionCallbacks,
    dialogCallbacks: MovieDialogCallbacks
) {
    var availability by remember(movie.id) { mutableStateOf<String?>(null) }
    var loadingAvail by remember(movie.id) { mutableStateOf(true) }

    // Fetch trailer key
    LaunchedEffect(movie.id) {
        val result = feedViewModel.getMovieVideos(movie.id)
        dialogCallbacks.onTrailerKeyUpdate(when (result) {
            is com.cpen321.movietier.data.repository.Result.Success -> result.data?.key
            else -> null
        })
    }

    // Fetch watch providers
    LaunchedEffect(movie.id) {
        loadingAvail = true
        when (val res = feedViewModel.getWatchProviders(movie.id, country)) {
            is com.cpen321.movietier.data.repository.Result.Success -> {
                val providers = buildList {
                    addAll(res.data.providers.flatrate)
                    addAll(res.data.providers.rent)
                    addAll(res.data.providers.buy)
                }.distinct()
                val top = pickTopProviders(providers, 4)
                availability = if (top.isNotEmpty()) "Available on: ${top.joinToString()}" + if (providers.size > top.size) " …" else "" else "No streaming info found"
            }
            is com.cpen321.movietier.data.repository.Result.Error -> { availability = res.message ?: "Failed to load providers" }
            else -> {}
        }
        loadingAvail = false
    }

    MovieDetailBottomSheet(
        movie = movie,
        actions = MovieDetailActions(
            onOpenWhereToWatch = { commonContext.scope.launch { handleWhereToWatchClick(movie, feedViewModel, country, commonContext.context, commonContext.snackbarHostState) } },
            onAddToRanking = { callbacks.onAddToRanking(movie) },
            onAddToWatchlist = { callbacks.onAddToWatchlist(movie); callbacks.onDismiss() },
            onPlayTrailer = dialogState.trailerKey?.let { { dialogCallbacks.onShowTrailer(movie.title) } },
            onDismissRequest = callbacks.onDismiss
        ),
        availabilityInfo = com.cpen321.movietier.ui.components.AvailabilityInfo(
            availabilityText = availability,
            availabilityLoading = loadingAvail
        )
    )
}

@Composable
private fun FeedComparisonDialog(
    state: com.cpen321.movietier.ui.viewmodels.FeedCompareState,
    feedViewModel: FeedViewModel
) {
    AlertDialog(
        onDismissRequest = { /* block dismiss during compare */ },
        title = { Text("Which movie do you prefer?") },
        text = {
            Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("Help us place '${state.newMovie.title}' in your rankings:", style = MaterialTheme.typography.bodyMedium)
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    FeedComparisonOption(state.newMovie, state.compareWith, state.newMovie, feedViewModel, Modifier.weight(1f))
                    FeedComparisonOption(state.newMovie, state.compareWith, state.compareWith, feedViewModel, Modifier.weight(1f))
                }
            }
        },
        confirmButton = {},
        dismissButton = {}
    )
}

@Composable
private fun FeedEventHandler(
    feedViewModel: FeedViewModel,
    scope: kotlinx.coroutines.CoroutineScope,
    snackbarHostState: SnackbarHostState,
    onDismissMovie: () -> Unit
) {
    LaunchedEffect(Unit) {
        feedViewModel.events.collect { event ->
            when (event) {
                is com.cpen321.movietier.ui.viewmodels.FeedEvent.Message -> {
                    onDismissMovie()
                    snackbarHostState.showSnackbar(event.text)
                }
                is com.cpen321.movietier.ui.viewmodels.FeedEvent.Error -> {
                    onDismissMovie()
                    snackbarHostState.showSnackbar(event.text)
                }
            }
        }
    }
}

private suspend fun handleWhereToWatchClick(
    movie: com.cpen321.movietier.data.model.Movie,
    feedViewModel: FeedViewModel,
    country: String,
    context: android.content.Context,
    snackbarHostState: SnackbarHostState
) {
    val tmdbLink = "https://www.themoviedb.org/movie/${movie.id}/watch?locale=$country"
    try {
        val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(tmdbLink))
        context.startActivity(intent)
        return
    } catch (_: Exception) {}

    when (val res = feedViewModel.getWatchProviders(movie.id, country)) {
        is com.cpen321.movietier.data.repository.Result.Success -> {
            val link = res.data.link
            val providers = buildList {
                addAll(res.data.providers.flatrate)
                addAll(res.data.providers.rent)
                addAll(res.data.providers.buy)
            }.distinct()
            if (!link.isNullOrBlank()) {
                try {
                    val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(link))
                    context.startActivity(intent)
                } catch (e: android.content.ActivityNotFoundException) {
                    val top = pickTopProviders(providers, 4)
                    snackbarHostState.showSnackbar("Available on: ${top.joinToString()}" + if (providers.size > top.size) " …" else "")
                }
            } else {
                val top = pickTopProviders(providers, 4)
                if (top.isNotEmpty()) {
                    snackbarHostState.showSnackbar("Available on: ${top.joinToString()}" + if (providers.size > top.size) " …" else "")
                } else {
                    snackbarHostState.showSnackbar("No streaming info found")
                }
            }
        }
        is com.cpen321.movietier.data.repository.Result.Error -> {
            snackbarHostState.showSnackbar(res.message ?: "Failed to load providers")
        }
        else -> {}
    }
}

@Preview(showBackground = true)
@Composable
private fun FeedScreenLoadingPreview() {
    MovieTierTheme {
        val navController = rememberNavController()
        FeedScreen(navController = navController)
    }
}

@Preview(showBackground = true)
@Composable
private fun FeedScreenContentPreview() {
    MovieTierTheme {
        // Would require mock ViewModel for proper preview
        val navController = rememberNavController()
        FeedScreen(navController = navController)
    }
}
