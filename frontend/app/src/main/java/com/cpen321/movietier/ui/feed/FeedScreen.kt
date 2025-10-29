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
    val tokenManager = remember { com.cpen321.movietier.data.local.TokenManager(context) }
    val currentUserId by tokenManager.userId.collectAsState(initial = null)
    var selectedMovie by remember { mutableStateOf<com.cpen321.movietier.data.model.Movie?>(null) }
    var showCommentsForActivity by remember { mutableStateOf<String?>(null) }
    val commonContext = CommonContext(
        context = context,
        scope = rememberCoroutineScope(),
        snackbarHostState = remember { SnackbarHostState() }
    )
    var country by remember { mutableStateOf("CA") }

    FeedLocationHandler(context, commonContext.scope, onCountryCodeChanged = { country = it })

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
            country = country,
            onMovieSelected = { selectedMovie = it },
            onShowComments = { activityId ->
                showCommentsForActivity = activityId
                feedViewModel.loadComments(activityId)
            },
            navController = navController
        )
    }

    FeedSideEffects(
        selectedMovie = selectedMovie,
        compareState = compareState,
        showCommentsForActivity = showCommentsForActivity,
        commentsState = commentsState,
        currentUserId = currentUserId,
        feedViewModel = feedViewModel,
        country = country,
        commonContext = commonContext,
        onDismissMovie = { selectedMovie = null },
        onDismissComments = { showCommentsForActivity = null }
    )
}

private enum class FeedState {
    LOADING, EMPTY, CONTENT
}

@Composable
private fun ShimmerFeedCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Avatar shimmer
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .shimmerPlaceholder(visible = true, shape = MaterialTheme.shapes.small)
            )

            Column(modifier = Modifier.weight(1f)) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.7f)
                        .height(16.dp)
                        .shimmerPlaceholder(visible = true)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.4f)
                        .height(12.dp)
                        .shimmerPlaceholder(visible = true)
                )
            }
        }
    }
}

@Composable
private fun FilterToggleFab(
    label: String,
    icon: ImageVector,
    selected: Boolean,
    onClick: () -> Unit
) {
    val containerColor = if (selected) {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.surfaceColorAtElevation(6.dp)
    }
    val contentColor = if (selected) {
        MaterialTheme.colorScheme.onPrimary
    } else {
        MaterialTheme.colorScheme.onSurfaceVariant
    }

    FloatingActionButton(
        onClick = onClick,
        shape = RoundedCornerShape(20.dp),
        containerColor = containerColor,
        contentColor = contentColor,
        elevation = FloatingActionButtonDefaults.elevation(
            defaultElevation = 6.dp,
            pressedElevation = 8.dp
        )
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(imageVector = icon, contentDescription = label, modifier = Modifier.size(18.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge,
                color = contentColor
            )
        }
    }
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FeedTopBar(onRefresh: () -> Unit) {
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
            IconButton(onClick = onRefresh, modifier = Modifier.testTag("refresh_button")) {
                Icon(Icons.Default.Refresh, contentDescription = "Refresh")
            }
        },
        windowInsets = WindowInsets(0, 0, 0, 0)
    )
}

@Composable
private fun FeedFilterBar(
    currentFilter: com.cpen321.movietier.ui.viewmodels.FeedFilter,
    onFilterSelected: (com.cpen321.movietier.ui.viewmodels.FeedFilter) -> Unit
) {
    Row(
        modifier = Modifier.testTag("feed_filter_bar").fillMaxWidth().padding(bottom = 0.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically
    ) {
        FilterToggleFab(
            label = "Friends",
            icon = Icons.Filled.People,
            selected = currentFilter == com.cpen321.movietier.ui.viewmodels.FeedFilter.FRIENDS,
            onClick = { onFilterSelected(com.cpen321.movietier.ui.viewmodels.FeedFilter.FRIENDS) }
        )
        FilterToggleFab(
            label = "My Activities",
            icon = Icons.Filled.History,
            selected = currentFilter == com.cpen321.movietier.ui.viewmodels.FeedFilter.MINE,
            onClick = { onFilterSelected(com.cpen321.movietier.ui.viewmodels.FeedFilter.MINE) }
        )
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
private fun FeedLoadingState() {
    LazyColumn(
        modifier = Modifier.fillMaxSize().testTag("feed_loading"),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 112.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(5) { ShimmerFeedCard() }
    }
}

@Composable
private fun FeedEmptyState(navController: NavController) {
    Box(modifier = Modifier.fillMaxSize().testTag("feed_empty")) {
        EmptyState(
            icon = Icons.Default.Person,
            title = "No activity yet",
            message = "Add friends to see their rankings",
            primaryCta = {
                Button(
                    onClick = { navController.navigate(NavRoutes.FRIENDS) { popUpTo(NavRoutes.FEED) } },
                    modifier = Modifier.testTag("go_to_friends_button")
                ) {
                    Text("Add Friends")
                }
            }
        )
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

@Composable
private fun FeedSideEffects(
    selectedMovie: com.cpen321.movietier.data.model.Movie?,
    compareState: com.cpen321.movietier.ui.viewmodels.FeedCompareState?,
    showCommentsForActivity: String?,
    commentsState: Map<String, List<com.cpen321.movietier.data.model.FeedComment>>,
    currentUserId: String?,
    feedViewModel: FeedViewModel,
    country: String,
    commonContext: CommonContext,
    onDismissMovie: () -> Unit,
    onDismissComments: () -> Unit
) {
    selectedMovie?.let { movie ->
        FeedMovieDetailSheet(
            movie = movie,
            feedViewModel = feedViewModel,
            country = country,
            commonContext = commonContext,
            callbacks = MovieActionCallbacks(
                onAddToRanking = feedViewModel::addToRanking,
                onAddToWatchlist = feedViewModel::addToWatchlist,
                onDismiss = onDismissMovie
            )
        )
    }

    compareState?.let {
        FeedComparisonDialog(it, feedViewModel)
    }

    showCommentsForActivity?.let { activityId ->
        val comments = commentsState[activityId] ?: emptyList()
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
private fun FeedMovieDetailSheet(
    movie: com.cpen321.movietier.data.model.Movie,
    feedViewModel: FeedViewModel,
    country: String,
    commonContext: CommonContext,
    callbacks: MovieActionCallbacks
) {
    var availability by remember(movie.id) { mutableStateOf<String?>(null) }
    var loadingAvail by remember(movie.id) { mutableStateOf(true) }
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
private fun FeedComparisonOption(
    newMovie: com.cpen321.movietier.data.model.Movie,
    compareWith: com.cpen321.movietier.data.model.Movie,
    preferred: com.cpen321.movietier.data.model.Movie,
    feedViewModel: FeedViewModel,
    modifier: Modifier
) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        AsyncImage(
            model = preferred.posterPath?.let { "https://image.tmdb.org/t/p/w342$it" },
            contentDescription = preferred.title,
            modifier = Modifier.fillMaxWidth().aspectRatio(2f / 3f).clip(MaterialTheme.shapes.medium),
            contentScale = ContentScale.Crop
        )
        Button(
            onClick = { feedViewModel.choosePreferred(newMovie, compareWith, preferred) },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(preferred.title, maxLines = 2, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodySmall)
        }
    }
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
                } catch (e: Exception) {
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
