package com.cpen321.movietier.ui.profile

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.cpen321.movietier.ui.components.Avatar
import com.cpen321.movietier.data.model.WatchlistItem
import com.cpen321.movietier.ui.viewmodels.FriendProfileViewModel
import androidx.compose.material3.ExperimentalMaterial3Api

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendProfileScreen(
    navController: NavController,
    userId: String,
    vm: FriendProfileViewModel = hiltViewModel()
) {
    val ui by vm.uiState.collectAsState()
    LaunchedEffect(userId) { vm.load(userId) }

    Scaffold(topBar = {
        CenterAlignedTopAppBar(title = { Text(ui.userName ?: "Profile") })
    }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            // Header
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Avatar(imageUrl = null, name = ui.userName ?: "", size = 64.dp)
                Column(Modifier.weight(1f)) {
                    Text(ui.userName ?: "", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(ui.userEmail ?: "", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            Spacer(Modifier.height(16.dp))
            Text("Watchlist", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))

            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(ui.watchlist, key = { it.id }) { item ->
                    WatchItemRow(item)
                }
            }
        }
    }
}

@Composable
private fun WatchItemRow(item: WatchlistItem) {
    Card(Modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            AsyncImage(
                model = item.posterPath?.let { "https://image.tmdb.org/t/p/w185$it" },
                contentDescription = item.title,
                modifier = Modifier.height(120.dp).aspectRatio(2f/3f)
            )
            Column(Modifier.weight(1f)) {
                Text(item.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                item.overview?.let { Text(it, maxLines = 3, style = MaterialTheme.typography.bodyMedium) }
            }
        }
    }
}
