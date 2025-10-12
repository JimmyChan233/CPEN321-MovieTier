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
import com.cpen321.movietier.ui.navigation.NavRoutes
import com.cpen321.movietier.ui.theme.MovieTierTheme
import com.cpen321.movietier.ui.viewmodels.AuthViewModel
import com.cpen321.movietier.ui.viewmodels.ThemeViewModel
import com.cpen321.movietier.ui.theme.ThemeMode

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    navController: NavController,
    authViewModel: AuthViewModel = hiltViewModel(),
    themeViewModel: ThemeViewModel = hiltViewModel()
) {
    val uiState by authViewModel.uiState.collectAsState()
    var showDeleteDialog by remember { mutableStateOf(false) }
    val themeMode by themeViewModel.themeMode.collectAsState()

    // Navigate to auth only after sign out or account deletion
    LaunchedEffect(uiState.isAuthenticated, uiState.successMessage) {
        if (!uiState.isAuthenticated &&
            (uiState.successMessage == "Signed out successfully" ||
             uiState.successMessage == "Account deleted successfully")) {
            navController.navigate(NavRoutes.AUTH) {
                popUpTo(0) { inclusive = true }
            }
        }
    }

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .testTag("profile_screen"),
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Profile", style = MaterialTheme.typography.titleMedium) },
                actions = {
                    IconButton(
                        onClick = { authViewModel.signOut() },
                        modifier = Modifier.testTag("sign_out_icon_button")
                    ) {
                        Icon(Icons.Default.ExitToApp, contentDescription = "Sign Out")
                    }
                }
            )
        }
    ) { padding ->
        Crossfade(
            targetState = uiState.user != null,
            label = "profile_state"
        ) { hasUser ->
            if (hasUser) {
                val user = uiState.user!!
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Spacer(modifier = Modifier.height(24.dp))

                    // Avatar and user info header
                    Avatar(
                        imageUrl = null,
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

                    Spacer(modifier = Modifier.height(32.dp))

                    // Theme toggle section
                    Card(
                        modifier = Modifier.fillMaxWidth()
                    ) {
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

                    Spacer(modifier = Modifier.height(24.dp))

                    // Action buttons
                    Button(
                        onClick = { authViewModel.signOut() },
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
                        onClick = { showDeleteDialog = true },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("delete_account_button"),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.error
                        )
                    ) {
                        Text("Delete Account")
                    }

                    Spacer(modifier = Modifier.height(24.dp))
                }

                if (showDeleteDialog) {
                    AlertDialog(
                        onDismissRequest = { showDeleteDialog = false },
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
                                onClick = {
                                    showDeleteDialog = false
                                    authViewModel.deleteAccount()
                                },
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
                                onClick = { showDeleteDialog = false },
                                modifier = Modifier.testTag("cancel_delete_button")
                            ) {
                                Text("Cancel")
                            }
                        }
                    )
                }
            } else {
                // Loading state
                LoadingState(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    hint = "Loading profile..."
                )
            }
        }
    }
}

// ThemeMode is provided by ui.theme ThemeMode

@Preview(showBackground = true)
@Composable
private fun ProfileScreenPreview() {
    MovieTierTheme {
        val navController = rememberNavController()
        ProfileScreen(navController = navController)
    }
}
