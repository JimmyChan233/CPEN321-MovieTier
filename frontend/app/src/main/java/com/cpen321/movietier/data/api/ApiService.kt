package com.cpen321.movietier.data.api

import com.cpen321.movietier.data.api.services.AuthApiService
import com.cpen321.movietier.data.api.services.FeedApiService
import com.cpen321.movietier.data.api.services.FriendsApiService
import com.cpen321.movietier.data.api.services.MoviesApiService
import com.cpen321.movietier.data.api.services.RecommendationsApiService
import com.cpen321.movietier.data.api.services.UserApiService
import com.cpen321.movietier.data.api.services.WatchlistApiService

interface ApiService :
    AuthApiService,
    UserApiService,
    FriendsApiService,
    MoviesApiService,
    FeedApiService,
    WatchlistApiService,
    RecommendationsApiService
