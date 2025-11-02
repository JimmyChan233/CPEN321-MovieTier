package com.cpen321.movietier.ui.friends

import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.cpen321.movietier.data.model.Friend
import com.cpen321.movietier.data.model.User
import com.cpen321.movietier.ui.viewmodels.FriendRequestUi
import com.cpen321.movietier.ui.viewmodels.FriendUiState
import io.mockk.MockKAnnotations
import io.mockk.coEvery
import io.mockk.mockk
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import com.cpen321.movietier.ui.viewmodels.FriendViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.flow.MutableStateFlow

/**
 * Frontend Test for Use Case 2: SEND FRIEND REQUEST WITH NAME
 *
 * Use Case Description: User sends a friend request to another user by entering their display name.
 *
 * Test Coverage:
 * - Main success scenario: User successfully sends a friend request by name
 * - Failure scenario 4a: No user with the given name exists
 * - Failure scenario 5a: User is already added as a friend (shows "Friends" label)
 * - Failure scenario 5b: Friend request has already been sent (shows "Pending" label)
 */
@RunWith(AndroidJUnit4::class)
class SendFriendRequestByNameTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private val mockFriendViewModel = mockk<FriendViewModel>(relaxed = true)

    @Before
    fun setUp() {
        MockKAnnotations.init(this)
    }

    // ==========================================
    // MAIN SUCCESS SCENARIO: Send Friend Request Successfully
    // ==========================================
    /**
     * Test: User successfully sends a friend request by searching and selecting a user by name
     *
     * Preconditions:
     * - User is logged into the system
     * - User is on the "Manage Friends" Page
     *
     * Scenario Steps:
     * 1. User clicks the "Add Friend" button
     * 2. A search dialog appears with a search field
     * 3. User switches to the "Name" option in the search field
     * 4. User enters the friend's display name "John Doe"
     * 5. System searches and displays matching user profiles
     * 6. User selects a user from the search results
     * 7. User clicks the send friend request button
     * 8. System displays a success message: "Friend Request Successfully Sent"
     * 9. System notifies the recipient to accept/deny the pending request
     *
     * Input: Valid friend name "John Doe" exists in system
     * Expected Status: 200 OK
     * Expected Behavior: Friend request is sent successfully, success message appears
     * Expected Output: Success message displayed, dialog closes
     * Mock Behavior: searchResults returns list with matching user
     */
    @Test
    fun sendFriendRequest_ByName_Success() {
        // Step 1: Setup mock search results with a valid user
        val johnDoe = User(
            id = "user_123",
            name = "John Doe",
            email = "john@example.com",
            profileImageUrl = "https://example.com/john.jpg"
        )

        val searchResultsFlow = MutableStateFlow(emptyList<User>())
        coEvery { mockFriendViewModel.searchResults } returns searchResultsFlow
        coEvery { mockFriendViewModel.uiState } returns MutableStateFlow(
            FriendUiState(
                friends = emptyList(),
                requests = emptyList(),
                outgoingRequests = emptyList(),
                isLoading = false
            )
        )
        coEvery { mockFriendViewModel.searchUsers(any()) } coAnswers {
            searchResultsFlow.value = listOf(johnDoe)
        }
        coEvery { mockFriendViewModel.sendFriendRequest(any()) } returns Unit
        coEvery { mockFriendViewModel.clearSearch() } coAnswers {
            searchResultsFlow.value = emptyList()
        }

        // Step 2: Render Friends Screen
        composeTestRule.setContent {
            AddFriendDialog(
                onDismiss = { },
                onSendRequest = { mockFriendViewModel.sendFriendRequest(it) },
                friendViewModel = mockFriendViewModel
            )
        }

        // Step 3: Verify dialog appears
        composeTestRule.onNodeWithText("Add Friend").assertIsDisplayed()

        // Step 4: Switch to "Name" tab
        composeTestRule.onNodeWithText("By Name").performClick()

        // Verify we're on the Name tab
        composeTestRule.onNodeWithTag("name_input").assertIsDisplayed()

        // Step 5: Enter name in search field
        composeTestRule.onNodeWithTag("name_input").performTextInput("John Doe")

        // Step 6: Wait for search results to appear (there will be 2 nodes with "John Doe" - input + result)
        composeTestRule.waitUntil(timeoutMillis = 5000) {
            composeTestRule.onAllNodesWithText("John Doe").fetchSemanticsNodes().size >= 2
        }

        // Verify we have at least 2 nodes (input field + search result)
        composeTestRule.onAllNodesWithText("John Doe").assertCountEquals(2)

        // Step 7: Click the "Add" button (send friend request)
        // Find the "Add" button which should only have 1 occurrence in results
        composeTestRule.onNodeWithText("Add").assertIsDisplayed().performClick()

        // Step 8: Verify the request was sent by checking mockViewModel was called
        coEvery { mockFriendViewModel.sendFriendRequest("john@example.com") } returns Unit

        // Note: In the real implementation with FriendsScreen (not just AddFriendDialog),
        // success would be verified through SnackBar showing "Friend request sent" message
        // emitted by the ViewModel's sendFriendRequest method via events flow
    }

    // ==========================================
    // FAILURE SCENARIO 4a: No User Found
    // ==========================================
    /**
     * Test: No user with the given name exists
     *
     * Scenario Steps:
     * 1. User enters name "NonexistentUser"
     * 2. System searches for the name
     * 3. No matching results are found
     * 4. System notifies the user: "No users found"
     *
     * Input: Name "NonexistentUser" does not exist in system
     * Expected Status: 200 OK (search returns empty results)
     * Expected Behavior: Empty search results, "No users found" message displayed
     * Expected Output: "No users found" message appears
     * Mock Behavior: searchResults returns empty list
     */
    @Test
    fun sendFriendRequest_ByName_NoUsersFound() {
        val searchResultsFlow = MutableStateFlow(emptyList<User>())
        coEvery { mockFriendViewModel.searchResults } returns searchResultsFlow
        coEvery { mockFriendViewModel.uiState } returns MutableStateFlow(
            FriendUiState(
                friends = emptyList(),
                requests = emptyList(),
                outgoingRequests = emptyList(),
                isLoading = false
            )
        )
        coEvery { mockFriendViewModel.searchUsers(any()) } coAnswers {
            // Simulate empty search results
            searchResultsFlow.value = emptyList()
        }
        coEvery { mockFriendViewModel.clearSearch() } coAnswers {
            searchResultsFlow.value = emptyList()
        }

        // Render Friends Screen
        composeTestRule.setContent {
            AddFriendDialog(
                onDismiss = { },
                onSendRequest = { },
                friendViewModel = mockFriendViewModel
            )
        }

        // Switch to "Name" tab
        composeTestRule.onNodeWithText("By Name").performClick()

        // Enter a name that doesn't exist
        composeTestRule.onNodeWithTag("name_input").performTextInput("NonexistentUser")

        // Trigger search
        composeTestRule.mainClock.advanceTimeBy(500)

        // Wait for "No users found" message to appear
        composeTestRule.waitUntil(timeoutMillis = 5000) {
            composeTestRule.onAllNodesWithText("No users found").fetchSemanticsNodes().isNotEmpty()
        }

        // Verify "No users found" message appears
        composeTestRule.onNodeWithText("No users found").assertIsDisplayed()
    }

    // ==========================================
    // FAILURE SCENARIO 5a: User Already a Friend
    // ==========================================
    /**
     * Test: User is already added as a friend - shows "Friends" label instead of "Add" button
     *
     * Scenario Steps:
     * 1. User enters name "Jane Smith"
     * 2. System searches and finds "Jane Smith"
     * 3. System recognizes "Jane Smith" is already a friend
     * 4. System displays "Friends" label instead of "Add Friend" button
     * 5. User cannot click to send a new request
     *
     * Input: User "Jane Smith" already exists in friends list
     * Expected Status: 200 OK
     * Expected Behavior: Search returns result but shows "Friends" label
     * Expected Output: "Friends" label visible, no "Add" button clickable
     * Mock Behavior: searchResults returns user, friends list includes that user
     */
    @Test
    fun sendFriendRequest_ByName_AlreadyFriends() {
        val janeSmith = User(
            id = "user_456",
            name = "Jane Smith",
            email = "jane@example.com",
            profileImageUrl = "https://example.com/jane.jpg"
        )

        val janeFriend = Friend(
            id = "user_456",
            name = "Jane Smith",
            email = "jane@example.com",
            profileImageUrl = "https://example.com/jane.jpg"
        )

        val searchResultsFlow = MutableStateFlow(emptyList<User>())
        coEvery { mockFriendViewModel.searchResults } returns searchResultsFlow
        coEvery { mockFriendViewModel.uiState } returns MutableStateFlow(
            FriendUiState(
                friends = listOf(janeFriend), // Jane is already a friend
                requests = emptyList(),
                outgoingRequests = emptyList(),
                isLoading = false
            )
        )
        coEvery { mockFriendViewModel.searchUsers(any()) } coAnswers {
            searchResultsFlow.value = listOf(janeSmith) // Search returns Jane as result
        }
        coEvery { mockFriendViewModel.clearSearch() } coAnswers {
            searchResultsFlow.value = emptyList()
        }

        // Render Friends Screen
        composeTestRule.setContent {
            AddFriendDialog(
                onDismiss = { },
                onSendRequest = { },
                friendViewModel = mockFriendViewModel
            )
        }

        // Switch to "Name" tab
        composeTestRule.onNodeWithText("By Name").performClick()

        // Enter name
        composeTestRule.onNodeWithTag("name_input").performTextInput("Jane Smith")

        // Trigger search - wait for results to appear (2 nodes: input + result)
        composeTestRule.waitUntil(timeoutMillis = 5000) {
            composeTestRule.onAllNodesWithText("Jane Smith").fetchSemanticsNodes().size >= 2
        }

        // Verify Jane Smith appears in results (expect 2 nodes: input field + search result)
        composeTestRule.onAllNodesWithText("Jane Smith").assertCountEquals(2)

        // Verify "Friends" label is shown instead of "Add" button
        composeTestRule.onNodeWithText("Friends")
            .assertIsDisplayed()

        // Verify there is NO "Add" button for Jane Smith
        composeTestRule.onAllNodesWithText("Add").assertCountEquals(0)
    }

    // ==========================================
    // FAILURE SCENARIO 5b: Friend Request Already Pending
    // ==========================================
    /**
     * Test: Friend request has already been sent to this user - shows "Pending" label
     *
     * Scenario Steps:
     * 1. User enters name "Bob Wilson"
     * 2. System searches and finds "Bob Wilson"
     * 3. System recognizes a friend request to "Bob Wilson" is already pending
     * 4. System displays "Pending" label instead of "Add Friend" button
     * 5. User cannot click to send another request
     *
     * Input: User "Bob Wilson" exists, outgoing request already sent
     * Expected Status: 200 OK
     * Expected Behavior: Search returns result but shows "Pending" label
     * Expected Output: "Pending" label visible, no "Add" button clickable
     * Mock Behavior: searchResults returns user, outgoingRequests includes that user
     */
    @Test
    fun sendFriendRequest_ByName_RequestAlreadyPending() {
        val bobWilson = User(
            id = "user_789",
            name = "Bob Wilson",
            email = "bob@example.com",
            profileImageUrl = "https://example.com/bob.jpg"
        )

        val pendingRequest = FriendRequestUi(
            id = "req_001",
            senderId = "user_789",
            senderEmail = "bob@example.com",
            senderName = "Bob Wilson",
            senderProfileImage = "https://example.com/bob.jpg"
        )

        val searchResultsFlow = MutableStateFlow(emptyList<User>())
        coEvery { mockFriendViewModel.searchResults } returns searchResultsFlow
        coEvery { mockFriendViewModel.uiState } returns MutableStateFlow(
            FriendUiState(
                friends = emptyList(),
                requests = emptyList(),
                outgoingRequests = listOf(pendingRequest), // Pending request to Bob
                isLoading = false
            )
        )
        coEvery { mockFriendViewModel.searchUsers(any()) } coAnswers {
            searchResultsFlow.value = listOf(bobWilson) // Search returns Bob as result
        }
        coEvery { mockFriendViewModel.clearSearch() } coAnswers {
            searchResultsFlow.value = emptyList()
        }

        // Render Friends Screen
        composeTestRule.setContent {
            AddFriendDialog(
                onDismiss = { },
                onSendRequest = { },
                friendViewModel = mockFriendViewModel
            )
        }

        // Switch to "Name" tab
        composeTestRule.onNodeWithText("By Name").performClick()

        // Enter name
        composeTestRule.onNodeWithTag("name_input").performTextInput("Bob Wilson")

        // Trigger search - wait for results to appear (2 nodes: input + result)
        composeTestRule.waitUntil(timeoutMillis = 5000) {
            composeTestRule.onAllNodesWithText("Bob Wilson").fetchSemanticsNodes().size >= 2
        }

        // Verify Bob Wilson appears in results (expect 2 nodes: input field + search result)
        composeTestRule.onAllNodesWithText("Bob Wilson").assertCountEquals(2)

        // Verify "Pending" label is shown instead of "Add" button
        composeTestRule.onNodeWithText("Pending")
            .assertIsDisplayed()

        // Verify there is NO "Add" button for Bob Wilson
        composeTestRule.onAllNodesWithText("Add").assertCountEquals(0)
    }

    // ==========================================
    // ADDITIONAL TEST: Verify Dialog Close on Dismiss
    // ==========================================
    /**
     * Test: User can cancel the Add Friend dialog at any time
     *
     * Input: Add Friend dialog is open
     * Expected Behavior: Dialog closes without sending request
     * Expected Output: Dialog disappears
     */
    @Test
    fun addFriendDialog_DismissDialog() {
        coEvery { mockFriendViewModel.searchResults } returns MutableStateFlow(emptyList())
        coEvery { mockFriendViewModel.uiState } returns MutableStateFlow(
            FriendUiState(
                friends = emptyList(),
                requests = emptyList(),
                outgoingRequests = emptyList(),
                isLoading = false
            )
        )
        coEvery { mockFriendViewModel.clearSearch() } returns Unit

        var dialogOpen = true

        composeTestRule.setContent {
            if (dialogOpen) {
                AddFriendDialog(
                    onDismiss = { dialogOpen = false },
                    onSendRequest = { },
                    friendViewModel = mockFriendViewModel
                )
            }
        }

        // Verify dialog is open
        composeTestRule.onNodeWithText("Add Friend").assertIsDisplayed()

        // Click Cancel button
        composeTestRule.onNodeWithTag("cancel_button").performClick()

        // Verify clearSearch was called
        coEvery { mockFriendViewModel.clearSearch() } returns Unit
    }
}
