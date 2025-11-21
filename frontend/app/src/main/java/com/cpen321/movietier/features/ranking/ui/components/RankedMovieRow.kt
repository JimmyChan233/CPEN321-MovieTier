package com.cpen321.movietier.features.ranking.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.cpen321.movietier.shared.models.Movie
import com.cpen321.movietier.shared.models.RankedMovie
import com.cpen321.movietier.data.repository.Result
import com.cpen321.movietier.features.ranking.ui.viewmodel.RankingViewModel

@Composable
internal fun RankedMovieRow(
    rankedMovie: RankedMovie,
    onClick: () -> Unit
) {
    val vm: RankingViewModel = hiltViewModel()
    var details by remember(rankedMovie.movie.id) { mutableStateOf<Movie?>(null) }

    LaunchedEffect(rankedMovie.movie.id) {
        when (val res = vm.getMovieDetails(rankedMovie.movie.id)) {
            is Result.Success -> details = res.data
            else -> {}
        }
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .testTag("ranked_movie_${rankedMovie.rank}"),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            RankedMovieRankBadgeAndPoster(rankedMovie)
            RankedMovieInfo(rankedMovie, details, Modifier.fillMaxWidth())
        }
    }
}
