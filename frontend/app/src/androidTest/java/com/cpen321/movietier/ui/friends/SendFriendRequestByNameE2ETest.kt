package com.cpen321.movietier.ui.friends

import android.util.Log
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.cpen321.movietier.MainActivity
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * E2E Test for Use Case 2: SEND FRIEND REQUEST BY NAME
 *
 * SETUP INSTRUCTIONS FOR TAs:
 * ============================
 * 1. Before running this test, manually sign in to the app using your test Google account.
 * 2. This test requires a second user to exist in the database for the search to work.
 *    Please create another user with the name "John Doe" if one does not exist.
 * 3. Navigate to the Friends screen.
 * 4. Close the app (credentials are cached in DataStore).
 * 5. Run this E2E test - it will start from the cached authenticated state.
 *
 * IMPORTANT:
 * - This test assumes the user is ALREADY LOGGED IN.
 * - Tests interact with the REAL backend (no mocking).
 * - The test verifies the entire flow of sending a friend request by name.
 *
 * TEST COVERAGE:
 * - Verifies Friends screen loads.
 * - Verifies "Add Friend" dialog opens.
 * - Verifies searching for a user by name works.
 * - Verifies sending a friend request.
 * - Verifies the UI updates to "Pending" after sending a request.
 */
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class SendFriendRequestByNameE2ETest {

    companion object {
        private const val TAG = "E2E_SendFriendRequest"
        private const val CONTENT_LOAD_TIMEOUT_MS = 30000L
        private const val SEARCH_RESULTS_TIMEOUT_MS = 60000L
        private const val FRIEND_NAME_TO_SEARCH = "MovieTier"
    }

    @get:Rule
    val hiltRule = HiltAndroidRule(this)

    @get:Rule
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    @Before
    fun setup() {
        hiltRule.inject()
        Log.d(TAG, "E2E Test started - assuming user is already logged in")
        composeTestRule.waitForIdle()
    }

    /**
     * TEST 1: Verify Friends Screen loads correctly.
     *
     * Steps:
     * 1. App starts from main screen (user already authenticated).
     * 2. Navigate to the Friends tab.
     * 3. Verify that the Friends content displays (either empty state or list of friends).
     *
     * Expected Results:
     * - The Friends screen loads without crashing.
     * - The "Add Friend" button is visible.
     */
    @Test
    fun e2e_friendsScreen_displaysCorrectly() {
        Log.d(TAG, "TEST 1: Verifying Friends screen displays...")

        // Click on Friends tab at bottom navigation
        composeTestRule.onNodeWithTag("nav_friends").performClick()
        composeTestRule.waitForIdle()

        // Wait for friends content to load
        composeTestRule.waitUntil(timeoutMillis = CONTENT_LOAD_TIMEOUT_MS) {
            composeTestRule.onAllNodesWithTag("friends_screen").fetchSemanticsNodes().isNotEmpty()
        }

        // Verify the "Add Friend" button is present
        composeTestRule.onNodeWithContentDescription("Add Friend").assertIsDisplayed()

        Log.d(TAG, "✅ PASS: Friends screen displayed successfully.")
    }

    /**
     * TEST 2: Verify the entire flow of sending a friend request by name.
     *
     * Steps:
     * 1. Navigate to the Friends screen.
     * 2. Click the "Add Friend" button.
     * 3. In the dialog, switch to the "By Name" tab.
     * 4. Type the name of the user to search for.
     * 5. From the search results, click the "Add" button to send the request.
     * 6. Verify that the UI updates to show "Pending".
     *
     * Expected Results:
     * - The "Add Friend" dialog opens.
     * - The search results display the user.
     * - After sending the request, the "Add" button is replaced with a "Pending" indicator.
     */
    @Test
    fun e2e_sendFriendRequest_byName_fullFlow() {
        Log.d(TAG, "TEST 2: Verifying send friend request by name full flow...")

        // Step 1: Navigate to Friends screen
        composeTestRule.onNodeWithTag("nav_friends").performClick()
        composeTestRule.waitForIdle()
        composeTestRule.waitUntil(timeoutMillis = CONTENT_LOAD_TIMEOUT_MS) {
            composeTestRule.onAllNodesWithTag("friends_screen").fetchSemanticsNodes().isNotEmpty()
        }
        Log.d(TAG, "Navigated to Friends screen.")

        // Step 2: Click "Add Friend" button
        composeTestRule.onNodeWithContentDescription("Add Friend").performClick()
        composeTestRule.waitForIdle()
        Log.d(TAG, "Clicked 'Add Friend' button.")

        // Verify dialog appears
        composeTestRule.onNodeWithText("Add Friend").assertIsDisplayed()
        Log.d(TAG, "Add Friend dialog is displayed.")

        // Step 3: Switch to "By Name" tab
        composeTestRule.onNodeWithText("By Name").performClick()
        Log.d(TAG, "Switched to 'By Name' tab.")

        // Step 4: Enter name in search field
        composeTestRule.onNodeWithTag("name_input").performTextInput(FRIEND_NAME_TO_SEARCH)
        Log.d(TAG, "Entered '$FRIEND_NAME_TO_SEARCH' in search field.")

        composeTestRule.waitUntil(timeoutMillis = SEARCH_RESULTS_TIMEOUT_MS) {
            composeTestRule.onAllNodes(hasTestTag("user_search_results")).fetchSemanticsNodes().isNotEmpty()
        }

        // Step 5: Wait for search results to appear
        try {
            composeTestRule.waitUntil(timeoutMillis = SEARCH_RESULTS_TIMEOUT_MS) {
                composeTestRule.onAllNodes(
                    hasText(FRIEND_NAME_TO_SEARCH) and hasAnyAncestor(hasTestTag("user_search_results"))
                ).fetchSemanticsNodes().isNotEmpty()
            }
            Log.d(TAG, "Search results for '$FRIEND_NAME_TO_SEARCH' are visible.")
        } catch (e: Exception) {
            Log.e(TAG, "Search results for '$FRIEND_NAME_TO_SEARCH' did not appear in time.")
            throw e
        }

        // Find the "Add" button in the search results and click it
        // We need to be careful to select the correct "Add" button associated with the user
        val userRow = composeTestRule.onNode(
            hasText(FRIEND_NAME_TO_SEARCH) and hasAnyAncestor(hasTestTag("user_search_results"))
        )
        userRow.assertExists()
        Log.d(TAG, "User row for '$FRIEND_NAME_TO_SEARCH' found.")

        // The "Add"/"Pending"/"Friends" status lives on the parent row of the user name.
        val resultRow = userRow.onParent().onParent().onParent()

        // Check if the button is "Add" or "Pending"
        try {
            val addButton = resultRow.onChildren().filter(hasText("Add")).get(0)
            Log.d(TAG, "'Add' button found, clicking it...")
            addButton.performClick()

            // Step 6: Verify UI updates to "Pending"
            composeTestRule.waitUntil(timeoutMillis = CONTENT_LOAD_TIMEOUT_MS) {
                resultRow.onChildren().filter(hasText("Pending")).fetchSemanticsNodes().isNotEmpty()
            }
            Log.d(TAG, "✅ PASS: Friend request sent and UI updated to 'Pending'.")

        } catch (e: Exception) {
            Log.d(TAG, "'Add' button not found. Checking for 'Pending' or 'Friends' status.")
            // If "Add" button is not found, it might be because the request is already pending or they are already friends.
            val isPending = resultRow.onChildren().filter(hasText("Pending")).fetchSemanticsNodes().isNotEmpty()
            val areFriends = resultRow.onChildren().filter(hasText("Friends")).fetchSemanticsNodes().isNotEmpty()

            if (isPending) {
                Log.d(TAG, "✅ PASS: Friend request is already pending.")
            } else if (areFriends) {
                Log.d(TAG, "✅ PASS: Users are already friends.")
            } else {
                Log.e(TAG, "Neither 'Add', 'Pending', nor 'Friends' button found.")
                throw e // Re-throw if neither state is found
            }
        }
    }

    /**
     * TEST 3: Verify searching for a user that does not exist.
     *
     * Steps:
     * 1. Navigate to the Friends screen.
     * 2. Click the "Add Friend" button.
     * 3. In the dialog, switch to the "By Name" tab.
     * 4. Type a name that is known not to exist.
     * 5. Verify that the "No users found" message is displayed.
     *
     * Expected Results:
     * - The "No users found" message is displayed.
     */
    @Test
    fun e2e_sendFriendRequest_byName_noUserFound() {
        Log.d(TAG, "TEST 3: Verifying 'no user found' message...")

        // Step 1: Navigate to Friends screen
        composeTestRule.onNodeWithTag("nav_friends").performClick()
        composeTestRule.waitForIdle()
        composeTestRule.waitUntil(timeoutMillis = CONTENT_LOAD_TIMEOUT_MS) {
            composeTestRule.onAllNodesWithTag("friends_screen").fetchSemanticsNodes().isNotEmpty()
        }

        // Step 2: Click "Add Friend" button
        composeTestRule.onNodeWithContentDescription("Add Friend").performClick()
        composeTestRule.waitForIdle()

        // Step 3: Switch to "By Name" tab
        composeTestRule.onNodeWithText("By Name").performClick()

        // Step 4: Enter a name that doesn't exist
        composeTestRule.onNodeWithTag("name_input").performTextInput("NonExistentUser12345")

        // Step 5: Wait for "No users found" message to appear
        composeTestRule.waitUntil(timeoutMillis = CONTENT_LOAD_TIMEOUT_MS) {
            composeTestRule.onAllNodesWithText("No users found").fetchSemanticsNodes().isNotEmpty()
        }

        composeTestRule.onNodeWithText("No users found").assertIsDisplayed()

        Log.d(TAG, "✅ PASS: 'No users found' message displayed.")
    }



    /**
     * TEST 5: Verify dismissing the Add Friend dialog.
     *
     * Steps:
     * 1. Navigate to the Friends screen.
     * 2. Click the "Add Friend" button to open the dialog.
     * 3. Click the "Cancel" button.
     * 4. Verify that the dialog is dismissed.
     *
     .
     * - The dialog is no longer visible.
     */
    @Test
    fun e2e_addFriendDialog_dismissDialog() {
        Log.d(TAG, "TEST 5: Verifying dialog dismissal...")

        // Step 1: Navigate to Friends screen
        composeTestRule.onNodeWithTag("nav_friends").performClick()
        composeTestRule.waitForIdle()
        composeTestRule.waitUntil(timeoutMillis = CONTENT_LOAD_TIMEOUT_MS) {
            composeTestRule.onAllNodesWithTag("friends_screen").fetchSemanticsNodes().isNotEmpty()
        }

        // Step 2: Click "Add Friend" button
        composeTestRule.onNodeWithContentDescription("Add Friend").performClick()
        composeTestRule.waitForIdle()

        // Verify dialog is open
        composeTestRule.onNodeWithText("Add Friend").assertIsDisplayed()

        // Step 3: Click Cancel button
        composeTestRule.onNodeWithText("Cancel").performClick()

        // Step 4: Verify dialog is dismissed
        composeTestRule.onNodeWithText("Add Friend").assertDoesNotExist()

        Log.d(TAG, "✅ PASS: Dialog dismissed successfully.")
    }
}
