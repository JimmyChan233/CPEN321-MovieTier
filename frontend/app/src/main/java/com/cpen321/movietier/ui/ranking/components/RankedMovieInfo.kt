package com.cpen321.movietier.ui.ranking.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.data.model.RankedMovie

@Composable
internal fun RankedMovieInfo(
    rankedMovie: RankedMovie,
    details: Movie?,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        Text(
            text = rankedMovie.movie.title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(4.dp))

        RankedMovieMetadata(rankedMovie, details)

        details?.cast?.take(3)?.let { cast ->
            if (cast.isNotEmpty()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = cast.joinToString(),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        (details?.overview ?: rankedMovie.movie.overview)?.let { overview ->
            if (overview.isNotBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = overview,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 4,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
