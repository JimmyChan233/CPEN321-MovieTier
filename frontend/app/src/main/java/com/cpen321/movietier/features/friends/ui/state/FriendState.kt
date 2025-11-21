package com.cpen321.movietier.features.friends.ui.state

import com.cpen321.movietier.shared.models.Friend
import com.cpen321.movietier.shared.models.FriendRequest

data class FriendUiState(
    val isLoading: Boolean = false,
    val friends: List<Friend> = emptyList(),
    val requests: List<FriendRequestUi> = emptyList(),
    val outgoingRequests: List<FriendRequestUi> = emptyList(),
    val errorMessage: String? = null
)

data class FriendRequestUi(
    val id: String,
    val senderId: String,
    val senderName: String = "",
    val senderEmail: String = "",
    val senderProfileImage: String? = null
)

sealed class UiEvent {
    data class Message(val text: String): UiEvent()
}
