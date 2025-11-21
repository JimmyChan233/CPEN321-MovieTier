package com.cpen321.movietier.features.friends.ui.screens

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import androidx.navigation.compose.rememberNavController
import com.cpen321.movietier.features.friends.ui.components.AddFriendDialog
import com.cpen321.movietier.features.friends.ui.components.FriendsMainContent
import com.cpen321.movietier.features.friends.ui.components.FriendsTopBar
import com.cpen321.movietier.shared.components.MovieTierTheme
import com.cpen321.movietier.features.friends.ui.viewmodel.FriendViewModel
import androidx.compose.ui.tooling.preview.Preview

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendsScreen(
    navController: NavController,
    friendViewModel: FriendViewModel = hiltViewModel()
) {
    val uiState by friendViewModel.uiState.collectAsState()
    var showAddFriendDialog by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }

    FriendsEventHandler(friendViewModel, snackbarHostState)

    Scaffold(
        modifier = Modifier.fillMaxSize().testTag("friends_screen"),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = { FriendsTopBar() },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddFriendDialog = true },
                modifier = Modifier.testTag("add_friend_fab")
            ) { Icon(Icons.Default.Add, contentDescription = "Add Friend") }
        }
    ) { padding ->
        FriendsMainContent(padding, uiState, friendViewModel, navController) { showAddFriendDialog = true }
    }

    if (showAddFriendDialog) {
        AddFriendDialog(
            onDismiss = { friendViewModel.clearSearch(); showAddFriendDialog = false },
            onSendRequest = { email -> friendViewModel.sendFriendRequest(email); showAddFriendDialog = false }
        )
    }
}

@Composable
private fun FriendsEventHandler(friendViewModel: FriendViewModel, snackbarHostState: SnackbarHostState) {
    LaunchedEffect(Unit) {
        friendViewModel.events.collect { event ->
            when (event) {
                is com.cpen321.movietier.ui.viewmodels.UiEvent.Message -> snackbarHostState.showSnackbar(event.text)
            }
        }
    }
}

@Preview
@Composable
fun FriendsScreenPreview() {
    MovieTierTheme {
        FriendsScreen(rememberNavController())
    }
}
