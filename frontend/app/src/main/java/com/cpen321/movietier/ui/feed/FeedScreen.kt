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
import com.cpen321.movietier.ui.components.CommentBottomSheet
import com.cpen321.movietier.ui.components.shimmerPlaceholder
import com.cpen321.movietier.ui.navigation.NavRoutes
import com.cpen321.movietier.ui.theme.MovieTierTheme
import com.cpen321.movietier.ui.viewmodels.FeedViewModel
import kotlinx.coroutines.launch
import com.cpen321.movietier.utils.LocationHelper
import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts


private fun normalizeProviderName(name: String): String {
    val n = name.trim()
    val lower = n.lowercase()
    return when {
        lower.contains("netflix") -> "Netflix"
        lower.contains("amazon") || lower.contains("prime video") -> "Prime Video"
        lower.contains("disney") -> "Disney+"
        lower == "max" || lower.contains("hbo") -> "Max"
        lower.contains("apple tv") -> "Apple TV"
        lower.contains("hulu") -> "Hulu"
        lower.contains("paramount") -> "Paramount+"
        lower.contains("peacock") -> "Peacock"
        lower.contains("youtube") -> "YouTube"
        lower.contains("crunchyroll") -> "Crunchyroll"
        lower.contains("tubi") -> "Tubi"
        lower.contains("plex") -> "Plex"
        else -> n
    }
}

private fun pickTopProviders(all: List<String>, limit: Int = 4): List<String> {
    val majors = listOf(
        "Netflix", "Prime Video", "Disney+", "Hulu", "Max",
        "Apple TV", "Paramount+", "Peacock", "YouTube", "Crunchyroll",
        "Tubi", "Plex"
    )
    val normalized = all.map { normalizeProviderName(it) }.distinct()
    val ranked = normalized.sortedBy { p -> majors.indexOf(p).let { if (it == -1) Int.MAX_VALUE else it } }
    val top = ranked.take(limit)
    return if (top.isNotEmpty()) top else normalized.take(limit)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(
    navController: NavController,
    feedViewModel: FeedViewModel = hiltViewModel()
) {
    val uiState by feedViewModel.uiState.collectAsState()
    val compareState by feedViewModel.compareState.collectAsState()
    val commentsState by feedViewModel.commentsState.collectAsState()

    // Get current user ID from TokenManager
    val context = androidx.compose.ui.platform.LocalContext.current
    val tokenManager = remember { com.cpen321.movietier.data.local.TokenManager(context) }
    val currentUserId by tokenManager.userId.collectAsState(initial = null)

    var selectedMovie by remember { mutableStateOf<com.cpen321.movietier.data.model.Movie?>(null) }
    var showCommentsForActivity by remember { mutableStateOf<String?>(null) }

    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
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

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .testTag("feed_screen"),
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
                    IconButton(
                        onClick = { feedViewModel.refreshFeed() },
                        modifier = Modifier.testTag("refresh_button")
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                windowInsets = WindowInsets(0, 0, 0, 0)
            )
        },
        floatingActionButtonPosition = FabPosition.Center,
        floatingActionButton = {
            Row(
                modifier = Modifier
                    .testTag("feed_filter_bar")
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterHorizontally),
                verticalAlignment = Alignment.CenterVertically
            ) {
                FilterToggleFab(
                    label = "Friends",
                    icon = Icons.Filled.People,
                    selected = uiState.feedFilter == com.cpen321.movietier.ui.viewmodels.FeedFilter.FRIENDS,
                    onClick = { feedViewModel.setFeedFilter(com.cpen321.movietier.ui.viewmodels.FeedFilter.FRIENDS) }
                )
                FilterToggleFab(
                    label = "My Activities",
                    icon = Icons.Filled.History,
                    selected = uiState.feedFilter == com.cpen321.movietier.ui.viewmodels.FeedFilter.MINE,
                    onClick = { feedViewModel.setFeedFilter(com.cpen321.movietier.ui.viewmodels.FeedFilter.MINE) }
                )
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            Crossfade(
                targetState = when {
                    uiState.isLoading -> FeedState.LOADING
                    uiState.feedActivities.isEmpty() -> FeedState.EMPTY
                    else -> FeedState.CONTENT
                },
                label = "feed_state"
            ) { state ->
                when (state) {
                    FeedState.LOADING -> {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .testTag("feed_loading"),
                            contentPadding = PaddingValues(
                                start = 16.dp,
                                end = 16.dp,
                                top = 16.dp,
                                bottom = 112.dp
                            ),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                        items(5) {
                            ShimmerFeedCard()
                        }
                    }
                }
                FeedState.EMPTY -> {
                    Box(modifier = Modifier
                        .fillMaxSize()
                        .testTag("feed_empty")
                    ) {
                        EmptyState(
                            icon = Icons.Default.Person,
                            title = "No activity yet",
                            message = "Add friends to see their rankings",
                            primaryCta = {
                                Button(
                                    onClick = {
                                        navController.navigate(NavRoutes.FRIENDS) {
                                            popUpTo(NavRoutes.FEED)
                                        }
                                    },
                                    modifier = Modifier.testTag("go_to_friends_button")
                                ) {
                                    Text("Add Friends")
                                }
                            }
                        )
                    }
                }
                FeedState.CONTENT -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                    ) {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .testTag("feed_list"),
                            contentPadding = PaddingValues(
                                start = 16.dp,
                                end = 16.dp,
                                top = 16.dp,
                                bottom = 112.dp
                            ),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(
                                items = uiState.feedActivities,
                                key = { it.id }
                            ) { activity ->
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
                                    onClick = { selectedMovie = activity.movie },
                                    onLikeClick = { feedViewModel.toggleLike(activity.id) },
                                    onCommentClick = {
                                        showCommentsForActivity = activity.id
                                        feedViewModel.loadComments(activity.id)
                                    }
                                )
                            }
                        }

                        selectedMovie?.let { movie ->
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
                                        val more = providers.size > top.size
                                        availability = if (top.isNotEmpty()) {
                                            "Available on: ${top.joinToString()}" + if (more) " …" else ""
                                        } else "No streaming info found"
                                    }
                                    is com.cpen321.movietier.data.repository.Result.Error -> {
                                        availability = res.message ?: "Failed to load providers"
                                    }
                                    else -> {}
                                }
                                loadingAvail = false
                            }
                            MovieDetailBottomSheet(
                                movie = movie,
                                onOpenWhereToWatch = {
                                    scope.launch {
                                        val tmdbLink = "https://www.themoviedb.org/movie/${movie.id}/watch?locale=${country}"
                                        // Prefer exact TMDB watch page for the movie
                                        try {
                                            val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(tmdbLink))
                                            context.startActivity(intent)
                                            return@launch
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
                                                        val more = providers.size > top.size
                                                        snackbarHostState.showSnackbar("Available on: ${top.joinToString()}" + if (more) " …" else "")
                                                    }
                                                } else {
                                                    val top = pickTopProviders(providers, 4)
                                                    if (top.isNotEmpty()) {
                                                        val more = providers.size > top.size
                                                        snackbarHostState.showSnackbar("Available on: ${top.joinToString()}" + if (more) " …" else "")
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
                                },
                                availabilityText = availability,
                                availabilityLoading = loadingAvail,
                                onAddToRanking = {
                                    feedViewModel.addToRanking(movie)
                                    // Sheet will close when success/error message is received
                                },
                                onAddToWatchlist = {
                                    feedViewModel.addToWatchlist(movie)
                                    // Close sheet so snackbar is visible immediately
                                    selectedMovie = null
                                },
                                onDismissRequest = { selectedMovie = null }
                            )
                        }

                        if (compareState != null) {
                            val state = compareState!!
                            AlertDialog(
                                onDismissRequest = { /* block dismiss during compare */ },
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
                                                        feedViewModel.choosePreferred(
                                                            newMovie = state.newMovie,
                                                            compareWith = state.compareWith,
                                                            preferred = state.newMovie
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
                                                        feedViewModel.choosePreferred(
                                                            newMovie = state.newMovie,
                                                            compareWith = state.compareWith,
                                                            preferred = state.compareWith
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
}

    // Comment bottom sheet
    showCommentsForActivity?.let { activityId ->
        val comments = commentsState[activityId] ?: emptyList()
        CommentBottomSheet(
            comments = comments,
            currentUserId = currentUserId,
            onDismiss = { showCommentsForActivity = null },
            onAddComment = { text ->
                feedViewModel.addComment(activityId, text)
            },
            onDeleteComment = { commentId ->
                feedViewModel.deleteComment(activityId, commentId)
            }
        )
    }

    LaunchedEffect(Unit) {
        feedViewModel.events.collect { event ->
            when (event) {
                is com.cpen321.movietier.ui.viewmodels.FeedEvent.Message -> {
                    // Close bottom sheet so message is visible at top
                    selectedMovie = null
                    snackbarHostState.showSnackbar(event.text)
                }
                is com.cpen321.movietier.ui.viewmodels.FeedEvent.Error -> {
                    // Close bottom sheet so error message is visible at top
                    selectedMovie = null
                    snackbarHostState.showSnackbar(event.text)
                }
            }
        }
    }
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
