package com.cpen321.movietier.ui.recommendation.model

import com.cpen321.movietier.ui.movie.viewmodel.RankingViewModel
import com.cpen321.movietier.ui.recommendation.viewmodel.RecommendationViewModel

/**
 * Groups ViewModels for recommendation screen dialogs
 */
data class RecommendationViewModels(
    val recommendationViewModel: RecommendationViewModel,
    val rankingViewModel: RankingViewModel
)
