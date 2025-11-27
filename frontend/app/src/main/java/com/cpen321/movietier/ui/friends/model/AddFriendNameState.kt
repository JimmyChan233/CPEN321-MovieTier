package com.cpen321.movietier.ui.friends.model

/**
 * Groups add friend name search state
 */
data class AddFriendNameState(
    val nameQuery: String = "",
    val searchResults: List<com.cpen321.movietier.data.model.User> = emptyList()
)
