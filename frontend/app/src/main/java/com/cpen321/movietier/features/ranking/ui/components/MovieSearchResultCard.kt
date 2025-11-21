package com.cpen321.movietier.features.ranking.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.cpen321.movietier.shared.models.Movie

@Composable
internal fun MovieSearchResultCard(
    movie: Movie,
    onAddMovie: (Movie) -> Unit
) {
    Card(Modifier.fillMaxWidth().testTag("search_result_${movie.id}")) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            AsyncImage(
                model = movie.posterPath?.let { "https://image.tmdb.org/t/p/w154$it" },
                contentDescription = movie.title,
                modifier = Modifier
                    .height(96.dp)
                    .aspectRatio(2f / 3f)
                    .clip(MaterialTheme.shapes.small),
                contentScale = ContentScale.Crop
            )
            Column(Modifier.weight(1f)) {
                Text(
                    movie.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Medium
                )
                val subtitle = buildString {
                    movie.releaseDate?.take(4)?.let { append(it) }
                    val castStr = movie.cast?.take(3)?.joinToString()
                    if (!castStr.isNullOrBlank()) {
                        if (isNotEmpty()) append(" • ")
                        append(castStr)
                    }
                }
                if (subtitle.isNotBlank()) {
                    Text(
                        subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 3
                    )
                }
            }
            TextButton(onClick = { onAddMovie(movie) }) { Text("Add") }
        }
    }
}
