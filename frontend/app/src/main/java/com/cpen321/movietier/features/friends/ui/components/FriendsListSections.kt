package com.cpen321.movietier.features.friends.ui.components

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.cpen321.movietier.shared.models.Friend
import com.cpen321.movietier.ui.friends.OutgoingRequestRow
import com.cpen321.movietier.ui.friends.RequestRow
import com.cpen321.movietier.shared.navigation.NavRoutes
import com.cpen321.movietier.ui.viewmodels.FriendRequestUi
import com.cpen321.movietier.features.friends.ui.viewmodel.FriendViewModel

fun LazyListScope.OutgoingRequestsSection(
    outgoingRequests: List<FriendRequestUi>,
    friendViewModel: FriendViewModel,
    navController: NavController
) {
    if (outgoingRequests.isNotEmpty()) {
        item(key = "outgoing_header") {
            Text("Outgoing Requests", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(bottom = 8.dp))
        }
        items(items = outgoingRequests, key = { "out_" + it.id }) { req ->
            OutgoingRequestRow(
                request = req,
                onCancel = { friendViewModel.cancelOutgoingRequest(req.id) },
                onViewProfile = { navController.navigate(NavRoutes.PROFILE_USER.replace("{userId}", req.senderId)) }
            )
        }
        item(key = "after_outgoing_spacer") { Spacer(Modifier.height(16.dp)) }
    }
}

fun LazyListScope.IncomingRequestsSection(
    requests: List<FriendRequestUi>,
    friendViewModel: FriendViewModel,
    navController: NavController
) {
    item(key = "requests_header") {
        Text("Friend Requests", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(bottom = 8.dp))
    }
    if (requests.isEmpty()) {
        item(key = "requests_empty") {
            Text("No incoming requests", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    } else {
        items(items = requests, key = { "req_" + it.id }) { req ->
            RequestRow(
                request = req,
                onAccept = { friendViewModel.respondToRequest(req.id, true) },
                onReject = { friendViewModel.respondToRequest(req.id, false) },
                onViewProfile = { navController.navigate(NavRoutes.PROFILE_USER.replace("{userId}", req.senderId)) }
            )
        }
    }
}

fun LazyListScope.FriendsListSection(
    friends: List<Friend>,
    friendViewModel: FriendViewModel,
    navController: NavController
) {
    item(key = "friends_header_spacer") { Spacer(Modifier.height(16.dp)) }
    item(key = "friends_header") {
        Text("Friends", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(bottom = 8.dp))
    }
    items(items = friends, key = { it.id }) { friend ->
        FriendCard(friend, { friendViewModel.removeFriend(friend.id) }, navController)
    }
}
