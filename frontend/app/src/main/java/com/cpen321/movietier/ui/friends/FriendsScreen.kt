package com.cpen321.movietier.ui.friends

import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import androidx.navigation.compose.rememberNavController
import com.cpen321.movietier.ui.components.Avatar
import com.cpen321.movietier.ui.components.EmptyState
import com.cpen321.movietier.ui.components.LoadingState
import com.cpen321.movietier.ui.theme.MovieTierTheme
import com.cpen321.movietier.ui.viewmodels.FriendViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendsScreen(
    navController: NavController,
    friendViewModel: FriendViewModel = hiltViewModel()
) {
    val uiState by friendViewModel.uiState.collectAsState()
    var showAddFriendDialog by remember { mutableStateOf(false) }

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .testTag("friends_screen"),
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Friends", style = MaterialTheme.typography.titleMedium) },
                actions = {
                    IconButton(
                        onClick = { showAddFriendDialog = true },
                        modifier = Modifier.testTag("add_friend_button")
                    ) {
                        Icon(Icons.Default.Add, contentDescription = "Add Friend")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddFriendDialog = true },
                modifier = Modifier.testTag("add_friend_fab")
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Friend")
            }
        }
    ) { padding ->
        Crossfade(
            targetState = when {
                uiState.isLoading -> FriendsState.LOADING
                uiState.friends.isEmpty() -> FriendsState.EMPTY
                else -> FriendsState.CONTENT
            },
            label = "friends_state"
        ) { state ->
            when (state) {
                FriendsState.LOADING -> {
                    LoadingState(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding),
                        hint = "Loading friends..."
                    )
                }
                FriendsState.EMPTY -> {
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
                                    onClick = { showAddFriendDialog = true },
                                    modifier = Modifier.testTag("empty_add_friend_button")
                                ) {
                                    Text("Add Friend")
                                }
                            }
                        )
                    }
                }
                FriendsState.CONTENT -> {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                            .testTag("friends_list"),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(
                            items = uiState.friends,
                            key = { it.id }
                        ) { friend ->
                            FriendRow(
                                friend = friend,
                                onRemove = { friendViewModel.removeFriend(friend.id) }
                            )
                        }
                    }
                }
            }
        }
    }

    if (showAddFriendDialog) {
        AddFriendDialog(
            onDismiss = { showAddFriendDialog = false },
            onSendRequest = { email ->
                friendViewModel.sendFriendRequest(email)
                showAddFriendDialog = false
            }
        )
    }
}

private enum class FriendsState {
    LOADING, EMPTY, CONTENT
}

@Composable
private fun FriendRow(
    friend: com.cpen321.movietier.data.model.Friend,
    onRemove: () -> Unit
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
                onClick = { }
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
                imageUrl = null,
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

            IconButton(
                onClick = onRemove,
                modifier = Modifier.testTag("remove_friend_button_${friend.id}")
            ) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = "Remove ${friend.name}",
                    tint = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

@Composable
fun AddFriendDialog(
    onDismiss: () -> Unit,
    onSendRequest: (String) -> Unit
) {
    var email by remember { mutableStateOf("") }
    val isValidEmail = email.contains("@") && email.contains(".")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Friend") },
        text = {
            Column {
                Text(
                    text = "Enter your friend's email address",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Friend's Email") },
                    singleLine = true,
                    isError = email.isNotBlank() && !isValidEmail,
                    supportingText = {
                        if (email.isNotBlank() && !isValidEmail) {
                            Text("Please enter a valid email address")
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("email_input")
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onSendRequest(email) },
                enabled = isValidEmail,
                modifier = Modifier.testTag("send_request_button")
            ) {
                Text("Send Request")
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                modifier = Modifier.testTag("cancel_button")
            ) {
                Text("Cancel")
            }
        }
    )
}

@Preview(showBackground = true)
@Composable
private fun FriendsScreenPreview() {
    MovieTierTheme {
        val navController = rememberNavController()
        FriendsScreen(navController = navController)
    }
}
