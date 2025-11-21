package com.cpen321.movietier.features.feed.domain.usecase

import com.cpen321.movietier.shared.models.FeedActivity
import com.cpen321.movietier.features.feed.data.repository.FeedRepository
import com.cpen321.movietier.data.repository.Result
import javax.inject.Inject

/**
 * Use case for loading feed activities
 * Encapsulates the business logic for fetching friend or personal feed
 */
class LoadFeedUseCase @Inject constructor(
    private val feedRepository: FeedRepository
) {
    suspend fun loadFriendsFeed(): Result<List<FeedActivity>> {
        return feedRepository.getFeed()
    }

    suspend fun loadMyFeed(): Result<List<FeedActivity>> {
        return feedRepository.getMyFeed()
    }
}
