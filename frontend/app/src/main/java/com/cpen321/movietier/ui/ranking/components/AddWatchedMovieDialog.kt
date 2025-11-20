package com.cpen321.movietier.ui.ranking.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.cpen321.movietier.data.model.Movie

@Composable
internal fun AddWatchedMovieDialog(
    query: String,
    onQueryChange: (String) -> Unit,
    searchResults: List<Movie>,
    onAddMovie: (Movie) -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Watched Movie") },
        text = {
            Column(Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = query,
                    onValueChange = onQueryChange,
                    label = { Text("Search title") },
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("search_movie_input")
                )
                Spacer(Modifier.height(12.dp))
                if (query.length >= 2 && searchResults.isEmpty()) {
                    Text(
                        "No results",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                MovieSearchResultsList(searchResults, onAddMovie)
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("Close") }
        }
    )
}
