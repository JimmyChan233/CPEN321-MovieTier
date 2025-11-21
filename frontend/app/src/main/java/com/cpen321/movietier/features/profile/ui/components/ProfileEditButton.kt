package com.cpen321.movietier.features.profile.ui.components

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavController
import com.cpen321.movietier.shared.navigation.NavRoutes

/**
 * Button to navigate to profile editing screen.
 */
@Composable
internal fun ProfileEditButton(navController: NavController) {
    Button(
        onClick = { navController.navigate(NavRoutes.EDIT_PROFILE) },
        modifier = Modifier.fillMaxWidth(),
        colors = ButtonDefaults.filledTonalButtonColors()
    ) {
        Text("Edit Profile")
    }
}
