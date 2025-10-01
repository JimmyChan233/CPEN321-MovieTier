package com.cpen321.movietier.ui.profile

import android.util.Log
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.cpen321.movietier.ui.navigation.NavRoutes
import com.cpen321.movietier.ui.viewmodels.AuthViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    navController: NavController,
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val uiState by authViewModel.uiState.collectAsState()

    // Navigate to auth only after sign out or account deletion
    LaunchedEffect(uiState.isAuthenticated, uiState.successMessage) {
        // Only redirect if explicitly signed out or account deleted
        if (!uiState.isAuthenticated &&
            (uiState.successMessage == "Signed out successfully" ||
             uiState.successMessage == "Account deleted successfully")) {
            navController.navigate(NavRoutes.AUTH) {
                popUpTo(0) { inclusive = true }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Profile") },
                actions = {
                    IconButton(onClick = { authViewModel.signOut() }) {
                        Icon(Icons.Default.ExitToApp, contentDescription = "Sign Out")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (uiState.user != null) {
                val user = uiState.user!!
                var showDeleteDialog by remember { mutableStateOf(false) }

                Spacer(modifier = Modifier.height(32.dp))
                Text(
                    text = user.name,
                    style = MaterialTheme.typography.headlineMedium
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = user.email,
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(modifier = Modifier.height(32.dp))
                Button(
                    onClick = { authViewModel.signOut() },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Sign Out")
                }
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = { showDeleteDialog = true },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Text("Delete Account")
                }

                if (showDeleteDialog) {
                    AlertDialog(
                        onDismissRequest = { showDeleteDialog = false },
                        title = { Text("Delete Account") },
                        text = { Text("Are you sure you want to delete your account? This action cannot be undone.") },
                        confirmButton = {
                            Button(
                                onClick = {
                                    showDeleteDialog = false
                                    authViewModel.deleteAccount()
                                },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.error
                                )
                            ) {
                                Text("Delete")
                            }
                        },
                        dismissButton = {
                            TextButton(onClick = { showDeleteDialog = false }) {
                                Text("Cancel")
                            }
                        }
                    )
                }
            } else {
                // Show loading or placeholder
                Spacer(modifier = Modifier.height(32.dp))
                CircularProgressIndicator()
                Spacer(modifier = Modifier.height(16.dp))
                Text("Loading profile...")
                Spacer(modifier = Modifier.height(32.dp))
                Button(
                    onClick = { authViewModel.signOut() },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Sign Out")
                }
            }
        }
    }
}
