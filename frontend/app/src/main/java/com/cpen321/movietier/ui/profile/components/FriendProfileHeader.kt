package com.cpen321.movietier.ui.profile.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.cpen321.movietier.ui.components.Avatar

/**
 * Friend profile header with avatar, name, and email.
 */
@Composable
internal fun FriendProfileHeader(
    userName: String?,
    userEmail: String?,
    profileImageUrl: String?
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.padding(vertical = 16.dp)
    ) {
        Avatar(imageUrl = profileImageUrl, name = userName ?: "", size = 64.dp)
        Column(Modifier.weight(1f)) {
            Text(userName ?: "", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(userEmail ?: "", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
