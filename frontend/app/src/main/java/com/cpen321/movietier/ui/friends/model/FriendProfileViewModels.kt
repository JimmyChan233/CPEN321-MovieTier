package com.cpen321.movietier.ui.friends.model

import com.cpen321.movietier.ui.friends.viewmodels.FriendProfileViewModel
import com.cpen321.movietier.ui.movie.viewmodel.RankingViewModel

/**
 * Groups ViewModels for friend profile side effects
 */
data class FriendProfileViewModels(
    val vm: FriendProfileViewModel,
    val rankingViewModel: RankingViewModel
)