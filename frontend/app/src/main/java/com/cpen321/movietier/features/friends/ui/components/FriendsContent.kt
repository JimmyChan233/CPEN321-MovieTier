package com.cpen321.movietier.features.friends.ui.components

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.cpen321.movietier.shared.models.Friend
import com.cpen321.movietier.shared.components.EmptyState
import com.cpen321.movietier.shared.components.LoadingState
import com.cpen321.movietier.features.friends.ui.state.FriendUiState
import com.cpen321.movietier.features.friends.ui.viewmodel.FriendViewModel
import androidx.compose.foundation.layout.Arrangement

private enum class FriendsScreenState {
    LOADING, EMPTY, CONTENT
}

@Composable
fun FriendsMainContent(
    padding: PaddingValues,
    uiState: FriendUiState,
    friendViewModel: FriendViewModel,
    navController: NavController,
    onShowAddDialog: () -> Unit
) {
    Crossfade(
        targetState = when {
            uiState.isLoading -> FriendsScreenState.LOADING
            uiState.friends.isEmpty() && uiState.requests.isEmpty() && uiState.outgoingRequests.isEmpty() -> FriendsScreenState.EMPTY
            else -> FriendsScreenState.CONTENT
        },
        label = "friends_state"
    ) { state ->
        when (state) {
            FriendsScreenState.LOADING -> LoadingState(Modifier.fillMaxSize().padding(padding), "Loading friends...")
            FriendsScreenState.EMPTY -> FriendsEmptyState(padding, onShowAddDialog)
            FriendsScreenState.CONTENT -> FriendsContentList(padding, uiState, friendViewModel, navController)
        }
    }
}

@Composable
private fun FriendsEmptyState(
    padding: PaddingValues,
    onAddFriend: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .testTag("friends_empty")
    ) {
        EmptyState(
            icon = Icons.Default.Person,
            title = "No friends yet",
            message = "Add friends to share rankings",
            primaryCta = {
                Button(
                    onClick = onAddFriend,
                    modifier = Modifier.testTag("empty_add_friend_button")
                ) {
                    Text("Add Friend")
                }
            }
        )
    }
}

@Composable
private fun FriendsContentList(
    padding: PaddingValues,
    uiState: FriendUiState,
    friendViewModel: FriendViewModel,
    navController: NavController
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(padding).testTag("friends_list"),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        OutgoingRequestsSection(uiState.outgoingRequests, friendViewModel, navController)
        IncomingRequestsSection(uiState.requests, friendViewModel, navController)
        FriendsListSection(uiState.friends, friendViewModel, navController)
    }
}
