package com.cpen321.movietier.ui.profile

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import androidx.navigation.compose.rememberNavController
import com.cpen321.movietier.ui.components.Avatar
import com.cpen321.movietier.ui.components.LoadingState
import com.cpen321.movietier.ui.components.StarRating
import com.cpen321.movietier.ui.navigation.NavRoutes
import coil.compose.AsyncImage
import com.cpen321.movietier.ui.viewmodels.WatchlistViewModel
import com.cpen321.movietier.ui.theme.MovieTierTheme
import com.cpen321.movietier.ui.viewmodels.AuthViewModel
import com.cpen321.movietier.ui.viewmodels.ThemeViewModel
import com.cpen321.movietier.ui.theme.ThemeMode
import androidx.compose.foundation.clickable
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import com.cpen321.movietier.ui.viewmodels.AuthUiState

// Inline definitions of parameter group classes (moved from deleted ParameterGroups.kt)
internal data class ProfileViewModels(
    val watchlistVm: WatchlistViewModel,
    val themeViewModel: ThemeViewModel,
    val authViewModel: AuthViewModel
)

internal data class ProfileUiStates(
    val authUiState: AuthUiState,
    val themeMode: ThemeMode
)

internal data class DeleteDialogState(
    val showDialog: Boolean = false,
    val onShowDialogChange: (Boolean) -> Unit = {}
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    navController: NavController,
    authViewModel: AuthViewModel = hiltViewModel(),
    themeViewModel: ThemeViewModel = hiltViewModel(),
    watchlistVm: WatchlistViewModel = hiltViewModel()
) {
    val uiState by authViewModel.uiState.collectAsState()
    var showDeleteDialog by remember { mutableStateOf(false) }
    val themeMode by themeViewModel.themeMode.collectAsState()

    ProfileNavigationEffect(uiState, authViewModel, navController)

    Scaffold(
        modifier = Modifier.fillMaxSize().testTag("profile_screen"),
        // Top app bar intentionally removed per design request
    ) { padding ->
        Crossfade(targetState = uiState.user, label = "profile_state") { user ->
            if (user != null) {
                ProfileContent(
                    padding = padding,
                    user = user,
                    navController = navController,
                    viewModels = ProfileViewModels(
                        watchlistVm = watchlistVm,
                        themeViewModel = themeViewModel,
                        authViewModel = authViewModel
                    ),
                    uiStates = ProfileUiStates(
                        authUiState = uiState,
                        themeMode = themeMode
                    ),
                    deleteDialogState = DeleteDialogState(
                        showDialog = showDeleteDialog,
                        onShowDialogChange = { showDeleteDialog = it }
                    )
                )
            } else {
                LoadingState(modifier = Modifier.fillMaxSize().padding(padding), hint = "Loading profile...")
            }
        }
    }
}

@Composable
private fun ProfileNavigationEffect(
    uiState: com.cpen321.movietier.ui.viewmodels.AuthUiState,
    authViewModel: AuthViewModel,
    navController: NavController
) {
    LaunchedEffect(uiState.isAuthenticated, uiState.successMessage) {
        if (!uiState.isAuthenticated &&
            (uiState.successMessage == "Signed out successfully" ||
             uiState.successMessage == "Account deleted successfully")) {
            navController.navigate(NavRoutes.AUTH) {
                popUpTo(navController.graph.startDestinationId) { inclusive = true }
                launchSingleTop = true
            }
            authViewModel.clearMessages()
        }
    }
}

@Composable
private fun ProfileContent(
    padding: PaddingValues,
    user: com.cpen321.movietier.data.model.User,
    navController: NavController,
    viewModels: ProfileViewModels,
    uiStates: ProfileUiStates,
    deleteDialogState: DeleteDialogState
) {
    val watchUi by viewModels.watchlistVm.ui.collectAsState()
    val movieDetails by viewModels.watchlistVm.details.collectAsState()

    Column(
        modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(24.dp))
        ProfileHeader(user)
        Spacer(modifier = Modifier.height(16.dp))
        ProfileEditButton(navController)
        Spacer(modifier = Modifier.height(24.dp))
        WatchlistPreviewSection(navController, watchUi, movieDetails)
        Spacer(modifier = Modifier.height(24.dp))
        ThemeSelectorCard(uiStates.themeMode, viewModels.themeViewModel)
        Spacer(modifier = Modifier.height(24.dp))
        ProfileActionButtons(uiStates.authUiState, { viewModels.authViewModel.signOut() }, { deleteDialogState.onShowDialogChange(true) })
        Spacer(modifier = Modifier.height(24.dp))
    }

    if (deleteDialogState.showDialog) {
        DeleteAccountDialog(
            uiState = uiStates.authUiState,
            onConfirm = { deleteDialogState.onShowDialogChange(false); viewModels.authViewModel.deleteAccount() },
            onDismiss = { deleteDialogState.onShowDialogChange(false) }
        )
    }
}

@Composable
private fun ProfileHeader(user: com.cpen321.movietier.data.model.User) {
    Avatar(
        imageUrl = user.profileImageUrl,
        name = user.name,
        size = 80.dp
    )

    Spacer(modifier = Modifier.height(16.dp))

    Text(
        text = user.name,
        style = MaterialTheme.typography.headlineMedium,
        fontWeight = FontWeight.Bold
    )

    Spacer(modifier = Modifier.height(8.dp))

    Text(
        text = user.email,
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
}

@Composable
private fun ProfileEditButton(navController: NavController) {
    Button(
        onClick = { navController.navigate(NavRoutes.EDIT_PROFILE) },
        modifier = Modifier.fillMaxWidth(),
        colors = ButtonDefaults.filledTonalButtonColors()
    ) {
        Text("Edit Profile")
    }
}

@Composable
private fun WatchlistPreviewSection(
    navController: NavController,
    watchUi: com.cpen321.movietier.ui.viewmodels.WatchlistUiState,
    movieDetails: Map<Int, com.cpen321.movietier.data.model.Movie>
) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text("My Watchlist", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        TextButton(onClick = { navController.navigate(NavRoutes.WATCHLIST) }) { Text("View All") }
    }
    Spacer(Modifier.height(8.dp))
    Column(verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
        watchUi.items.take(3).forEach { item ->
            val details = movieDetails[item.movieId]
            WatchlistPreviewCard(item, details, navController)
        }
        if (watchUi.items.isEmpty()) {
            Text("Your watchlist is empty", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun WatchlistPreviewCard(
    item: com.cpen321.movietier.data.model.WatchlistItem,
    details: com.cpen321.movietier.data.model.Movie?,
    navController: NavController
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { navController.navigate(NavRoutes.WATCHLIST) },
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            WatchlistPreviewPoster(item)
            WatchlistPreviewInfo(item, details)
        }
    }
}

@Composable
private fun WatchlistPreviewPoster(item: com.cpen321.movietier.data.model.WatchlistItem) {
    AsyncImage(
        model = item.posterPath?.let { "https://image.tmdb.org/t/p/w342$it" },
        contentDescription = "Poster: ${item.title}",
        modifier = Modifier
            .width(90.dp)
            .aspectRatio(2f / 3f),
        contentScale = ContentScale.Crop
    )
}

@Composable
private fun androidx.compose.foundation.layout.RowScope.WatchlistPreviewInfo(
    item: com.cpen321.movietier.data.model.WatchlistItem,
    details: com.cpen321.movietier.data.model.Movie?
) {
    Column(modifier = Modifier.weight(1f)) {
        Text(
            text = item.title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
        Spacer(Modifier.height(6.dp))

        // Year and rating on single line (consistent with Ranking/Watchlist format)
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            details?.releaseDate?.take(4)?.let { year ->
                Text(
                    text = year,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            details?.voteAverage?.let { rating ->
                StarRating(rating = rating, starSize = 14.dp)
            }
        }
        if (details != null) {
            Spacer(Modifier.height(6.dp))
        }

        item.overview?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun ThemeSelectorCard(themeMode: ThemeMode, themeViewModel: ThemeViewModel) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "Theme",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = themeMode == ThemeMode.System,
                    onClick = { themeViewModel.setThemeMode(ThemeMode.System) },
                    label = { Text("System") },
                    modifier = Modifier
                        .weight(1f)
                        .testTag("theme_system")
                )
                FilterChip(
                    selected = themeMode == ThemeMode.Light,
                    onClick = { themeViewModel.setThemeMode(ThemeMode.Light) },
                    label = { Text("Light") },
                    modifier = Modifier
                        .weight(1f)
                        .testTag("theme_light")
                )
                FilterChip(
                    selected = themeMode == ThemeMode.Dark,
                    onClick = { themeViewModel.setThemeMode(ThemeMode.Dark) },
                    label = { Text("Dark") },
                    modifier = Modifier
                        .weight(1f)
                        .testTag("theme_dark")
                )
            }
        }
    }
}

@Composable
private fun ProfileActionButtons(
    uiState: com.cpen321.movietier.ui.viewmodels.AuthUiState,
    onSignOut: () -> Unit,
    onDeleteAccount: () -> Unit
) {
    Button(
        onClick = { if (!uiState.isLoading) onSignOut() },
        modifier = Modifier
            .fillMaxWidth()
            .testTag("sign_out_button"),
        colors = ButtonDefaults.filledTonalButtonColors()
    ) {
        Icon(
            Icons.Default.ExitToApp,
            contentDescription = null,
            modifier = Modifier.size(18.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text("Sign Out")
    }

    Spacer(modifier = Modifier.height(16.dp))

    Button(
        onClick = { if (!uiState.isLoading) onDeleteAccount() },
        modifier = Modifier
            .fillMaxWidth()
            .testTag("delete_account_button"),
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.error
        )
    ) {
        Text("Delete Account")
    }
}

@Composable
private fun DeleteAccountDialog(
    uiState: com.cpen321.movietier.ui.viewmodels.AuthUiState,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = {
            Icon(
                Icons.Default.ExitToApp,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.error
            )
        },
        title = { Text("Delete Account") },
        text = {
            Text("Are you sure you want to delete your account? This action cannot be undone.")
        },
        confirmButton = {
            Button(
                onClick = { if (!uiState.isLoading) onConfirm() },
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.error
                ),
                modifier = Modifier.testTag("confirm_delete_button")
            ) {
                Text("Delete")
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                modifier = Modifier.testTag("cancel_delete_button")
            ) {
                Text("Cancel")
            }
        }
    )
}

@Preview(showBackground = true)
@Composable
private fun ProfileScreenPreview() {
    MovieTierTheme {
        val navController = rememberNavController()
        ProfileScreen(navController = navController)
    }
}
