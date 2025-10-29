package com.cpen321.movietier.ui.profile

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.cpen321.movietier.ui.components.Avatar
import com.cpen321.movietier.ui.viewmodels.AuthViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProfileScreen(
    navController: NavController,
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val uiState by authViewModel.uiState.collectAsState()

    var name by remember { mutableStateOf(uiState.user?.name ?: "") }
    var showSnackbar by remember { mutableStateOf(false) }
    var snackbarMessage by remember { mutableStateOf("") }

    // Update local state when user data changes
    LaunchedEffect(uiState.user) {
        uiState.user?.let { user ->
            name = user.name
        }
    }

    // Handle success/error messages
    LaunchedEffect(uiState.successMessage, uiState.errorMessage) {
        when {
            uiState.successMessage != null -> {
                snackbarMessage = uiState.successMessage ?: ""
                showSnackbar = true
                authViewModel.clearMessages()
                // Navigate back on success
                navController.popBackStack()
            }
            uiState.errorMessage != null -> {
                snackbarMessage = uiState.errorMessage ?: ""
                showSnackbar = true
                authViewModel.clearMessages()
            }
        }
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Edit Profile") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                }
            )
        },
        snackbarHost = {
            if (showSnackbar) {
                Snackbar(
                    modifier = Modifier.padding(16.dp),
                    action = {
                        TextButton(onClick = { showSnackbar = false }) {
                            Text("Dismiss")
                        }
                    }
                ) {
                    Text(snackbarMessage)
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            EditProfileForm(
                name = name,
                onNameChange = { name = it },
                userImageUrl = uiState.user?.profileImageUrl,
                isLoading = uiState.isLoading,
                onSaveClick = {
                    when {
                        name.isBlank() -> {
                            snackbarMessage = "Name cannot be empty"
                            showSnackbar = true
                        }
                        name == uiState.user?.name -> {
                            snackbarMessage = "No changes to save"
                            showSnackbar = true
                        }
                        else -> authViewModel.updateProfile(name = name)
                    }
                }
            )
        }
    }
}

@Composable
private fun EditProfileForm(
    name: String,
    onNameChange: (String) -> Unit,
    userImageUrl: String?,
    isLoading: Boolean,
    onSaveClick: () -> Unit
) {
    Spacer(modifier = Modifier.height(24.dp))

    Avatar(
        imageUrl = userImageUrl,
        name = name.ifEmpty { "User" },
        size = 120.dp
    )

    Spacer(modifier = Modifier.height(32.dp))

    OutlinedTextField(
        value = name,
        onValueChange = onNameChange,
        label = { Text("Name") },
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
        enabled = !isLoading
    )

    Spacer(modifier = Modifier.height(24.dp))

    EditProfileSaveButton(
        isLoading = isLoading,
        onClick = onSaveClick
    )
}

@Composable
private fun EditProfileSaveButton(
    isLoading: Boolean,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        enabled = !isLoading
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                color = MaterialTheme.colorScheme.onPrimary
            )
            Spacer(modifier = Modifier.width(8.dp))
        }
        Text("Save Changes")
    }
}
