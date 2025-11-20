package com.cpen321.movietier.ui.ranking.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.cpen321.movietier.data.model.Movie

@Composable
internal fun MovieSearchResultsList(
    searchResults: List<Movie>,
    onAddMovie: (Movie) -> Unit
) {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.heightIn(max = 520.dp)
    ) {
        items(searchResults, key = { it.id }) { movie ->
            MovieSearchResultCard(movie, onAddMovie)
        }
    }
}
