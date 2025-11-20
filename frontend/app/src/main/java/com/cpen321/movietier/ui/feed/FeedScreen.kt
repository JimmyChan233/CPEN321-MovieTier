package com.cpen321.movietier.ui.feed

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.tooling.preview.Preview
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import androidx.navigation.compose.rememberNavController
import com.cpen321.movietier.data.local.TokenManager
import com.cpen321.movietier.data.model.FeedComment
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.ui.components.CommentBottomSheet
import com.cpen321.movietier.ui.components.YouTubePlayerDialog
import com.cpen321.movietier.ui.feed.components.*
import com.cpen321.movietier.ui.navigation.NavRoutes
import com.cpen321.movietier.ui.theme.MovieTierTheme
import com.cpen321.movietier.ui.viewmodels.FeedCompareState
import com.cpen321.movietier.ui.viewmodels.FeedEvent
import com.cpen321.movietier.ui.viewmodels.FeedViewModel
import kotlinx.coroutines.launch
import com.cpen321.movietier.utils.LocationHelper
import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material3.SnackbarHostState
import android.content.Context
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.CoroutineScope

// Inline definitions of parameter group classes (moved from deleted ParameterGroups.kt)
internal data class CommonContext(
    val context: android.content.Context,
    val scope: CoroutineScope,
    val snackbarHostState: SnackbarHostState
)

internal data class MovieDialogState(
    val trailerKey: String? = null,
    val showTrailerDialog: Boolean = false,
    val trailerMovieTitle: String = ""
)

internal data class MovieDialogCallbacks(
    val onTrailerKeyUpdate: (String?) -> Unit = {},
    val onDismissMovie: () -> Unit = {},
    val onShowTrailer: (String) -> Unit = {},
    val onDismissTrailer: (Boolean) -> Unit = {}
)

internal data class DismissCallbacks(
    val onDismissMovie: () -> Unit = {},
    val onDismissComments: () -> Unit = {}
)

internal data class MovieActionCallbacks(
    val onAddToRanking: (Movie) -> Unit = {},
    val onAddToWatchlist: (Movie) -> Unit = {},
    val onDismiss: () -> Unit = {}
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(
    navController: NavController,
    feedViewModel: FeedViewModel = hiltViewModel()
) {
    val uiState by feedViewModel.uiState.collectAsState()
    val compareState by feedViewModel.compareState.collectAsState()
    val commentsState by feedViewModel.commentsState.collectAsState()
    val context = LocalContext.current
    val commonContext = rememberFeedCommonContext(context)
    val feedState = rememberFeedScreenState(context)
    val callbacks = rememberFeedCallbacks(feedState)

    FeedLocationHandler(context, commonContext.scope, onCountryCodeChanged = { feedState.country = it })

    Scaffold(
        modifier = Modifier.fillMaxSize().testTag("feed_screen"),
        snackbarHost = { SnackbarHost(commonContext.snackbarHostState) },
        topBar = { FeedTopBar(onRefresh = { feedViewModel.refreshFeed() }) },
        floatingActionButtonPosition = FabPosition.Center,
        floatingActionButton = { FeedFilterBar(uiState.feedFilter, feedViewModel::setFeedFilter) }
    ) { padding ->
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
                    FeedState.CONTENT -> FeedContentState(
                        uiState = uiState,
                        feedViewModel = feedViewModel,
                        country = feedState.country,
                        onMovieSelected = { feedState.selectedMovie = it },
                        onShowComments = { activityId ->
                            feedState.showCommentsForActivity = activityId
                            feedViewModel.loadComments(activityId)
                        }
                    )
                }
            }
        }
    }

    FeedSideEffects(
        selectedMovie = feedState.selectedMovie,
        dialogState = feedState.dialogState,
        compareState = compareState,
        showCommentsForActivity = feedState.showCommentsForActivity,
        commentsData = commentsState,
        currentUserId = feedState.currentUserId,
        feedViewModel = feedViewModel,
        country = feedState.country,
        commonContext = commonContext,
        callbacks = callbacks,
        dialogCallbacks = feedState.dialogCallbacks,
        onDismissMovie = feedState.dialogCallbacks.onDismissMovie,
        onDismissComments = { feedState.showCommentsForActivity = null }
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

@Stable
private class FeedScreenState {
    var selectedMovie by mutableStateOf<Movie?>(null)
    var showCommentsForActivity by mutableStateOf<String?>(null)
    var dialogState by mutableStateOf(MovieDialogState())
    lateinit var dialogCallbacks: MovieDialogCallbacks
    var country by mutableStateOf("CA")
    var currentUserId by mutableStateOf<String?>(null)
}

@Composable
private fun rememberFeedScreenState(context: android.content.Context): FeedScreenState {
    val tokenManager = remember { TokenManager(context) }
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
    scope: CoroutineScope,
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
private fun FeedSideEffects(
    selectedMovie: Movie?,
    dialogState: MovieDialogState,
    compareState: FeedCompareState?,
    showCommentsForActivity: String?,
    commentsData: Map<String, List<FeedComment>>,
    currentUserId: String?,
    feedViewModel: FeedViewModel,
    country: String,
    commonContext: CommonContext,
    callbacks: DismissCallbacks,
    dialogCallbacks: MovieDialogCallbacks,
    onDismissMovie: () -> Unit,
    onDismissComments: () -> Unit
) {
    selectedMovie?.let { movie ->
        FeedMovieDetailSheet(
            movie = movie,
            dialogState = dialogState,
            feedViewModel = feedViewModel,
            country = country,
            commonContext = commonContext,
            callbacks = MovieActionCallbacks(
                onAddToRanking = feedViewModel::addToRanking,
                onAddToWatchlist = feedViewModel::addToWatchlist,
                onDismiss = callbacks.onDismissMovie
            ),
            dialogCallbacks = dialogCallbacks
        )
    }

    if (dialogState.showTrailerDialog && dialogState.trailerKey != null) {
        YouTubePlayerDialog(dialogState.trailerKey!!, dialogState.trailerMovieTitle) {
            dialogCallbacks.onDismissTrailer(false)
        }
    }

    compareState?.let {
        FeedComparisonDialog(it, feedViewModel)
    }

    showCommentsForActivity?.let { activityId ->
        val comments = commentsData[activityId] ?: emptyList()
        CommentBottomSheet(
            comments = comments,
            currentUserId = currentUserId,
            onDismiss = onDismissComments,
            onAddComment = { text -> feedViewModel.addComment(activityId, text) },
            onDeleteComment = { commentId -> feedViewModel.deleteComment(activityId, commentId) }
        )
    }

    FeedEventHandler(feedViewModel, commonContext.scope, commonContext.snackbarHostState, onDismissMovie)
}

@Composable
private fun FeedEventHandler(
    feedViewModel: FeedViewModel,
    scope: CoroutineScope,
    snackbarHostState: SnackbarHostState,
    onDismissMovie: () -> Unit
) {
    LaunchedEffect(Unit) {
        feedViewModel.events.collect { event ->
            when (event) {
                is FeedEvent.Message -> {
                    onDismissMovie()
                    snackbarHostState.showSnackbar(event.text)
                }
                is FeedEvent.Error -> {
                    onDismissMovie()
                    snackbarHostState.showSnackbar(event.text)
                }
            }
        }
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
        val navController = rememberNavController()
        FeedScreen(navController = navController)
    }
}
