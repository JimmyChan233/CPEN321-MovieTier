package com.cpen321.movietier.ui.watchlist

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.cpen321.movietier.ui.viewmodels.WatchlistViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WatchlistScreen(
    navController: NavController,
    vm: WatchlistViewModel = hiltViewModel()
) {
    val ui by vm.ui.collectAsState()

    Scaffold(topBar = {
        CenterAlignedTopAppBar(
            title = { Text("My Watchlist", style = MaterialTheme.typography.titleMedium) }
        )
    }) { padding ->
        if (ui.isLoading) {
            Box(Modifier.fillMaxSize().padding(padding)) { CircularProgressIndicator(Modifier.padding(24.dp)) }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(ui.items, key = { it.id }) { item ->
                    Card(Modifier.fillMaxWidth()) {
                        Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            AsyncImage(model = item.posterPath?.let { "https://image.tmdb.org/t/p/w185$it" }, contentDescription = item.title, modifier = Modifier.height(140.dp).aspectRatio(2f/3f))
                            Column(Modifier.weight(1f)) {
                                Text(item.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                item.overview?.let { Text(it, maxLines = 4, style = MaterialTheme.typography.bodyMedium) }
                            }
                        }
                    }
                }
                if (ui.items.isEmpty()) {
                    item { Text("Your watchlist is empty", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
            }
        }
    }
}

