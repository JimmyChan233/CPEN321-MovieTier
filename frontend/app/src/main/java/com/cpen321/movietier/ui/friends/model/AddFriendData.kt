package com.cpen321.movietier.ui.friends.model

import com.cpen321.movietier.ui.friends.viewmodels.FriendRequestUi

/**
 * Groups add friend data
 */
data class AddFriendData(
    val friends: List<com.cpen321.movietier.data.model.Friend> = emptyList(),
    val outgoingRequests: List<FriendRequestUi> = emptyList()
)