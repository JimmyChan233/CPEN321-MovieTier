package com.cpen321.movietier.ui.profile.components

import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.style.TextOverflow
import androidx.navigation.NavController

/**
 * Top app bar for friend profile screen with back navigation.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun FriendProfileTopBar(
    userName: String?,
    navController: NavController
) {
    CenterAlignedTopAppBar(
        title = { Text(userName ?: "Profile", maxLines = 1, overflow = TextOverflow.Ellipsis) },
        navigationIcon = {
            IconButton(onClick = { navController.navigateUp() }) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            }
        },
        windowInsets = WindowInsets(0, 0, 0, 0)
    )
}
