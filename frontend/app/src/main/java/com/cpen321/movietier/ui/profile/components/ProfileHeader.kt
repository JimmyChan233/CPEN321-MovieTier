package com.cpen321.movietier.ui.profile.components

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.cpen321.movietier.data.model.User
import com.cpen321.movietier.ui.components.Avatar

/**
 * Displays user profile header with avatar, name, and email.
 */
@Composable
internal fun ProfileHeader(user: User) {
    Avatar(
        imageUrl = user.profileImageUrl,
        name = user.name,
        size = 80.dp
    )

    Spacer(modifier = Modifier.height(16.dp))

    Text(
        text = user.name,
        style = MaterialTheme.typography.headlineMedium,
        fontWeight = FontWeight.Bold
    )

    Spacer(modifier = Modifier.height(8.dp))

    Text(
        text = user.email,
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
}
