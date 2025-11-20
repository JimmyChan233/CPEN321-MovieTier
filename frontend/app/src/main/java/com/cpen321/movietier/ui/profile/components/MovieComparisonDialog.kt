package com.cpen321.movietier.ui.profile.components

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
import com.cpen321.movietier.ui.viewmodels.CompareUiState
import com.cpen321.movietier.ui.viewmodels.RankingViewModel

/**
 * Dialog for comparing two movies and choosing preference.
 */
@Composable
internal fun MovieComparisonDialog(
    compareState: CompareUiState,
    rankingViewModel: RankingViewModel
) {
    AlertDialog(
        onDismissRequest = {},
        title = { Text("Which movie do you prefer?") },
        text = {
            Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("Help us place '${compareState.newMovie.title}' in your rankings:", style = MaterialTheme.typography.bodyMedium)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    MovieComparisonOption(compareState.newMovie, compareState, rankingViewModel, Modifier.weight(1f))
                    MovieComparisonOption(compareState.compareWith, compareState, rankingViewModel, Modifier.weight(1f))
                }
            }
        },
        confirmButton = {},
        dismissButton = {}
    )
}
