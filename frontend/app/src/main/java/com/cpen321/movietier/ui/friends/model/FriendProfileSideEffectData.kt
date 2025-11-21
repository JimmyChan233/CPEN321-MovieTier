package com.cpen321.movietier.ui.friends.model

/**
 * Groups data for friend profile side effects
 */
data class FriendProfileSideEffectData(
    val watchlist: List<com.cpen321.movietier.data.model.WatchlistItem>,
    val rankings: List<com.cpen321.movietier.data.model.RankedMovie>,
    val movieDetailsMap: Map<Int, com.cpen321.movietier.data.model.Movie>
)