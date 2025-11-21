package com.cpen321.movietier.features.friends.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.cpen321.movietier.shared.models.Friend
import com.cpen321.movietier.shared.components.Avatar
import com.cpen321.movietier.shared.navigation.NavRoutes

@Composable
fun FriendCard(
    friend: Friend,
    onRemove: () -> Unit,
    navController: NavController? = null
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.98f else 1f,
        label = "friend_row_scale"
    )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .scale(scale)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = { navController?.navigate(NavRoutes.PROFILE_USER.replace("{userId}", friend.id)) }
            )
            .testTag("friend_row_${friend.id}")
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Avatar(
                imageUrl = friend.profileImageUrl,
                name = friend.name,
                size = 48.dp
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = friend.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = friend.email,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            RemoveFriendButton(friend, onRemove)
        }
    }
}

@Composable
private fun RemoveFriendButton(
    friend: Friend,
    onRemove: () -> Unit
) {
    var showConfirm by remember { mutableStateOf(false) }

    IconButton(
        onClick = { showConfirm = true },
        modifier = Modifier.testTag("remove_friend_button_${friend.id}")
    ) {
        Icon(
            Icons.Default.Delete,
            contentDescription = "Remove ${friend.name}",
            tint = MaterialTheme.colorScheme.error
        )
    }

    if (showConfirm) {
        RemoveFriendConfirmDialog(
            friendName = friend.name,
            onConfirm = {
                showConfirm = false
                onRemove()
            },
            onDismiss = { showConfirm = false }
        )
    }
}

@Composable
private fun RemoveFriendConfirmDialog(
    friendName: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Remove Friend?") },
        text = {
            Text(
                "Are you sure you want to remove $friendName? You will no longer see their updates.",
                style = MaterialTheme.typography.bodyMedium
            )
        },
        confirmButton = {
            TextButton(onClick = onConfirm) {
                Text("Remove", color = MaterialTheme.colorScheme.error)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
