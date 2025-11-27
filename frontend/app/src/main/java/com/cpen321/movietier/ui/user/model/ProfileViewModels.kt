package com.cpen321.movietier.ui.user.model

import com.cpen321.movietier.ui.auth.viewmodel.AuthViewModel
import com.cpen321.movietier.ui.user.viewmodel.ThemeViewModel
import com.cpen321.movietier.ui.watchlist.viewmodel.WatchlistViewModel

/**
 * Groups ViewModels for profile screen
 */
data class ProfileViewModels(
    val watchlistVm: WatchlistViewModel,
    val themeViewModel: ThemeViewModel,
    val authViewModel: AuthViewModel
)