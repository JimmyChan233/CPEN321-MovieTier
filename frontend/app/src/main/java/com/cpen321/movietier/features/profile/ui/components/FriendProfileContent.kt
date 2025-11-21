package com.cpen321.movietier.features.profile.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.cpen321.movietier.shared.models.Movie
import com.cpen321.movietier.ui.viewmodels.FriendProfileUi

/**
 * Main content area for friend profile with tabs for rankings and watchlist.
 */
@Composable
internal fun FriendProfileContent(
    ui: FriendProfileUi,
    movieDetailsMap: Map<Int, Movie>,
    padding: PaddingValues,
    onMovieSelect: (Movie) -> Unit
) {
    var tabIndex by remember { mutableStateOf(0) }
    val tabs = listOf("Rankings", "Watchlist")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .padding(horizontal = 16.dp)
    ) {
        // Friend profile header with avatar, name, and email
        FriendProfileHeader(
            userName = ui.userName,
            userEmail = ui.userEmail,
            profileImageUrl = ui.profileImageUrl
        )

        // Show error if loading failed
        if (ui.errorMessage != null) {
            Text(
                text = "Error: ${ui.errorMessage}",
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium
            )
        }

        // Tab row for switching between rankings and watchlist
        TabRow(selectedTabIndex = tabIndex) {
            tabs.forEachIndexed { index, title ->
                Tab(
                    text = { Text(title) },
                    selected = tabIndex == index,
                    onClick = { tabIndex = index }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Display selected tab content
        when (tabIndex) {
            0 -> FriendRankingsList(
                rankings = ui.rankings,
                movieDetailsMap = movieDetailsMap,
                onMovieSelect = onMovieSelect
            )
            1 -> FriendWatchlistTab(
                watchlist = ui.watchlist,
                movieDetailsMap = movieDetailsMap,
                onMovieSelect = onMovieSelect
            )
        }
    }
}
