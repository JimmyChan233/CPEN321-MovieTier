package com.cpen321.movietier.ui.viewmodels

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpen321.movietier.data.api.ApiService
import com.cpen321.movietier.data.model.User
import com.cpen321.movietier.data.repository.AuthRepository
import com.cpen321.movietier.data.repository.Result
import com.cpen321.movietier.domain.usecase.auth.DeleteAccountUseCase
import com.cpen321.movietier.domain.usecase.auth.SignInWithGoogleUseCase
import com.cpen321.movietier.domain.usecase.auth.SignOutUseCase
import com.cpen321.movietier.fcm.FcmHelper
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
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
    private val apiService: ApiService,
    private val signInWithGoogleUseCase: SignInWithGoogleUseCase,
    private val signOutUseCase: SignOutUseCase,
    private val deleteAccountUseCase: DeleteAccountUseCase
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
            kotlinx.coroutines.flow.combine(
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

    fun signInWithGoogle(context: Context, googleClientId: String) {
        viewModelScope.launch {
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

                val idToken = extractIdToken(credential)
                if (idToken != null) {
                    handleGoogleSignInWithFallback(idToken)
                } else {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = "Invalid credential type"
                    )
                }
            } catch (e: GetCredentialException) {
                Log.e(TAG, "Sign in error", e)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = e.message ?: "Sign in failed"
                )
            }
        }
    }

    /**
     * Extracts the ID token from the credential.
     * Handles both newer devices (CustomCredential) and older versions (direct GoogleIdTokenCredential).
     */
    private fun extractIdToken(credential: androidx.credentials.Credential): String? {
        return when {
            // ✅ Newer devices (returns the wrapped credential)
            credential is androidx.credentials.CustomCredential &&
                    credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL -> {
                val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                googleIdTokenCredential.idToken
            }

            // ✅ Older versions (returns the ID token directly)
            credential is GoogleIdTokenCredential -> {
                credential.idToken
            }

            // ❌ Anything else
            else -> null
        }
    }

    /**
     * Handles Google sign-in with fallback to sign-up using the use case.
     *
     * Uses SignInWithGoogleUseCase which encapsulates:
     * - Initial sign-in attempt
     * - Fallback to sign-up if user not found
     * - Error handling
     */
    private suspend fun handleGoogleSignInWithFallback(idToken: String) {
        Log.d(TAG, "Attempting sign-in with Google ID token")
        when (val result = signInWithGoogleUseCase(idToken)) {
            is Result.Success -> {
                val successMessage = if (result.data.isNewUser) {
                    "Account created successfully"
                } else {
                    "Sign in successful"
                }
                Log.d(TAG, "Authentication successful: isNewUser=${result.data.isNewUser}")
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    isAuthenticated = true,
                    user = result.data.user,
                    successMessage = successMessage
                )
            }
            is Result.Error -> {
                Log.e(TAG, "Authentication failed: ${result.message}")
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = result.message
                )
            }
            is Result.Loading -> {
                _uiState.value = _uiState.value.copy(isLoading = true)
            }
        }
    }

    /**
     * Signs out the current user using SignOutUseCase.
     */
    fun signOut() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            when (val result = signOutUseCase()) {
                is Result.Success -> {
                    Log.d(TAG, "Sign-out successful")
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isAuthenticated = false,
                        user = null,
                        successMessage = "Signed out successfully"
                    )
                }
                is Result.Error -> {
                    Log.e(TAG, "Sign-out failed: ${result.message}")
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = result.message ?: "Sign out failed"
                    )
                }
                is Result.Loading -> {
                    _uiState.value = _uiState.value.copy(isLoading = true)
                }
            }
        }
    }

    /**
     * Deletes the current user's account using DeleteAccountUseCase.
     */
    fun deleteAccount() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            when (val result = deleteAccountUseCase()) {
                is Result.Success -> {
                    Log.d(TAG, "Account deletion successful")
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isAuthenticated = false,
                        user = null,
                        successMessage = "Account deleted successfully"
                    )
                }
                is Result.Error -> {
                    Log.e(TAG, "Account deletion failed: ${result.message}")
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = result.message ?: "Failed to delete account"
                    )
                }
                is Result.Loading -> {
                    _uiState.value = _uiState.value.copy(isLoading = true)
                }
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
