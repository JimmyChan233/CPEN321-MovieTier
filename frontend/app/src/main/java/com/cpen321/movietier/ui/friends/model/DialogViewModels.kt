package com.cpen321.movietier.ui.friends.model

import com.cpen321.movietier.ui.movie.viewmodel.RankingViewModel

/**
 * Groups ViewModels and NavController for dialog screens
 */
data class DialogViewModels(
    val vm: Any,
    val rankingViewModel: RankingViewModel,
    val navController: androidx.navigation.NavController
)
