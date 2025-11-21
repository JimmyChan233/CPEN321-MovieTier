package com.cpen321.movietier.features.profile.ui.screens

import android.Manifest
import android.content.Context
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.cpen321.movietier.shared.models.Movie
import com.cpen321.movietier.data.repository.Result
import com.cpen321.movietier.ui.profile.components.FriendProfileContent
import com.cpen321.movietier.ui.profile.components.FriendProfileMovieDetailSheet
import com.cpen321.movietier.ui.profile.components.FriendProfileTopBar
import com.cpen321.movietier.ui.profile.components.MovieComparisonDialog
import com.cpen321.movietier.shared.components.YouTubePlayerDialog
import com.cpen321.movietier.features.profile.ui.viewmodel.FriendProfileViewModel
import com.cpen321.movietier.core.util.LocationHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

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

    // Local state management
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    var country by remember { mutableStateOf("CA") }
    var selectedMovie by remember { mutableStateOf<Movie?>(null) }
    var trailerKey by remember { mutableStateOf<String?>(null) }
    var showTrailerDialog by remember { mutableStateOf(false) }
    var trailerMovieTitle by remember { mutableStateOf("") }
    var movieDetailsMap by remember { mutableStateOf<Map<Int, Movie>>(emptyMap()) }

    // Side effects
    LaunchedEffect(userId) { vm.load(userId) }

    // Fetch movie details for all rankings and watchlist items
    LaunchedEffect(ui.rankings, ui.watchlist) {
        var updatedMap = movieDetailsMap

        // Fetch ranked movie details
        ui.rankings.forEach { rankedMovie ->
            if (!updatedMap.containsKey(rankedMovie.movie.id)) {
                val result = vm.getMovieDetails(rankedMovie.movie.id)
                if (result is Result.Success) {
                    updatedMap = updatedMap + (rankedMovie.movie.id to result.data)
                }
            }
        }

        // Fetch watchlist item details
        ui.watchlist.forEach { item ->
            if (!updatedMap.containsKey(item.movieId)) {
                val result = vm.getMovieDetails(item.movieId)
                if (result is Result.Success) {
                    updatedMap = updatedMap + (item.movieId to result.data)
                }
            }
        }

        // Update once with all accumulated details
        if (updatedMap != movieDetailsMap) {
            movieDetailsMap = updatedMap
        }
    }

    // Location permission launcher for watch provider country detection
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true ||
            permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true) {
            scope.launch { country = LocationHelper.getCountryCode(context) }
        }
    }

    // Request location permission and get country code
    LaunchedEffect(Unit) {
        if (LocationHelper.hasLocationPermission(context)) {
            country = LocationHelper.getCountryCode(context)
        } else {
            locationPermissionLauncher.launch(LocationHelper.getLocationPermissions())
        }
    }

    // Listen for ranking view model events
    LaunchedEffect(Unit) {
        rankingViewModel.events.collect { event ->
            when (event) {
                is com.cpen321.movietier.ui.viewmodels.RankingEvent.Message -> {
                    selectedMovie = null
                    snackbarHostState.showSnackbar(event.text)
                }
                is com.cpen321.movietier.ui.viewmodels.RankingEvent.Error -> {
                    selectedMovie = null
                    snackbarHostState.showSnackbar(event.text)
                }
            }
        }
    }

    Scaffold(
        topBar = { FriendProfileTopBar(ui.userName, navController) },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        Box(Modifier.fillMaxSize()) {
            FriendProfileContent(
                ui = ui,
                movieDetailsMap = movieDetailsMap,
                padding = padding,
                onMovieSelect = { selectedMovie = it }
            )

            // Movie detail sheet
            selectedMovie?.let { movie ->
                FriendProfileMovieDetailSheet(
                    movie = movie,
                    trailerKey = trailerKey,
                    country = country,
                    friendProfileViewModel = vm,
                    rankingViewModel = rankingViewModel,
                    navController = navController,
                    context = context,
                    scope = scope,
                    snackbarHostState = snackbarHostState,
                    onTrailerKeyUpdate = { trailerKey = it },
                    onShowTrailer = { title -> trailerMovieTitle = title; showTrailerDialog = true },
                    onDismissMovie = { selectedMovie = null; trailerKey = null }
                )
            }

            // Trailer player dialog
            if (showTrailerDialog && trailerKey != null) {
                YouTubePlayerDialog(trailerKey!!, trailerMovieTitle) { showTrailerDialog = false }
            }

            // Movie comparison dialog
            compareState?.let {
                MovieComparisonDialog(it, rankingViewModel)
            }
        }
    }
}
