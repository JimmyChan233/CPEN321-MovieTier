package com.cpen321.movietier.ui.friends.model

/**
 * Groups add friend callbacks
 */
data class AddFriendCallbacks(
    val onEmailChange: (String) -> Unit = {},
    val onNameQueryChange: (String) -> Unit = {},
    val onSendRequest: (String) -> Unit = {}
)