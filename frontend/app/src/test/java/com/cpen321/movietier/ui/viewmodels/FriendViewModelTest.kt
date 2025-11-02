package com.cpen321.movietier.ui.viewmodels

import com.cpen321.movietier.data.api.ApiService
import com.cpen321.movietier.data.api.SseClient
import com.cpen321.movietier.data.model.*
import com.cpen321.movietier.data.repository.FriendRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.Response

/**
 * Unit tests for FriendViewModel using a fake ApiService and SseClient.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class FriendViewModelTest {

    private class FakeApiService : ApiService {
        // Backing fields configurable per test
        var friends: List<Friend> = emptyList()
        var incomingDetailed: List<FriendRequestDetailed> = emptyList()
        var outgoingDetailed: List<FriendRequestDetailed> = emptyList()
        var lastSentEmail: String? = null
        var respondAccept: Boolean? = null
        var cancelRequestId: String? = null

        override suspend fun getFriends(): Response<ApiResponse<List<Friend>>> =
            Response.success(ApiResponse(true, "ok", friends))

        override suspend fun getFriendRequestsDetailed(): Response<ApiResponse<List<FriendRequestDetailed>>> =
            Response.success(ApiResponse(true, "ok", incomingDetailed))

        override suspend fun getOutgoingFriendRequestsDetailed(): Response<ApiResponse<List<FriendRequestDetailed>>> =
            Response.success(ApiResponse(true, "ok", outgoingDetailed))

        override suspend fun sendFriendRequest(request: SendFriendRequestBody): Response<ApiResponse<FriendRequest>> {
            lastSentEmail = request.email
            val fr = FriendRequest(
                id = "req1",
                senderId = "me",
                receiverId = "u2",
                status = "pending",
                createdAt = "now"
            )
            return Response.success(ApiResponse(true, "ok", fr))
        }

        override suspend fun respondToFriendRequest(request: RespondFriendRequestBody): Response<ApiResponse<Unit>> {
            respondAccept = request.accept
            return Response.success(ApiResponse(true, "ok", Unit))
        }

        override suspend fun removeFriend(friendId: String): Response<ApiResponse<Unit>> =
            Response.success(ApiResponse(true, "ok", Unit))

        override suspend fun cancelFriendRequest(requestId: String): Response<ApiResponse<Unit>> {
            cancelRequestId = requestId
            return Response.success(ApiResponse(true, "ok", Unit))
        }

        // Unused in these tests — provide stubbed failures for safety
        private fun unimplemented(): Nothing =
            throw NotImplementedError("Not needed for FriendViewModel tests")

        override suspend fun signIn(request: LoginRequest) = unimplemented()
        override suspend fun signUp(request: LoginRequest) = unimplemented()
        override suspend fun signOut(): Response<ApiResponse<Unit>> = unimplemented()
        override suspend fun deleteAccount(): Response<ApiResponse<Unit>> = unimplemented()
        override suspend fun getUser(userId: String): Response<ApiResponse<User>> = unimplemented()
        override suspend fun updateUser(userId: String, user: User): Response<ApiResponse<User>> = unimplemented()
        override suspend fun updateProfile(request: UpdateProfileRequest): Response<ApiResponse<User>> = unimplemented()
        override suspend fun registerFcmToken(body: Map<String, String>): Response<ApiResponse<Unit>> = unimplemented()
        override suspend fun searchUsers(query: String): Response<ApiResponse<List<User>>> =
            Response.success(ApiResponse(true, "ok", emptyList()))
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

    private class FakeSseClient : SseClient(okhttp3.OkHttpClient()) {
        var lastPath: String? = null
        var callback: ((String, String) -> Unit)? = null
        override fun connect(path: String, onEvent: (String, String) -> Unit) {
            lastPath = path
            callback = onEvent
        }
    }

    @Test
    fun loadFriends_populatesUiState() = runTest(UnconfinedTestDispatcher()) {
        val api = FakeApiService().apply {
            friends = listOf(
                Friend(id = "f1", email = "f@ex.com", name = "Friend One", profileImageUrl = null)
            )
            incomingDetailed = emptyList()
            outgoingDetailed = emptyList()
        }
        val vm = FriendViewModel(FriendRepository(api), FakeSseClient())

        // allow initial init { loadFriends, loadRequests, loadOutgoingRequests }
        kotlinx.coroutines.test.advanceUntilIdle()

        val state = vm.uiState.value
        assertEquals(1, state.friends.size)
        assertEquals("Friend One", state.friends.first().name)
    }

    @Test
    fun sendFriendRequest_emitsMessage_andRefreshesOutgoing() = runTest(UnconfinedTestDispatcher()) {
        val api = FakeApiService().apply {
            outgoingDetailed = emptyList()
        }
        val vm = FriendViewModel(FriendRepository(api), FakeSseClient())

        val events = mutableListOf<String>()
        val job = backgroundScope.launch { vm.events.collect { if (it is UiEvent.Message) events.add(it.text) } }

        vm.sendFriendRequest("pal@example.com")
        kotlinx.coroutines.test.advanceUntilIdle()

        assertEquals("pal@example.com", api.lastSentEmail)
        assertTrue(events.contains("Friend request sent"))

        job.cancel()
    }

    @Test
    fun respondToRequest_accept_emitsMessage() = runTest(UnconfinedTestDispatcher()) {
        val api = FakeApiService()
        val vm = FriendViewModel(FriendRepository(api), FakeSseClient())
        val events = mutableListOf<String>()
        val job = backgroundScope.launch { vm.events.collect { if (it is UiEvent.Message) events.add(it.text) } }

        vm.respondToRequest("req1", true)
        kotlinx.coroutines.test.advanceUntilIdle()

        assertEquals(true, api.respondAccept)
        assertTrue(events.contains("Friend request accepted"))

        job.cancel()
    }

    @Test
    fun cancelOutgoingRequest_emitsMessage() = runTest(UnconfinedTestDispatcher()) {
        val api = FakeApiService()
        val vm = FriendViewModel(FriendRepository(api), FakeSseClient())
        val events = mutableListOf<String>()
        val job = backgroundScope.launch { vm.events.collect { if (it is UiEvent.Message) events.add(it.text) } }

        vm.cancelOutgoingRequest("req42")
        kotlinx.coroutines.test.advanceUntilIdle()

        assertEquals("req42", api.cancelRequestId)
        assertTrue(events.contains("Friend request canceled"))

        job.cancel()
    }
}

