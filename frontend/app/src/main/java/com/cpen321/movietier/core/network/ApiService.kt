package com.cpen321.movietier.core.network

import com.cpen321.movietier.features.auth.data.api.AuthApiService
import com.cpen321.movietier.features.feed.data.api.FeedApiService
import com.cpen321.movietier.features.friends.data.api.FriendsApiService
import com.cpen321.movietier.features.ranking.data.api.MoviesApiService
import com.cpen321.movietier.features.recommendation.data.api.RecommendationsApiService
import com.cpen321.movietier.features.profile.data.api.UserApiService
import com.cpen321.movietier.features.watchlist.data.api.WatchlistApiService

interface ApiService :
    AuthApiService,
    UserApiService,
    FriendsApiService,
    MoviesApiService,
    FeedApiService,
    WatchlistApiService,
    RecommendationsApiService
