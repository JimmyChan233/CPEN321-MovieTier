package com.cpen321.movietier.ui.feed.model

/**
 * Groups comments-related state
 */
data class CommentsState(
    val showCommentsForActivity: String? = null,
    val commentsData: Map<String, List<com.cpen321.movietier.data.model.FeedComment>> = emptyMap(),
    val currentUserId: String? = null
)
