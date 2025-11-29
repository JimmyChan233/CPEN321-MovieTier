package com.cpen321.movietier.ui.auth.viewmodel

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpen321.movietier.data.api.ApiService
import com.cpen321.movietier.data.model.User
import com.cpen321.movietier.data.repository.AuthRepository
import com.cpen321.movietier.data.repository.Result
import com.cpen321.movietier.utils.fcm.FcmHelper
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val isLoading: Boolean = false,
    val isAuthenticated: Boolean = false,
    val user: User? = null,
    val errorMessage: String? = null,
    val successMessage: String? = null
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val apiService: ApiService
) : ViewModel() {

    companion object {
        private const val TAG = "AuthViewModel"
    }

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        checkAuthStatus()
    }

    private fun checkAuthStatus() {
        viewModelScope.launch {
            // Combine all flows to get complete user data
            combine(
                authRepository.authToken,
                authRepository.userId,
                authRepository.userEmail,
                authRepository.userName,
                authRepository.userProfileImageUrl
            ) { token, userId, userEmail, userName, profileImageUrl ->
                val hasCompleteUserData = token != null && userId != null &&
                    userEmail != null && userName != null
                if (hasCompleteUserData) {
                    AuthUiState(
                        isAuthenticated = true,
                        user = User(
                            id = userId!!,
                            email = userEmail!!,
                            name = userName!!,
                            profileImageUrl = profileImageUrl
                        )
                    )
                } else if (token != null) {
                    // Token exists but user data not loaded yet
                    AuthUiState(isAuthenticated = true, user = null)
                } else {
                    AuthUiState(isAuthenticated = false, user = null)
                }
            }.collect { newState ->
                Log.d(TAG, "checkAuthStatus - isAuthenticated: ${newState.isAuthenticated}, user: ${newState.user}")
                _uiState.value = _uiState.value.copy(
                    isAuthenticated = newState.isAuthenticated,
                    user = newState.user
                )
            }
        }
    }

suspend fun signInWithGoogle(context: Context, googleClientId: String) {
    _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)

    try {
        val credentialManager = CredentialManager.create(context)

        val googleIdOption = GetGoogleIdOption.Builder()
            .setServerClientId(googleClientId)
            .setFilterByAuthorizedAccounts(false)
            .setAutoSelectEnabled(false)   // prevents reusing a stale credential
            .build()

        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()

        val result = credentialManager.getCredential(context, request)
        val credential = result.credential
        Log.d(TAG, "Credential class: ${credential.javaClass.name}")

        when {
            // ✅ Newer devices (returns the wrapped credential)
            credential is CustomCredential &&
                    credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL -> {
                val googleIdTokenCredential =
                    GoogleIdTokenCredential.createFrom(credential.data)
                val idToken = googleIdTokenCredential.idToken
                handleGoogleSignIn(idToken)
            }

            // ✅ Older versions (returns the ID token directly)
            credential is GoogleIdTokenCredential -> {
                val idToken = credential.idToken
                handleGoogleSignIn(idToken)
            }

            // ❌ Anything else
            else -> {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = "Invalid credential type"
                )
            }
        }
    } catch (e: GetCredentialException) {
        Log.e(TAG, "Sign in error", e)
        _uiState.value = _uiState.value.copy(
            isLoading = false,
            errorMessage = e.message ?: "Sign in failed"
        )
    }
}


    private suspend fun handleGoogleSignIn(idToken: String) {
        // Try sign in first
        when (val result = authRepository.signIn(idToken)) {
            is Result.Success -> {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    isAuthenticated = true,
                    user = result.data.user,
                    successMessage = "Sign in successful"
                )
                // Initialize FCM and register token with backend
                FcmHelper.initializeFcm(apiService, viewModelScope)
            }
            is Result.Error -> {
                // If sign in fails, try sign up
                val errorMsg = result.message ?: result.exception.message ?: ""
                Log.d(TAG, "Sign in error: $errorMsg")

                if (errorMsg.contains("not found", ignoreCase = true) ||
                    errorMsg.contains("User not found", ignoreCase = true)) {
                    Log.d(TAG, "User not found, attempting sign up")
                    handleGoogleSignUp(idToken)
                } else {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = errorMsg.ifEmpty { "Sign in failed" }
                    )
                }
            }
            is Result.Loading -> {
                _uiState.value = _uiState.value.copy(isLoading = true)
            }
        }
    }

    private suspend fun handleGoogleSignUp(idToken: String) {
        Log.d(TAG, "Starting sign up")
        when (val result = authRepository.signUp(idToken)) {
            is Result.Success -> {
                Log.d(TAG, "Sign up successful")
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    isAuthenticated = true,
                    user = result.data.user,
                    successMessage = "Account created successfully"
                )
                // Initialize FCM and register token with backend
                FcmHelper.initializeFcm(apiService, viewModelScope)
            }
            is Result.Error -> {
                Log.e(TAG, "Sign up failed: ${result.message}")
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = result.message ?: result.exception.message ?: "Sign up failed"
                )
            }
            is Result.Loading -> {
                _uiState.value = _uiState.value.copy(isLoading = true)
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            when (authRepository.signOut()) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isAuthenticated = false,
                        user = null,
                        successMessage = "Signed out successfully"
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = "Sign out failed"
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    fun deleteAccount() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            when (authRepository.deleteAccount()) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isAuthenticated = false,
                        user = null,
                        successMessage = "Account deleted successfully"
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = "Failed to delete account"
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(
            errorMessage = null,
            successMessage = null
        )
    }
}
