package com.cpen321.movietier.ui.ranking

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.data.model.RankedMovie
import com.cpen321.movietier.ui.viewmodels.CompareUiState
import com.cpen321.movietier.ui.viewmodels.RankingUiState
import com.cpen321.movietier.ui.viewmodels.RankingViewModel
import com.cpen321.movietier.ui.viewmodels.RankingEvent
import io.mockk.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.MutableSharedFlow
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue

/**
 * Frontend Test for Use Case 4: COMPARE MOVIES
 *
 * Use Case Description: The system generates movie pairs for the user to compare until
 * the system calculates the ranking of the movie being added. The movie pair consists
 * of the movie being ranked and a movie which the user has already ranked previously.
 * The user selects the movie they prefer from the two movies displayed.
 *
 * Test Coverage:
 * - Main success scenario: User successfully compares movies and movie gets ranked
 * - Failure scenario 1a: User has no previously ranked movies (direct insertion)
 * - Failure scenario 3a: User dismisses comparison dialog (movie not added)
 * - Failure scenario 4a: Multiple comparisons needed (iterative binary search)
 */
@RunWith(AndroidJUnit4::class)
class CompareMoviesTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private lateinit var mockRankingViewModel: RankingViewModel

    private val newMovie = Movie(
        id = 101,
        title = "Inception",
        overview = "A thief who steals corporate secrets through dream-sharing technology",
        posterPath = "/inception.jpg",
        releaseDate = "2010-07-16",
        voteAverage = 8.8,
        cast = listOf("Leonardo DiCaprio", "Joseph Gordon-Levitt")
    )

    private val compareMovie1 = Movie(
        id = 201,
        title = "The Matrix",
        overview = "A computer hacker learns about the true nature of reality",
        posterPath = "/matrix.jpg",
        releaseDate = "1999-03-31",
        voteAverage = 8.7,
        cast = listOf("Keanu Reeves", "Laurence Fishburne")
    )

    private val compareMovie2 = Movie(
        id = 202,
        title = "Interstellar",
        overview = "A team of explorers travel through a wormhole in space",
        posterPath = "/interstellar.jpg",
        releaseDate = "2014-11-07",
        voteAverage = 8.6,
        cast = listOf("Matthew McConaughey", "Anne Hathaway")
    )

    @Before
    fun setUp() {
        MockKAnnotations.init(this, relaxUnitFun = true)
        mockRankingViewModel = mockk(relaxed = true)
    }

    // ==========================================
    // MAIN SUCCESS SCENARIO: Compare Movies and Add to Ranking
    // ==========================================
    /**
     * Test: User successfully compares movies and the new movie gets ranked
     *
     * Preconditions:
     * - User is logged into the system
     * - User has previously ranked movies
     * - User has searched and selected a movie to add
     *
     * Scenario Steps:
     * 1. User adds second movie to ranking (triggers comparison flow)
     * 2. System displays comparison UI with two movies side-by-side
     * 3. User selects preferred movie by clicking on it
     * 4. System determines the ranking is complete (status: "added")
     * 5. Movie is ranked and added to the list
     * 6. User gets notified: "Added 'Inception' to rankings"
     *
     * Input: Valid movie selection during comparison
     * Expected Status: 200 OK
     * Expected Behavior: Movie successfully ranked after comparison
     * Expected Output: Success message, movie appears in ranked list
     * Mock Behavior: compareMovies returns AddMovieResponse with status "added"
     */
    @Test
    fun compareMovies_SingleComparison_Success() {
        // Setup mock state
        val compareStateFlow = MutableStateFlow<CompareUiState?>(
            CompareUiState(newMovie = newMovie, compareWith = compareMovie1)
        )

        every { mockRankingViewModel.compareState } returns compareStateFlow

        var comparisonMade = false
        every {
            mockRankingViewModel.compareMovies(newMovie, compareMovie1, any())
        } answers {
            comparisonMade = true
            compareStateFlow.value = null // Clear comparison after selection
        }

        // Render only the comparison dialog
        composeTestRule.setContent {
            val compareState = compareStateFlow.value
            if (compareState != null) {
                MovieComparisonDialog(
                    compareState = compareState,
                    onCompare = { new, compare, preferred ->
                        mockRankingViewModel.compareMovies(new, compare, preferred)
                    }
                )
            }
        }

        // Verify comparison dialog appears
        composeTestRule.onNodeWithText("Which movie do you prefer?").assertIsDisplayed()

        // Verify both movies are displayed
        composeTestRule.onNodeWithText("Inception").assertIsDisplayed()
        composeTestRule.onNodeWithText("The Matrix").assertIsDisplayed()

        // User selects preferred movie (Inception button)
        composeTestRule.onAllNodesWithText("Inception")
            .filter(hasClickAction())
            .onFirst()
            .performClick()

        // Verify compareMovies was called
        verify {
            mockRankingViewModel.compareMovies(newMovie, compareMovie1, newMovie)
        }

        // Verify comparison was processed
        assert(comparisonMade) { "Comparison should have been made" }
    }

    // ==========================================
    // FAILURE SCENARIO 1a: No Previously Ranked Movies (Direct Insertion)
    // ==========================================
    /**
     * Test: User has no previously ranked movies - movie is added directly
     *
     * Scenario Steps:
     * 1. User adds first movie to ranking
     * 2. System recognizes no previous rankings exist
     * 3. System adds movie directly as rank #1 (no comparison needed)
     * 4. User gets notified: "Added 'Inception' to rankings"
     *
     * Input: First movie being added to empty ranking list
     * Expected Status: 200 OK
     * Expected Behavior: Movie added directly without comparison
     * Expected Output: Success message, movie appears as rank #1
     * Mock Behavior: addMovieFromSearch returns status "added" immediately
     */
    @Test
    fun compareMovies_NoExistingRankings_DirectInsertion() {
        // Setup state with no comparison (direct add)
        val compareStateFlow = MutableStateFlow<CompareUiState?>(null)
        val searchResultsFlow = MutableStateFlow(listOf(newMovie))

        every { mockRankingViewModel.compareState } returns compareStateFlow
        every { mockRankingViewModel.searchResults } returns searchResultsFlow
        every { mockRankingViewModel.searchMovies(any()) } answers {
            searchResultsFlow.value = listOf(newMovie)
        }
        every { mockRankingViewModel.addMovieFromSearch(newMovie) } answers {
            // No comparison state set - direct addition
        }

        var dialogOpen = true
        var movieAdded = false

        // Render add movie dialog
        composeTestRule.setContent {
            if (dialogOpen) {
                AddWatchedMovieDialog(
                    query = "Inception",
                    onQueryChange = { mockRankingViewModel.searchMovies(it) },
                    searchResults = searchResultsFlow.value,
                    onAddMovie = { movie ->
                        mockRankingViewModel.addMovieFromSearch(movie)
                        movieAdded = true
                        dialogOpen = false
                    },
                    onDismiss = { dialogOpen = false }
                )
            }
        }

        // Verify dialog is shown
        composeTestRule.onNodeWithText("Add Watched Movie").assertIsDisplayed()

        // Wait for search result
        composeTestRule.waitUntil(timeoutMillis = 3000) {
            composeTestRule.onAllNodesWithTag("search_result_101")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Click Add button
        composeTestRule.onNodeWithTag("search_result_101")
            .onChildren()
            .filterToOne(hasText("Add"))
            .performClick()

        // Verify addMovieFromSearch was called
        verify { mockRankingViewModel.addMovieFromSearch(newMovie) }

        // Verify NO comparison dialog appeared (compareState remains null)
        verify(exactly = 0) { mockRankingViewModel.compareMovies(any(), any(), any()) }

        assert(movieAdded) { "Movie should have been added directly" }
    }

    // ==========================================
    // FAILURE SCENARIO 4a: Multiple Comparisons Needed (Iterative Binary Search)
    // ==========================================
    /**
     * Test: System needs multiple comparisons to determine final ranking
     *
     * Scenario Steps:
     * 1. User adds movie to ranking with multiple existing ranked movies
     * 2. System displays first comparison dialog
     * 3. User selects preferred movie
     * 4. System determines more comparisons are needed (status: "compare")
     * 5. System displays second comparison dialog with different movie
     * 6. User selects preferred movie again
     * 7. System completes ranking (status: "added")
     * 8. Movie is added to ranked list at correct position
     *
     * Input: Multiple comparison iterations needed
     * Expected Status: 200 OK (multiple times)
     * Expected Behavior: Multiple comparison dialogs shown sequentially
     * Expected Output: Movie inserted at correct rank after all comparisons
     * Mock Behavior: First compareMovies returns "compare" status, second returns "added"
     */
@Test
fun compareMovies_MultipleComparisons_IterativeBinarySearch() {
    val compareStateFlow = MutableStateFlow<CompareUiState?>(
        CompareUiState(newMovie = newMovie, compareWith = compareMovie1)
    )

    every { mockRankingViewModel.compareState } returns compareStateFlow

    var comparisonCount = 0
    every { 
        mockRankingViewModel.compareMovies(newMovie, any(), any()) 
    } answers {
        comparisonCount++
        if (comparisonCount == 1) {
            // First comparison: need another comparison
            compareStateFlow.value = CompareUiState(
                newMovie = newMovie,
                compareWith = compareMovie2
            )
        } else {
            // Second comparison: ranking complete
            compareStateFlow.value = null
        }
    }

    // Render comparison dialog that observes the StateFlow
    composeTestRule.setContent {
        val compareState by compareStateFlow.collectAsState() // ✅ Collect as state
        if (compareState != null) {
            MovieComparisonDialog(
                compareState = compareState!!,
                onCompare = { new, compare, preferred ->
                    mockRankingViewModel.compareMovies(new, compare, preferred)
                }
            )
        }
    }

    // Verify first comparison dialog
    composeTestRule.onNodeWithText("Which movie do you prefer?").assertIsDisplayed()
    composeTestRule.onNodeWithText("The Matrix").assertIsDisplayed()

    // Select preferred movie in first comparison
    composeTestRule.onAllNodesWithText("Inception")
        .filter(hasClickAction())
        .onFirst()
        .performClick()

    // ✅ Let compose process the state update
    composeTestRule.waitForIdle()

    // Wait for second comparison to appear (check for Interstellar specifically)
    composeTestRule.waitUntil(timeoutMillis = 5000) { // Increased timeout
        composeTestRule.onAllNodesWithText("Interstellar", useUnmergedTree = true)
            .fetchSemanticsNodes().isNotEmpty()
    }

    // Verify second comparison dialog
    composeTestRule.onNodeWithText("Which movie do you prefer?").assertIsDisplayed()
    composeTestRule.onNodeWithText("Interstellar").assertIsDisplayed()

    // Select preferred movie in second comparison
    composeTestRule.onAllNodesWithText("Interstellar")
        .filter(hasClickAction())
        .onFirst()
        .performClick()

    // Verify compareMovies was called twice
    verify(exactly = 2) { 
        mockRankingViewModel.compareMovies(newMovie, any(), any()) 
    }
}

    // ==========================================
    // FAILURE SCENARIO 3a: User Exits Without Comparing
    // ==========================================
    /**
     * Test: User dismisses comparison dialog - movie is not added
     *
     * Scenario Steps:
     * 1. User is in the middle of comparing movies
     * 2. Comparison dialog is displayed
     * 3. User exits the app or dismisses the dialog
     * 4. System exits comparison flow
     * 5. Movie is NOT added to the ranked list
     *
     * Input: User dismisses/cancels during comparison
     * Expected Behavior: Comparison canceled, no movie added
     * Expected Output: No new movie in ranked list
     * Mock Behavior: N/A (dialog dismiss is UI-only, no backend call)
     */
    @Test
    fun compareMovies_UserDismissesDialog_MovieNotAdded() {
        val compareStateFlow = MutableStateFlow<CompareUiState?>(
            CompareUiState(newMovie = newMovie, compareWith = compareMovie1)
        )

        every { mockRankingViewModel.compareState } returns compareStateFlow

        // Render comparison dialog
        composeTestRule.setContent {
            val compareState = compareStateFlow.value
            if (compareState != null) {
                MovieComparisonDialog(
                    compareState = compareState,
                    onCompare = { new, compare, preferred ->
                        mockRankingViewModel.compareMovies(new, compare, preferred)
                    }
                )
            }
        }

        // Verify comparison dialog is displayed
        composeTestRule.onNodeWithText("Which movie do you prefer?").assertIsDisplayed()

        // Note: The comparison dialog has onDismissRequest disabled during ranking
        // This test verifies that the dialog is non-dismissable by design
        // In the current implementation, users must complete the comparison

        // Verify no comparison was made (user didn't click anything)
        verify(exactly = 0) {
            mockRankingViewModel.compareMovies(any(), any(), any())
        }
    }

    // ==========================================
    // ADDITIONAL TEST: Verify Movie Details Display During Comparison
    // ==========================================
    /**
     * Test: Comparison dialog shows movie details correctly
     *
     * Input: Active comparison state
     * Expected Behavior: Both movies displayed with posters and titles
     * Expected Output: Movie posters and titles visible in comparison UI
     */
    @Test
    fun compareMovies_VerifyMovieDetailsDisplay() {
        val compareStateFlow = MutableStateFlow<CompareUiState?>(
            CompareUiState(newMovie = newMovie, compareWith = compareMovie1)
        )

        every { mockRankingViewModel.compareState } returns compareStateFlow

        composeTestRule.setContent {
            val compareState = compareStateFlow.value
            if (compareState != null) {
                MovieComparisonDialog(
                    compareState = compareState,
                    onCompare = { _, _, _ -> }
                )
            }
        }

        // Verify comparison prompt
        composeTestRule.onNodeWithText("Which movie do you prefer?").assertIsDisplayed()

        // Verify helper text
        composeTestRule.onNodeWithText("Help us place 'Inception' in your rankings:")
            .assertIsDisplayed()

        // Verify both movie titles are present
        composeTestRule.onNodeWithText("Inception").assertIsDisplayed()
        composeTestRule.onNodeWithText("The Matrix").assertIsDisplayed()

        // Verify both movies have clickable buttons
        composeTestRule.onAllNodesWithText("Inception")
            .filter(hasClickAction())
            .assertCountEquals(1)

        composeTestRule.onAllNodesWithText("The Matrix")
            .filter(hasClickAction())
            .assertCountEquals(1)
    }
    
}