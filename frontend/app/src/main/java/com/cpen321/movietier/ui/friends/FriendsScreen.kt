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
import androidx.compose.ui.text.style.TextOverflow
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
import com.cpen321.movietier.ui.viewmodels.FriendRequestUi
import com.cpen321.movietier.ui.navigation.NavRoutes
import androidx.compose.foundation.Image
import androidx.compose.ui.res.painterResource
import com.cpen321.movietier.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendsScreen(
    navController: NavController,
    friendViewModel: FriendViewModel = hiltViewModel()
) {
    val uiState by friendViewModel.uiState.collectAsState()
    var showAddFriendDialog by remember { mutableStateOf(false) }

    val snackbarHostState = remember { SnackbarHostState() }

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .testTag("friends_screen"),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Image(
                            painter = painterResource(id = R.drawable.in_app_icon),
                            contentDescription = "MovieTier",
                            modifier = Modifier.size(32.dp)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text("MovieTier", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    }
                },
                windowInsets = WindowInsets(0, 0, 0, 0)
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
                uiState.friends.isEmpty() && uiState.requests.isEmpty() && uiState.outgoingRequests.isEmpty() -> FriendsState.EMPTY
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
                        // Outgoing first (only when not empty)
                        if (uiState.outgoingRequests.isNotEmpty()) {
                            item(key = "outgoing_header") {
                                Text(
                                    text = "Outgoing Requests",
                                    style = MaterialTheme.typography.titleMedium,
                                    modifier = Modifier.padding(bottom = 8.dp)
                                )
                            }
                            items(
                                items = uiState.outgoingRequests,
                                key = { "out_" + it.id }
                            ) { req ->
                                OutgoingRequestRow(
                                    request = req,
                                    onCancel = { friendViewModel.cancelOutgoingRequest(req.id) },
                                    onViewProfile = { navController.navigate(NavRoutes.PROFILE_USER.replace("{userId}", req.senderId)) }
                                )
                            }
                            item(key = "after_outgoing_spacer") { Spacer(Modifier.height(16.dp)) }
                        }

                        // Incoming requests section (shows empty state if none)
                        item(key = "requests_header") {
                            Text(
                                text = "Friend Requests",
                                style = MaterialTheme.typography.titleMedium,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )
                        }
                        if (uiState.requests.isEmpty()) {
                            item(key = "requests_empty") {
                                Text(
                                    text = "No incoming requests",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        } else {
                            items(
                                items = uiState.requests,
                                key = { "req_" + it.id }
                            ) { req ->
                                RequestRow(
                                    request = req,
                                    onAccept = { friendViewModel.respondToRequest(req.id, true) },
                                    onReject = { friendViewModel.respondToRequest(req.id, false) },
                                    onViewProfile = { navController.navigate(NavRoutes.PROFILE_USER.replace("{userId}", req.senderId)) }
                                )
                            }
                        }
                        item(key = "friends_header_spacer") { Spacer(Modifier.height(16.dp)) }
                        item(key = "friends_header") {
                            Text(
                                text = "Friends",
                                style = MaterialTheme.typography.titleMedium,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )
                        }
                        items(
                            items = uiState.friends,
                            key = { it.id }
                        ) { friend ->
                            FriendRow(
                                friend = friend,
                                onRemove = { friendViewModel.removeFriend(friend.id) },
                                navController = navController
                            )
                        }
                    }
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        friendViewModel.events.collect { event ->
            when (event) {
                is com.cpen321.movietier.ui.viewmodels.UiEvent.Message -> snackbarHostState.showSnackbar(event.text)
            }
        }
    }

    if (showAddFriendDialog) {
        AddFriendDialog(
            onDismiss = {
                friendViewModel.clearSearch()
                showAddFriendDialog = false
            },
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
                AlertDialog(
                    onDismissRequest = { showConfirm = false },
                    title = { Text("Remove Friend?") },
                    text = {
                        Text(
                            "Are you sure you want to remove ${friend.name}? You will no longer see their updates.",
                            style = MaterialTheme.typography.bodyMedium
                        )
                    },
                    confirmButton = {
                        TextButton(onClick = {
                            showConfirm = false
                            onRemove()
                        }) { Text("Remove", color = MaterialTheme.colorScheme.error) }
                    },
                    dismissButton = {
                        TextButton(onClick = { showConfirm = false }) { Text("Cancel") }
                    }
                )
            }
        }
    }
}

@Composable
fun AddFriendDialog(
    onDismiss: () -> Unit,
    onSendRequest: (String) -> Unit,
    friendViewModel: FriendViewModel = hiltViewModel()
) {
    var tabIndex by remember { mutableStateOf(0) } // 0 = Email, 1 = Name
    var email by remember { mutableStateOf("") }
    var nameQuery by remember { mutableStateOf("") }
    val isValidEmail = email.contains("@") && email.contains(".")
    val searchResults by friendViewModel.searchResults.collectAsState()
    val ui by friendViewModel.uiState.collectAsState()

    LaunchedEffect(nameQuery) {
        if (tabIndex == 1) {
            if (nameQuery.length >= 2) friendViewModel.searchUsers(nameQuery) else friendViewModel.searchUsers("")
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Friend") },
        text = {
            Column {
                TabRow(selectedTabIndex = tabIndex) {
                    Tab(selected = tabIndex == 0, onClick = { tabIndex = 0 }) { Text("By Email", modifier = Modifier.padding(12.dp)) }
                    Tab(selected = tabIndex == 1, onClick = { tabIndex = 1 }) { Text("By Name", modifier = Modifier.padding(12.dp)) }
                }
                Spacer(modifier = Modifier.height(12.dp))
                when (tabIndex) {
                    0 -> {
                        Text(
                            text = "Enter your friend's email address",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        OutlinedTextField(
                            value = email,
                            onValueChange = { email = it },
                            label = { Text("Email") },
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
                    1 -> {
                        Text(
                            text = "Search users by name",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        OutlinedTextField(
                            value = nameQuery,
                            onValueChange = { nameQuery = it },
                            label = { Text("Name") },
                            singleLine = true,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("name_input")
                        )
                        if (nameQuery.length >= 2 && searchResults.isEmpty()) {
                            Spacer(Modifier.height(12.dp))
                            Text(
                                text = "No users found",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        if (searchResults.isNotEmpty()) {
                            Spacer(Modifier.height(12.dp))
                            Text(
                                text = "Results",
                                style = MaterialTheme.typography.titleSmall
                            )
                            Spacer(Modifier.height(8.dp))
                            LazyColumn(
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.heightIn(max = 200.dp)
                            ) {
                                items(searchResults) { user ->
                                    val isFriend = ui.friends.any { it.id == user.id || it.email == user.email }
                                    val isPending = ui.outgoingRequests.any { it.senderEmail.equals(user.email, ignoreCase = true) }
                                    Card(
                                        Modifier
                                            .fillMaxWidth()
                                            .clickable(enabled = !isFriend && !isPending) { onSendRequest(user.email) }
                                    ) {
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(12.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Row(modifier = Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                                com.cpen321.movietier.ui.components.Avatar(
                                                    imageUrl = user.profileImageUrl,
                                                    name = user.name,
                                                    size = 40.dp
                                                )
                                                Column(Modifier.weight(1f)) {
                                                    Text(user.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                                    // Do not display email when searching by name
                                                }
                                            }
                                            when {
                                                isFriend -> Text("Friends", color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                isPending -> Text("Pending", color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                else -> TextButton(onClick = { onSendRequest(user.email) }) { Text("Add") }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            if (tabIndex == 0) {
                TextButton(
                    onClick = { onSendRequest(email) },
                    enabled = isValidEmail,
                    modifier = Modifier.testTag("send_request_button")
                ) {
                    Text("Send Request")
                }
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

@Composable
private fun RequestRow(
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
            .testTag("request_row_${'$'}{request.id}")
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
            Column(
                modifier = Modifier.weight(1f),
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
    }
}

@Composable
private fun OutgoingRequestRow(
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
            .testTag("outgoing_request_row_${'$'}{request.id}")
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

@Preview(showBackground = true)
@Composable
private fun FriendsScreenPreview() {
    MovieTierTheme {
        val navController = rememberNavController()
        FriendsScreen(navController = navController)
    }
}
