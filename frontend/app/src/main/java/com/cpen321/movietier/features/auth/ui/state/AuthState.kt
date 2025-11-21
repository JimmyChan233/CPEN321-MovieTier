package com.cpen321.movietier.features.auth.ui.state

import com.cpen321.movietier.shared.models.User

data class AuthUiState(
    val isLoading: Boolean = false,
    val isAuthenticated: Boolean = false,
    val user: User? = null,
    val errorMessage: String? = null,
    val successMessage: String? = null
)
