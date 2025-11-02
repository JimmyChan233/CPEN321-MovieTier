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

    EditProfileSideEffects(uiState, authViewModel, navController, { name = it }, { msg -> snackbarMessage = msg; showSnackbar = true })

    Scaffold(
        topBar = { EditProfileTopBar(navController) },
        snackbarHost = { if (showSnackbar) EditProfileSnackbar(snackbarMessage) { showSnackbar = false } }
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            EditProfileForm(
                name = name,
                onNameChange = { name = it },
                userImageUrl = uiState.user?.profileImageUrl,
                isLoading = uiState.isLoading,
                onSaveClick = {
                    handleEditProfileSave(name, uiState.user?.name, authViewModel) { msg -> snackbarMessage = msg; showSnackbar = true }
                }
            )
        }
    }
}

@Composable
private fun EditProfileSideEffects(
    uiState: com.cpen321.movietier.ui.viewmodels.AuthUiState,
    authViewModel: AuthViewModel,
    navController: NavController,
    onNameUpdate: (String) -> Unit,
    onShowMessage: (String) -> Unit
) {
    LaunchedEffect(uiState.user) { uiState.user?.let { onNameUpdate(it.name) } }
    LaunchedEffect(uiState.successMessage, uiState.errorMessage) {
        when {
            uiState.successMessage != null -> {
                onShowMessage(uiState.successMessage ?: "")
                authViewModel.clearMessages()
                navController.popBackStack()
            }
            uiState.errorMessage != null -> {
                onShowMessage(uiState.errorMessage ?: "")
                authViewModel.clearMessages()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditProfileTopBar(navController: NavController) {
    CenterAlignedTopAppBar(
        title = { Text("Edit Profile") },
        navigationIcon = {
            IconButton(onClick = { navController.popBackStack() }) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
            }
        }
    )
}

@Composable
private fun EditProfileSnackbar(message: String, onDismiss: () -> Unit) {
    Snackbar(
        modifier = Modifier.padding(16.dp),
        action = { TextButton(onClick = onDismiss) { Text("Dismiss") } }
    ) { Text(message) }
}

private fun handleEditProfileSave(
    name: String,
    currentName: String?,
    authViewModel: AuthViewModel,
    onShowMessage: (String) -> Unit
) {
    when {
        name.isBlank() -> onShowMessage("Name cannot be empty")
        name == currentName -> onShowMessage("No changes to save")
        else -> authViewModel.updateProfile(name = name)
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
