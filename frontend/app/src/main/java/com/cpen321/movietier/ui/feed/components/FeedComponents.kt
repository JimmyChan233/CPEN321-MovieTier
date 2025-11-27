package com.cpen321.movietier.ui.feed.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.cpen321.movietier.R
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.ui.common.components.EmptyState
import com.cpen321.movietier.ui.feed.viewmodel.FeedFilter
import com.cpen321.movietier.ui.feed.viewmodel.FeedViewModel
import com.cpen321.movietier.ui.navigation.NavRoutes

@Composable
internal fun ShimmerFeedCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Avatar shimmer
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .shimmerPlaceholder(visible = true, shape = MaterialTheme.shapes.small)
            )

            Column(modifier = Modifier.weight(1f)) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.7f)
                        .height(16.dp)
                        .shimmerPlaceholder(visible = true)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.4f)
                        .height(12.dp)
                        .shimmerPlaceholder(visible = true)
                )
            }
        }
    }
}

@Composable
internal fun FilterToggleFab(
    label: String,
    icon: ImageVector,
    selected: Boolean,
    onClick: () -> Unit
) {
    val containerColor = if (selected) {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.surfaceColorAtElevation(6.dp)
    }
    val contentColor = if (selected) {
        MaterialTheme.colorScheme.onPrimary
    } else {
        MaterialTheme.colorScheme.onSurfaceVariant
    }

    FloatingActionButton(
        onClick = onClick,
        shape = RoundedCornerShape(20.dp),
        containerColor = containerColor,
        contentColor = contentColor,
        elevation = FloatingActionButtonDefaults.elevation(
            defaultElevation = 6.dp,
            pressedElevation = 8.dp
        )
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(imageVector = icon, contentDescription = label, modifier = Modifier.size(18.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge,
                color = contentColor
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun FeedTopBar(onRefresh: () -> Unit) {
    TopAppBar(
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Image(
                    painter = painterResource(id = R.drawable.in_app_icon),
                    contentDescription = "MovieTier",
                    modifier = Modifier.size(32.dp)
                )
                Spacer(Modifier.width(8.dp))
                Text("MovieTier", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
        },
        actions = {
            IconButton(onClick = onRefresh, modifier = Modifier.testTag("refresh_button")) {
                Icon(Icons.Default.Refresh, contentDescription = "Refresh")
            }
        },
        windowInsets = WindowInsets(0, 0, 0, 0)
    )
}

@Composable
internal fun FeedFilterBar(
    currentFilter: FeedFilter,
    onFilterSelected: (FeedFilter) -> Unit
) {
    Row(
        modifier = Modifier.testTag("feed_filter_bar").fillMaxWidth().padding(bottom = 0.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically
    ) {
        FilterToggleFab(
            label = "Friends",
            icon = Icons.Filled.People,
            selected = currentFilter == FeedFilter.FRIENDS,
            onClick = { onFilterSelected(FeedFilter.FRIENDS) }
        )
        FilterToggleFab(
            label = "My Activities",
            icon = Icons.Filled.History,
            selected = currentFilter == FeedFilter.MINE,
            onClick = { onFilterSelected(FeedFilter.MINE) }
        )
    }
}

@Composable
internal fun FeedLoadingState() {
    LazyColumn(
        modifier = Modifier.fillMaxSize().testTag("feed_loading"),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 112.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(5) { ShimmerFeedCard() }
    }
}

@Composable
internal fun FeedEmptyState(navController: NavController) {
    Box(modifier = Modifier.fillMaxSize().testTag("feed_empty")) {
        EmptyState(
            icon = Icons.Default.Person,
            title = "No activity yet",
            message = "Add friends to see their rankings",
            primaryCta = {
                Button(
                    onClick = { navController.navigate(NavRoutes.FRIENDS) { popUpTo(NavRoutes.FEED) } },
                    modifier = Modifier.testTag("go_to_friends_button")
                ) {
                    Text("Add Friends")
                }
            }
        )
    }
}

@Composable
internal fun FeedComparisonOption(
    newMovie: Movie,
    compareWith: Movie,
    preferred: Movie,
    feedViewModel: FeedViewModel,
    modifier: Modifier
) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        AsyncImage(
            model = preferred.posterPath?.let { "https://image.tmdb.org/t/p/w342$it" },
            contentDescription = preferred.title,
            modifier = Modifier.fillMaxWidth().aspectRatio(2f / 3f).clip(MaterialTheme.shapes.medium),
            contentScale = ContentScale.Crop
        )
        Button(
            onClick = { feedViewModel.choosePreferred(newMovie, compareWith, preferred) },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(preferred.title, maxLines = 2, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodySmall)
        }
    }
}
