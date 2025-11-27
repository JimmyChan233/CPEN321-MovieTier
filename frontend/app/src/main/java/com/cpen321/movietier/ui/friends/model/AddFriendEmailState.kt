package com.cpen321.movietier.ui.friends.model

/**
 * Groups add friend email-related state
 */
data class AddFriendEmailState(
    val email: String = "",
    val isValidEmail: Boolean = false
)
