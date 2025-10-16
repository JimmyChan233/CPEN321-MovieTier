package com.cpen321.movietier.ui.feed

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import androidx.navigation.compose.rememberNavController
import com.cpen321.movietier.data.model.FeedActivity
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.ui.components.EmptyState
import com.cpen321.movietier.ui.components.FeedActivityCard
import com.cpen321.movietier.ui.components.MovieDetailBottomSheet
import com.cpen321.movietier.ui.components.shimmerPlaceholder
import com.cpen321.movietier.ui.navigation.NavRoutes
import com.cpen321.movietier.ui.theme.MovieTierTheme
import com.cpen321.movietier.ui.viewmodels.FeedViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(
    navController: NavController,
    feedViewModel: FeedViewModel = hiltViewModel()
) {
    val uiState by feedViewModel.uiState.collectAsState()
    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()

    var selectedMovie by remember { mutableStateOf<com.cpen321.movietier.data.model.Movie?>(null) }

    val snackbarHostState = remember { SnackbarHostState() }

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .nestedScroll(scrollBehavior.nestedScrollConnection)
            .testTag("feed_screen"),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Friend Activity", style = MaterialTheme.typography.titleMedium) },
                actions = {
                    IconButton(
                        onClick = { feedViewModel.refreshFeed() },
                        modifier = Modifier.testTag("refresh_button")
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                scrollBehavior = scrollBehavior
            )
        }
    ) { padding ->
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
                            .padding(padding)
                            .testTag("feed_loading"),
                        contentPadding = PaddingValues(16.dp),
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
                        .padding(padding)
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
                            .padding(padding)
                    ) {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .testTag("feed_list"),
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(
                                items = uiState.feedActivities,
                                key = { it.id }
                            ) { activity ->
                                FeedActivityCard(
                                    activity = activity,
                                    onClick = { selectedMovie = activity.movie }
                                )
                            }
                        }

                        selectedMovie?.let { movie ->
                            MovieDetailBottomSheet(
                                movie = movie,
                                onAddToRanking = {
                                    feedViewModel.addToRanking(movie)
                                    selectedMovie = null
                                },
                                onAddToWatchlist = {
                                    feedViewModel.addToWatchlist(movie)
                                    // Close sheet so snackbar is visible immediately
                                    selectedMovie = null
                                },
                                onDismissRequest = { selectedMovie = null }
                            )
                        }
                    }
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        feedViewModel.events.collect { event ->
            when (event) {
                is com.cpen321.movietier.ui.viewmodels.FeedEvent.Message -> snackbarHostState.showSnackbar(event.text)
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
