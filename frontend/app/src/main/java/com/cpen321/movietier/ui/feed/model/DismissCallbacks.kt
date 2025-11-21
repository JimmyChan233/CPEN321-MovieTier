package com.cpen321.movietier.ui.feed.model

/**
 * Groups dismiss callbacks
 */
data class DismissCallbacks(
    val onDismissMovie: () -> Unit = {},
    val onDismissComments: () -> Unit = {}
)