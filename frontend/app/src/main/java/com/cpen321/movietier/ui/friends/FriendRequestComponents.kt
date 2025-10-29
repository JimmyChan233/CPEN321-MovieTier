package com.cpen321.movietier.ui.friends

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.cpen321.movietier.ui.components.Avatar
import com.cpen321.movietier.ui.viewmodels.FriendRequestUi

/**
 * Displays an incoming friend request card with accept/reject actions
 */
@Composable
internal fun RequestRow(
    request: FriendRequestUi,
    onAccept: () -> Unit,
    onReject: () -> Unit,
    onViewProfile: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.98f else 1f,
        label = "request_row_scale"
    )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .scale(scale)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onViewProfile
            )
            .testTag("request_row_${request.id}")
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Avatar(
                imageUrl = request.senderProfileImage,
                name = request.senderName.ifBlank { request.senderId.takeLast(6) },
                size = 48.dp
            )
            RequestSenderInfo(request, Modifier.weight(1f))
            RequestActionButtons(onAccept, onReject)
        }
    }
}

/**
 * Displays sender information (name and email) for a friend request
 */
@Composable
private fun RequestSenderInfo(request: FriendRequestUi, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        Text(
            text = request.senderName.ifBlank { "Incoming request" },
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        if (request.senderEmail.isNotBlank()) {
            Text(
                text = request.senderEmail,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

/**
 * Displays Accept and Reject action buttons for friend requests
 */
@Composable
private fun RequestActionButtons(onAccept: () -> Unit, onReject: () -> Unit) {
    Column(
        verticalArrangement = Arrangement.spacedBy(6.dp),
        horizontalAlignment = Alignment.End
    ) {
        Button(
            onClick = onAccept,
            modifier = Modifier.height(32.dp),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp)
        ) {
            Text("Accept", style = MaterialTheme.typography.labelSmall)
        }
        OutlinedButton(
            onClick = onReject,
            modifier = Modifier.height(32.dp),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp)
        ) {
            Text("Reject", style = MaterialTheme.typography.labelSmall)
        }
    }
}

/**
 * Displays an outgoing friend request card with cancel action
 */
@Composable
internal fun OutgoingRequestRow(
    request: FriendRequestUi,
    onCancel: () -> Unit,
    onViewProfile: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.98f else 1f,
        label = "outgoing_request_row_scale"
    )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .scale(scale)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onViewProfile
            )
            .testTag("outgoing_request_row_${request.id}")
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Avatar(
                imageUrl = request.senderProfileImage,
                name = request.senderName.ifBlank { request.senderId.takeLast(6) },
                size = 48.dp
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = request.senderName.ifBlank { "Pending request" },
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                if (request.senderEmail.isNotBlank()) {
                    Text(
                        text = request.senderEmail,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            OutlinedButton(onClick = onCancel) { Text("Cancel") }
        }
    }
}
