package com.cpen321.movietier.features.profile.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.cpen321.movietier.shared.models.Movie
import com.cpen321.movietier.shared.models.WatchlistItem
import com.cpen321.movietier.shared.navigation.NavRoutes
import com.cpen321.movietier.ui.viewmodels.WatchlistUiState

/**
 * Shows preview of first 3 watchlist items with link to full watchlist.
 */
@Composable
internal fun WatchlistPreviewSection(
    navController: NavController,
    watchUi: WatchlistUiState,
    movieDetails: Map<Int, Movie>
) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text("My Watchlist", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        TextButton(onClick = { navController.navigate(NavRoutes.WATCHLIST) }) { Text("View All") }
    }
    Spacer(Modifier.height(8.dp))
    Column(verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
        watchUi.items.take(3).forEach { item ->
            val details = movieDetails[item.movieId]
            WatchlistPreviewCard(item, details, navController)
        }
        if (watchUi.items.isEmpty()) {
            Text("Your watchlist is empty", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
