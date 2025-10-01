package com.cpen321.movietier.ui.recommendation

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.cpen321.movietier.ui.viewmodels.RecommendationViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecommendationScreen(
    navController: NavController,
    recommendationViewModel: RecommendationViewModel = hiltViewModel()
) {
    val uiState by recommendationViewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Recommended Movies") })
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                uiState.isLoading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                uiState.recommendations.isEmpty() -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text("No recommendations yet")
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Rank some movies to get personalized recommendations")
                    }
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(uiState.recommendations) { movie ->
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text(
                                        text = movie.title,
                                        style = MaterialTheme.typography.titleMedium
                                    )
                                    movie.overview?.let {
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = it,
                                            style = MaterialTheme.typography.bodySmall,
                                            maxLines = 3
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
