package com.cpen321.movietier.features.feed.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.People
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.cpen321.movietier.ui.viewmodels.FeedFilter

@Composable
fun FeedFilterBar(
    currentFilter: FeedFilter,
    onFilterChange: (FeedFilter) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        FilterChip(
            selected = currentFilter == FeedFilter.FRIENDS,
            onClick = { onFilterChange(FeedFilter.FRIENDS) },
            label = { Text("Friends") },
            leadingIcon = if (currentFilter == FeedFilter.FRIENDS) {
                { Icon(Icons.Default.People, contentDescription = null) }
            } else null,
            modifier = Modifier.weight(1f)
        )

        FilterChip(
            selected = currentFilter == FeedFilter.MINE,
            onClick = { onFilterChange(FeedFilter.MINE) },
            label = { Text("My Activity") },
            leadingIcon = if (currentFilter == FeedFilter.MINE) {
                { Icon(Icons.Default.History, contentDescription = null) }
            } else null,
            modifier = Modifier.weight(1f)
        )
    }
}
