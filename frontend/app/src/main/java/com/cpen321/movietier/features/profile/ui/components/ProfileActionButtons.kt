package com.cpen321.movietier.features.profile.ui.components

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.cpen321.movietier.features.auth.ui.state.AuthUiState

/**
 * Sign out and delete account action buttons.
 */
@Composable
internal fun ProfileActionButtons(
    uiState: AuthUiState,
    onSignOut: () -> Unit,
    onDeleteAccount: () -> Unit
) {
    Button(
        onClick = { if (!uiState.isLoading) onSignOut() },
        modifier = Modifier
            .fillMaxWidth()
            .testTag("sign_out_button"),
        colors = ButtonDefaults.filledTonalButtonColors()
    ) {
        Icon(
            Icons.Default.ExitToApp,
            contentDescription = null,
            modifier = Modifier.size(18.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text("Sign Out")
    }

    Spacer(modifier = Modifier.height(16.dp))

    Button(
        onClick = { if (!uiState.isLoading) onDeleteAccount() },
        modifier = Modifier
            .fillMaxWidth()
            .testTag("delete_account_button"),
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.error
        )
    ) {
        Text("Delete Account")
    }
}
