package com.cpen321.movietier.features.ranking.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.cpen321.movietier.shared.models.Movie
import com.cpen321.movietier.features.ranking.ui.state.CompareUiState

@Composable
internal fun MovieComparisonDialog(
    compareState: Any,
    onCompare: (Movie, Movie, Movie) -> Unit
) {
    val state = compareState as? CompareUiState ?: return

    AlertDialog(
        onDismissRequest = { /* Disabled during ranking */ },
        title = { Text("Which movie do you prefer?") },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    "Help us place '${state.newMovie.title}' in your rankings:",
                    style = MaterialTheme.typography.bodyMedium
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    ComparisonMovieOption(
                        movie = state.newMovie,
                        onSelect = { onCompare(state.newMovie, state.compareWith, state.newMovie) },
                        modifier = Modifier.weight(1f)
                    )
                    ComparisonMovieOption(
                        movie = state.compareWith,
                        onSelect = { onCompare(state.newMovie, state.compareWith, state.compareWith) },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        },
        confirmButton = {},
        dismissButton = {}
    )
}
