package com.cpen321.movietier.shared.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Message
import androidx.compose.material.icons.filled.ThumbUp
import androidx.compose.material.icons.outlined.ThumbUp
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.cpen321.movietier.shared.models.FeedActivity
import com.cpen321.movietier.ui.util.formatIsoToPstDateTime

@Composable
fun FeedActivityCard(
    activity: FeedActivity,
    onClick: (() -> Unit)? = null,
    onLikeClick: (() -> Unit)? = null,
    onCommentClick: (() -> Unit)? = null,
    availabilityText: String? = null,
    modifier: Modifier = Modifier
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.98f else 1f,
        label = "feed_card_scale"
    )

    Card(
        modifier = modifier
            .fillMaxWidth()
            .scale(scale)
            .then(
                if (onClick != null) {
                    Modifier.clickable(
                        interactionSource = interactionSource,
                        indication = null,
                        onClick = onClick
                    )
                } else Modifier
            ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            FeedActivityHeader(activity)
            Spacer(modifier = Modifier.height(12.dp))
            FeedActivityMovieDetails(activity, availabilityText)
            Spacer(modifier = Modifier.height(12.dp))
            FeedActivitySocialActions(activity, onLikeClick, onCommentClick)
        }
    }
}

@Composable
private fun FeedActivityHeader(activity: FeedActivity) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        Avatar(
            imageUrl = activity.userProfileImage,
            name = activity.userName,
            size = 48.dp
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = buildAnnotatedString {
                    withStyle(style = SpanStyle(fontWeight = FontWeight.Bold)) {
                        append(activity.userName)
                    }
                    append(" ranked ")
                    withStyle(style = SpanStyle(fontWeight = FontWeight.Medium)) {
                        append(activity.movie.title)
                    }
                },
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = formatIsoToPstDateTime(activity.createdAt),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        activity.rank?.let { rank ->
            AssistChip(
                onClick = { },
                label = { Text(text = "#$rank", style = MaterialTheme.typography.labelLarge) }
            )
        }
    }
}

@Composable
private fun FeedActivityMovieDetails(
    activity: FeedActivity,
    availabilityText: String?
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        FeedActivityMovieInfo(activity, availabilityText)
        activity.movie.posterPath?.let { posterPath ->
            AsyncImage(
                model = "https://image.tmdb.org/t/p/w185$posterPath",
                contentDescription = "Poster for ${activity.movie.title}",
                modifier = Modifier
                    .height(180.dp)
                    .aspectRatio(2f / 3f),
                contentScale = ContentScale.Crop
            )
        }
    }
}

@Composable
private fun RowScope.FeedActivityMovieInfo(
    activity: FeedActivity,
    availabilityText: String?
) {
    Column(modifier = Modifier.weight(1f)) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            activity.movie.releaseDate?.take(4)?.let { year ->
                Text(
                    text = year,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            activity.movie.voteAverage?.let { rating ->
                StarRating(rating = rating, starSize = 14.dp)
            }
        }
        if (activity.movie.releaseDate != null || activity.movie.voteAverage != null) {
            Spacer(modifier = Modifier.height(6.dp))
        }

        activity.movie.overview?.let { overview ->
            if (overview.isNotBlank()) {
                Text(
                    text = overview,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 5,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
        availabilityText?.let {
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = it,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun FeedActivitySocialActions(
    activity: FeedActivity,
    onLikeClick: (() -> Unit)?,
    onCommentClick: (() -> Unit)?
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        FeedActivityLikeButton(activity, onLikeClick)
        FeedActivityCommentButton(activity, onCommentClick)
    }
}

@Composable
private fun FeedActivityLikeButton(
    activity: FeedActivity,
    onLikeClick: (() -> Unit)?
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .clickable(
                enabled = onLikeClick != null,
                onClick = { onLikeClick?.invoke() }
            )
            .padding(4.dp)
    ) {
        Icon(
            imageVector = if (activity.isLikedByUser) Icons.Filled.ThumbUp else Icons.Outlined.ThumbUp,
            contentDescription = "Like",
            modifier = Modifier.size(20.dp),
            tint = if (activity.isLikedByUser) {
                MaterialTheme.colorScheme.primary
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            }
        )
        Text(
            text = activity.likeCount.toString(),
            style = MaterialTheme.typography.bodySmall,
            color = if (activity.isLikedByUser) {
                MaterialTheme.colorScheme.primary
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            }
        )
    }
}

@Composable
private fun FeedActivityCommentButton(
    activity: FeedActivity,
    onCommentClick: (() -> Unit)?
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .clickable(
                enabled = onCommentClick != null,
                onClick = { onCommentClick?.invoke() }
            )
            .padding(4.dp)
    ) {
        Icon(
            imageVector = Icons.AutoMirrored.Outlined.Message,
            contentDescription = "Comments",
            modifier = Modifier.size(20.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = activity.commentCount.toString(),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
