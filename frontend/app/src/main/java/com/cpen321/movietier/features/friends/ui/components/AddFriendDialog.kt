package com.cpen321.movietier.features.friends.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Card
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.cpen321.movietier.shared.models.User
import com.cpen321.movietier.shared.components.Avatar
import com.cpen321.movietier.features.friends.ui.viewmodel.FriendViewModel
import com.cpen321.movietier.ui.viewmodels.FriendRequestUi

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
            AddFriendDialogContent(
                tabIndex = tabIndex,
                onTabChange = { tabIndex = it },
                email = email,
                onEmailChange = { email = it },
                isValidEmail = isValidEmail,
                nameQuery = nameQuery,
                onNameQueryChange = { nameQuery = it },
                searchResults = searchResults,
                friends = ui.friends,
                outgoingRequests = ui.outgoingRequests,
                onSendRequest = onSendRequest
            )
        },
        confirmButton = {
            if (tabIndex == 0) {
                TextButton(
                    onClick = { onSendRequest(email) },
                    enabled = isValidEmail,
                    modifier = Modifier.testTag("send_request_button")
                ) { Text("Send Request") }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, modifier = Modifier.testTag("cancel_button")) { Text("Cancel") }
        }
    )
}

@Composable
private fun AddFriendDialogContent(
    tabIndex: Int,
    onTabChange: (Int) -> Unit,
    email: String,
    onEmailChange: (String) -> Unit,
    isValidEmail: Boolean,
    nameQuery: String,
    onNameQueryChange: (String) -> Unit,
    searchResults: List<User>,
    friends: List<com.cpen321.movietier.data.model.Friend>,
    outgoingRequests: List<FriendRequestUi>,
    onSendRequest: (String) -> Unit
) {
    Column {
        TabRow(selectedTabIndex = tabIndex) {
            Tab(selected = tabIndex == 0, onClick = { onTabChange(0) }) { Text("By Email", modifier = Modifier.padding(12.dp)) }
            Tab(selected = tabIndex == 1, onClick = { onTabChange(1) }) { Text("By Name", modifier = Modifier.padding(12.dp)) }
        }
        Spacer(modifier = Modifier.height(12.dp))
        when (tabIndex) {
            0 -> AddFriendByEmailTab(email, onEmailChange, isValidEmail)
            1 -> AddFriendByNameTab(nameQuery, onNameQueryChange, searchResults, friends, outgoingRequests, onSendRequest)
        }
    }
}

@Composable
private fun AddFriendByEmailTab(
    email: String,
    onEmailChange: (String) -> Unit,
    isValidEmail: Boolean
) {
    Text(
        text = "Enter your friend's email address",
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
    Spacer(modifier = Modifier.height(16.dp))
    OutlinedTextField(
        value = email,
        onValueChange = onEmailChange,
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

@Composable
private fun AddFriendByNameTab(
    nameQuery: String,
    onNameQueryChange: (String) -> Unit,
    searchResults: List<User>,
    friends: List<com.cpen321.movietier.data.model.Friend>,
    outgoingRequests: List<FriendRequestUi>,
    onSendRequest: (String) -> Unit
) {
    Text(
        text = "Search users by name",
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
    Spacer(modifier = Modifier.height(16.dp))
    OutlinedTextField(
        value = nameQuery,
        onValueChange = onNameQueryChange,
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
        UserSearchResultsList(
            searchResults = searchResults,
            friends = friends,
            outgoingRequests = outgoingRequests,
            onSendRequest = onSendRequest
        )
    }
}

@Composable
private fun UserSearchResultsList(
    searchResults: List<User>,
    friends: List<com.cpen321.movietier.data.model.Friend>,
    outgoingRequests: List<FriendRequestUi>,
    onSendRequest: (String) -> Unit
) {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.heightIn(max = 200.dp).testTag("user_search_results")
    ) {
        items(searchResults) { user ->
            val isFriend = friends.any { it.id == user.id || it.email == user.email }
            val isPending = outgoingRequests.any { it.senderEmail.equals(user.email, ignoreCase = true) }
            UserSearchResultCard(
                user = user,
                isFriend = isFriend,
                isPending = isPending,
                onSendRequest = { onSendRequest(user.email) }
            )
        }
    }
}

@Composable
private fun UserSearchResultCard(
    user: User,
    isFriend: Boolean,
    isPending: Boolean,
    onSendRequest: () -> Unit
) {
    Card(
        Modifier
            .fillMaxWidth()
            .clickable(enabled = !isFriend && !isPending, onClick = onSendRequest)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(modifier = Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Avatar(
                    imageUrl = user.profileImageUrl,
                    name = user.name,
                    size = 40.dp
                )
                Column(Modifier.weight(1f)) {
                    Text(user.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                }
            }
            when {
                isFriend -> Text("Friends", color = MaterialTheme.colorScheme.onSurfaceVariant)
                isPending -> Text("Pending", color = MaterialTheme.colorScheme.onSurfaceVariant)
                else -> TextButton(onClick = onSendRequest) { Text("Add") }
            }
        }
    }
}
