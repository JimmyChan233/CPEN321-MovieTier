package com.cpen321.movietier.ui.profile.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.ui.viewmodels.CompareUiState
import com.cpen321.movietier.ui.viewmodels.RankingViewModel

/**
 * Single movie comparison option in preference dialog.
 */
@Composable
internal fun MovieComparisonOption(
    movie: Movie,
    compareState: CompareUiState,
    rankingViewModel: RankingViewModel,
    modifier: Modifier = Modifier
) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        AsyncImage(
            model = movie.posterPath?.let { "https://image.tmdb.org/t/p/w342$it" },
            contentDescription = movie.title,
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(2f / 3f)
                .clip(MaterialTheme.shapes.medium),
            contentScale = ContentScale.Crop
        )
        Button(
            onClick = { rankingViewModel.compareMovies(compareState.newMovie, compareState.compareWith, movie) },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(movie.title, maxLines = 2, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodySmall)
        }
    }
}
