package com.cpen321.movietier.ui.user.model

import com.cpen321.movietier.ui.auth.viewmodel.AuthUiState
import com.cpen321.movietier.ui.user.theme.ThemeMode

/**
 * Groups UI state for profile screen
 */
data class ProfileUiStates(
    val authUiState: AuthUiState,
    val themeMode: ThemeMode
)