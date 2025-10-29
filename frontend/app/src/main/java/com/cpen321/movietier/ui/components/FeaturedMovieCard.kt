package com.cpen321.movietier.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.cpen321.movietier.data.model.Movie

@Composable
fun FeaturedMovieCard(
    movie: Movie,
    quote: String,
    onClick: () -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
    isLoadingQuote: Boolean = false
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .height(260.dp)
            .clickable(onClick = onClick),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            FeaturedMovieBackdrop(movie)
            FeaturedMovieGradientOverlay()
            FeaturedMovieRefreshButton(onRefresh)
            FeaturedMovieContent(movie, quote, isLoadingQuote)
        }
    }
}

@Composable
private fun FeaturedMovieBackdrop(movie: Movie) {
    AsyncImage(
        model = movie.posterPath?.let { "https://image.tmdb.org/t/p/w780$it" },
        contentDescription = "Featured: ${movie.title}",
        modifier = Modifier.fillMaxSize(),
        contentScale = ContentScale.Crop
    )
}

@Composable
private fun FeaturedMovieGradientOverlay() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color.Transparent,
                        Color.Black.copy(alpha = 0.3f),
                        Color.Black.copy(alpha = 0.7f)
                    ),
                    startY = 0f,
                    endY = Float.POSITIVE_INFINITY
                )
            )
    )
}

@Composable
private fun FeaturedMovieRefreshButton(onRefresh: () -> Unit) {
    IconButton(
        onClick = onRefresh,
        modifier = Modifier
            .wrapContentSize(Alignment.TopEnd)
            .padding(8.dp)
    ) {
        Icon(
            imageVector = Icons.Default.Refresh,
            contentDescription = "Refresh featured movie",
            tint = Color.White
        )
    }
}

@Composable
private fun FeaturedMovieContent(
    movie: Movie,
    quote: String,
    isLoadingQuote: Boolean
) {
    Column(
        modifier = Modifier
            .wrapContentSize(Alignment.BottomStart)
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = movie.title,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = Color.White,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )

        movie.voteAverage?.let { rating ->
            StarRating(
                rating = rating,
                starSize = 14.dp,
                showRatingNumber = true
            )
        }

        FeaturedMovieQuoteSection(quote, isLoadingQuote)
    }
}

@Composable
private fun FeaturedMovieQuoteSection(
    quote: String,
    isLoadingQuote: Boolean
) {
    when {
        isLoadingQuote -> {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(32.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.size(16.dp),
                    strokeWidth = 2.dp,
                    color = Color.White
                )
                Text(
                    text = "Loading quote...",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.7f),
                    fontStyle = FontStyle.Italic
                )
            }
        }
        quote.isNotEmpty() -> {
            Text(
                text = "\"$quote\"",
                style = MaterialTheme.typography.bodyMedium,
                fontStyle = FontStyle.Italic,
                color = Color.White.copy(alpha = 0.95f),
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}
