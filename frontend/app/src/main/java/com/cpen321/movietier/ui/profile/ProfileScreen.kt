package com.cpen321.movietier.ui.profile

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import androidx.navigation.compose.rememberNavController
import com.cpen321.movietier.ui.components.LoadingState
import com.cpen321.movietier.ui.navigation.NavRoutes
import com.cpen321.movietier.ui.profile.components.DeleteAccountDialog
import com.cpen321.movietier.ui.profile.components.ProfileActionButtons
import com.cpen321.movietier.ui.profile.components.ProfileEditButton
import com.cpen321.movietier.ui.profile.components.ProfileHeader
import com.cpen321.movietier.ui.profile.components.ThemeSelectorCard
import com.cpen321.movietier.ui.profile.components.WatchlistPreviewSection
import com.cpen321.movietier.ui.theme.MovieTierTheme
import com.cpen321.movietier.ui.theme.ThemeMode
import com.cpen321.movietier.ui.viewmodels.AuthUiState
import com.cpen321.movietier.ui.viewmodels.AuthViewModel
import com.cpen321.movietier.ui.viewmodels.ThemeViewModel
import com.cpen321.movietier.ui.viewmodels.WatchlistViewModel

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
    ) { padding ->
        Crossfade(targetState = uiState.user, label = "profile_state") { user ->
            if (user != null) {
                ProfileContent(
                    padding = padding,
                    user = user,
                    navController = navController,
                    authViewModel = authViewModel,
                    themeViewModel = themeViewModel,
                    watchlistVm = watchlistVm,
                    authUiState = uiState,
                    themeMode = themeMode,
                    showDeleteDialog = showDeleteDialog,
                    onShowDeleteDialog = { showDeleteDialog = it }
                )
            } else {
                LoadingState(modifier = Modifier.fillMaxSize().padding(padding), hint = "Loading profile...")
            }
        }
    }
}

@Composable
private fun ProfileNavigationEffect(
    uiState: AuthUiState,
    authViewModel: AuthViewModel,
    navController: NavController
) {
    androidx.compose.runtime.LaunchedEffect(uiState.isAuthenticated, uiState.successMessage) {
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
    authViewModel: AuthViewModel,
    themeViewModel: ThemeViewModel,
    watchlistVm: WatchlistViewModel,
    authUiState: AuthUiState,
    themeMode: ThemeMode,
    showDeleteDialog: Boolean,
    onShowDeleteDialog: (Boolean) -> Unit
) {
    val watchUi by watchlistVm.ui.collectAsState()
    val movieDetails by watchlistVm.details.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(24.dp))
        ProfileHeader(user)
        Spacer(modifier = Modifier.height(16.dp))
        ProfileEditButton(navController)
        Spacer(modifier = Modifier.height(24.dp))
        WatchlistPreviewSection(navController, watchUi, movieDetails)
        Spacer(modifier = Modifier.height(24.dp))
        ThemeSelectorCard(themeMode, themeViewModel)
        Spacer(modifier = Modifier.height(24.dp))
        ProfileActionButtons(
            authUiState,
            onSignOut = { authViewModel.signOut() },
            onDeleteAccount = { onShowDeleteDialog(true) }
        )
        Spacer(modifier = Modifier.height(24.dp))
    }

    if (showDeleteDialog) {
        DeleteAccountDialog(
            uiState = authUiState,
            onConfirm = {
                onShowDeleteDialog(false)
                authViewModel.deleteAccount()
            },
            onDismiss = { onShowDeleteDialog(false) }
        )
    }
}


@Preview(showBackground = true)
@Composable
private fun ProfileScreenPreview() {
    MovieTierTheme {
        val navController = rememberNavController()
        ProfileScreen(navController = navController)
    }
}
