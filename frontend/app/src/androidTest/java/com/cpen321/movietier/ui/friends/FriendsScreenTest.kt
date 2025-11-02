package com.cpen321.movietier.ui.friends

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.navigation.compose.rememberNavController
import com.cpen321.movietier.data.api.ApiService
import com.cpen321.movietier.data.api.SseClient
import com.cpen321.movietier.data.model.*
import com.cpen321.movietier.data.repository.FriendRepository
import com.cpen321.movietier.ui.viewmodels.FriendViewModel
import okhttp3.OkHttpClient
import org.junit.Rule
import org.junit.Test
import retrofit2.Response

class FriendsScreenTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    private class FakeApiService : ApiService {
        var friends: List<Friend> = emptyList()
        var incomingDetailed: List<FriendRequestDetailed> = emptyList()
        var outgoingDetailed: List<FriendRequestDetailed> = emptyList()

        override suspend fun getFriends(): Response<ApiResponse<List<Friend>>> =
            Response.success(ApiResponse(true, "ok", friends))
        override suspend fun getFriendRequestsDetailed(): Response<ApiResponse<List<FriendRequestDetailed>>> =
            Response.success(ApiResponse(true, "ok", incomingDetailed))
        override suspend fun getOutgoingFriendRequestsDetailed(): Response<ApiResponse<List<FriendRequestDetailed>>> =
            Response.success(ApiResponse(true, "ok", outgoingDetailed))
        override suspend fun sendFriendRequest(request: SendFriendRequestBody): Response<ApiResponse<FriendRequest>> =
            Response.success(ApiResponse(true, "ok", FriendRequest("r1","me","u2","pending","now")))
        override suspend fun respondToFriendRequest(request: RespondFriendRequestBody): Response<ApiResponse<Unit>> =
            Response.success(ApiResponse(true, "ok", Unit))
        override suspend fun removeFriend(friendId: String): Response<ApiResponse<Unit>> =
            Response.success(ApiResponse(true, "ok", Unit))
        override suspend fun cancelFriendRequest(requestId: String): Response<ApiResponse<Unit>> =
            Response.success(ApiResponse(true, "ok", Unit))

        // Unused for these tests
        private fun unimplemented(): Nothing = throw NotImplementedError()
        override suspend fun signIn(request: LoginRequest) = unimplemented()
        override suspend fun signUp(request: LoginRequest) = unimplemented()
        override suspend fun signOut(): Response<ApiResponse<Unit>> = unimplemented()
        override suspend fun deleteAccount(): Response<ApiResponse<Unit>> = unimplemented()
        override suspend fun getUser(userId: String): Response<ApiResponse<User>> = unimplemented()
        override suspend fun updateUser(userId: String, user: User): Response<ApiResponse<User>> = unimplemented()
        override suspend fun updateProfile(request: UpdateProfileRequest): Response<ApiResponse<User>> = unimplemented()
        override suspend fun registerFcmToken(body: Map<String, String>): Response<ApiResponse<Unit>> = unimplemented()
        override suspend fun searchUsers(query: String): Response<ApiResponse<List<User>>> = Response.success(ApiResponse(true, "ok", emptyList()))
        override suspend fun getFriendRequests(): Response<ApiResponse<List<FriendRequest>>> = unimplemented()
        override suspend fun getOutgoingFriendRequests(): Response<ApiResponse<List<FriendRequest>>> = unimplemented()
        override suspend fun searchMovies(query: String, includeCast: Boolean): Response<ApiResponse<List<Movie>>> = unimplemented()
        override suspend fun getRankedMovies(): Response<ApiResponse<List<RankedMovie>>> = unimplemented()
        override suspend fun connectFeedStream(): Response<Unit> = Response.success(Unit)
        override suspend fun likeActivity(activityId: String): Response<ApiResponse<Unit>> = unimplemented()
        override suspend fun unlikeActivity(activityId: String): Response<ApiResponse<Unit>> = unimplemented()
        override suspend fun getComments(activityId: String): Response<ApiResponse<List<FeedComment>>> = unimplemented()
        override suspend fun addComment(activityId: String, body: Map<String, String>): Response<ApiResponse<FeedComment>> = unimplemented()
        override suspend fun deleteComment(activityId: String, commentId: String): Response<ApiResponse<Unit>> = unimplemented()
        override suspend fun getWatchlist(): Response<ApiResponse<List<WatchlistItem>>> = unimplemented()
        override suspend fun addToWatchlist(request: AddWatchlistRequest): Response<ApiResponse<WatchlistItem>> = unimplemented()
        override suspend fun removeFromWatchlist(movieId: Int): Response<ApiResponse<Unit>> = unimplemented()
        override suspend fun getUserWatchlist(userId: String): Response<ApiResponse<List<WatchlistItem>>> = unimplemented()
        override suspend fun getRecommendations(): Response<ApiResponse<List<Movie>>> = unimplemented()
        override suspend fun getTrendingMovies(): Response<ApiResponse<List<Movie>>> = unimplemented()
        override suspend fun getQuote(title: String, year: String?): Response<ApiResponse<String>> = unimplemented()
    }

    private class FakeSseClient : SseClient(OkHttpClient()) {
        override fun connect(path: String, onEvent: (String, String) -> Unit) {
            // no-op for UI tests
        }
    }

    @Test
    fun emptyState_showsEmptyUi() {
        val api = FakeApiService().apply {
            friends = emptyList()
            incomingDetailed = emptyList()
            outgoingDetailed = emptyList()
        }
        val vm = FriendViewModel(FriendRepository(api), FakeSseClient())

        composeRule.setContent {
            val nav = rememberNavController()
            FriendsScreen(navController = nav, friendViewModel = vm)
        }

        composeRule.onNodeWithTag("friends_empty").assertIsDisplayed()
        composeRule.onNodeWithTag("add_friend_fab").assertIsDisplayed()
    }

    @Test
    fun contentState_showsFriendRow() {
        val api = FakeApiService().apply {
            friends = listOf(Friend("f1", "f@ex.com", "Friend One", null))
            incomingDetailed = emptyList()
            outgoingDetailed = emptyList()
        }
        val vm = FriendViewModel(FriendRepository(api), FakeSseClient())

        composeRule.setContent {
            val nav = rememberNavController()
            FriendsScreen(navController = nav, friendViewModel = vm)
        }

        composeRule.onNodeWithTag("friends_list").assertIsDisplayed()
        composeRule.onNodeWithTag("friend_row_f1").assertIsDisplayed()
    }

    @Test
    fun addFriendDialog_emailFlow_enablesSend() {
        val api = FakeApiService()
        val vm = FriendViewModel(FriendRepository(api), FakeSseClient())

        composeRule.setContent {
            val nav = rememberNavController()
            FriendsScreen(navController = nav, friendViewModel = vm)
        }

        // Open dialog
        composeRule.onNodeWithTag("add_friend_fab").performClick()
        composeRule.onNodeWithText("Add Friend").assertIsDisplayed()

        // Enter a valid email and ensure button is enabled
        composeRule.onNodeWithTag("email_input").performTextInput("pal@example.com")
        composeRule.onNodeWithTag("send_request_button").assertIsDisplayed()
        composeRule.onNodeWithTag("send_request_button").performClick()

        // Dialog should be dismissed after sending
        composeRule.onNodeWithText("Add Friend").assertDoesNotExist()
    }
}

