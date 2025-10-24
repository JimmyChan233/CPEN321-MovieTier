package com.cpen321.movietier.ui.profile

import android.graphics.BitmapFactory
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.cpen321.movietier.ui.components.Avatar
import com.cpen321.movietier.ui.viewmodels.AuthViewModel
import java.io.ByteArrayOutputStream

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProfileScreen(
    navController: NavController,
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val uiState by authViewModel.uiState.collectAsState()
    val context = LocalContext.current

    var name by remember { mutableStateOf(uiState.user?.name ?: "") }
    var profileImageUrl by remember { mutableStateOf(uiState.user?.profileImageUrl) }
    var showSnackbar by remember { mutableStateOf(false) }
    var snackbarMessage by remember { mutableStateOf("") }

    // Update local state when user data changes
    LaunchedEffect(uiState.user) {
        uiState.user?.let { user ->
            name = user.name
            profileImageUrl = user.profileImageUrl
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

    // Image picker launcher
    val pickImage = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        uri?.let {
            try {
                val inputStream = context.contentResolver.openInputStream(it)
                val bytes = inputStream?.readBytes()
                inputStream?.close()

                bytes?.let { imageBytes ->
                    // Resize image if too large
                    val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                    val maxSize = 512 // Max width/height
                    val scale = minOf(
                        maxSize.toFloat() / bitmap.width,
                        maxSize.toFloat() / bitmap.height,
                        1f
                    )
                    val scaledBitmap = android.graphics.Bitmap.createScaledBitmap(
                        bitmap,
                        (bitmap.width * scale).toInt(),
                        (bitmap.height * scale).toInt(),
                        true
                    )

                    val outputStream = ByteArrayOutputStream()
                    scaledBitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 85, outputStream)

                    // Upload immediately
                    authViewModel.uploadProfilePicture(outputStream.toByteArray())
                }
            } catch (e: Exception) {
                snackbarMessage = "Failed to load image: ${e.message}"
                showSnackbar = true
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
            Spacer(modifier = Modifier.height(24.dp))

            // Profile Picture with edit overlay
            Box(
                contentAlignment = Alignment.BottomEnd
            ) {
                Avatar(
                    imageUrl = profileImageUrl,
                    name = name.ifEmpty { "User" },
                    size = 120.dp
                )

                FloatingActionButton(
                    onClick = {
                        pickImage.launch(
                            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                        )
                    },
                    modifier = Modifier.size(40.dp),
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Icon(
                        Icons.Filled.Edit,
                        contentDescription = "Change profile picture",
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Name field
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Name") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                enabled = !uiState.isLoading
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Save button
            Button(
                onClick = {
                    if (name.isBlank()) {
                        snackbarMessage = "Name cannot be empty"
                        showSnackbar = true
                        return@Button
                    }
                    // Only send name if changed
                    val nameChanged = name != uiState.user?.name

                    if (!nameChanged) {
                        snackbarMessage = "No changes to save"
                        showSnackbar = true
                        return@Button
                    }

                    authViewModel.updateProfile(name = name)
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !uiState.isLoading
            ) {
                if (uiState.isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text("Save Changes")
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Remove photo button (if photo exists and not Google default)
            if (profileImageUrl != null && !profileImageUrl!!.contains("googleusercontent.com")) {
                TextButton(
                    onClick = { authViewModel.deleteProfilePicture() },
                    enabled = !uiState.isLoading
                ) {
                    Text("Remove Photo")
                }
            }
        }
    }
}
