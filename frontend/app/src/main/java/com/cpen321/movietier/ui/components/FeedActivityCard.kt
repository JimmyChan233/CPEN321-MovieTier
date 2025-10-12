package com.cpen321.movietier.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
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
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.cpen321.movietier.data.model.FeedActivity

@Composable
fun FeedActivityCard(
    activity: FeedActivity,
    onClick: (() -> Unit)? = null,
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
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Avatar
            Avatar(
                imageUrl = activity.userProfileImage,
                name = activity.userName,
                size = 48.dp
            )

            // Content Column
            Column(
                modifier = Modifier
                    .weight(1f)
                    .align(Alignment.CenterVertically)
            ) {
                // Username and action text
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

                // Timestamp
                Text(
                    text = activity.createdAt,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Rank chip on the right
            activity.rank?.let { rank ->
                AssistChip(
                    onClick = { },
                    label = {
                        Text(
                            text = "#$rank",
                            style = MaterialTheme.typography.labelLarge
                        )
                    },
                    modifier = Modifier.align(Alignment.CenterVertically)
                )
            }
        }

        // Optional small poster thumbnail
        activity.movie.posterPath?.let { posterPath ->
            AsyncImage(
                model = "https://image.tmdb.org/t/p/w92$posterPath",
                contentDescription = "Poster thumbnail for ${activity.movie.title}",
                modifier = Modifier
                    .padding(horizontal = 16.dp)
                    .padding(bottom = 12.dp)
                    .height(80.dp)
                    .aspectRatio(2f / 3f),
                contentScale = ContentScale.Crop
            )
        }
    }
}
