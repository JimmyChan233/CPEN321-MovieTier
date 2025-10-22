package com.cpen321.movietier.ui.viewmodels

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpen321.movietier.data.model.User
import com.cpen321.movietier.data.repository.AuthRepository
import com.cpen321.movietier.data.repository.Result
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
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
    private val authRepository: AuthRepository
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
                authRepository.userName
            ) { token, userId, userEmail, userName ->
                if (token != null && userId != null && userEmail != null && userName != null) {
                    AuthUiState(
                        isAuthenticated = true,
                        user = User(
                            id = userId,
                            email = userEmail,
                            name = userName,
                            profileImageUrl = null
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

//    suspend fun signInWithGoogle(context: Context, googleClientId: String) {
//        _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
//        Log.d(TAG, "Google Client ID used: $googleClientId")
//
//
//        try {
//            val credentialManager = CredentialManager.create(context)
//
//            val googleIdOption = GetGoogleIdOption.Builder()
//                .setFilterByAuthorizedAccounts(false)
//                .setServerClientId(googleClientId)
//                .build()
//
//            val request = GetCredentialRequest.Builder()
//                .addCredentialOption(googleIdOption)
//                .build()
//
//            val result = credentialManager.getCredential(context, request)
//            val credential = result.credential
//            Log.d(TAG, "Credential class: ${credential.javaClass.name}") // ← add this
//
//
//            if (credential is GoogleIdTokenCredential) {
//                val idToken = credential.idToken
//                handleGoogleSignIn(idToken)
//            } else {
//                _uiState.value = _uiState.value.copy(
//                    isLoading = false,
//                    errorMessage = "Invalid credential type"
//                )
//            }
//        } catch (e: Exception) {
//            Log.e(TAG, "Sign in error", e)
//            _uiState.value = _uiState.value.copy(
//                isLoading = false,
//                errorMessage = e.message ?: "Sign in failed"
//            )
//        }
//    }
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
            credential is androidx.credentials.CustomCredential &&
                    credential.type == com.google.android.libraries.identity.googleid.GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL -> {
                val googleIdTokenCredential =
                    com.google.android.libraries.identity.googleid.GoogleIdTokenCredential.createFrom(credential.data)
                val idToken = googleIdTokenCredential.idToken
                handleGoogleSignIn(idToken)
            }

            // ✅ Older versions (returns the ID token directly)
            credential is com.google.android.libraries.identity.googleid.GoogleIdTokenCredential -> {
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
    } catch (e: Exception) {
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
