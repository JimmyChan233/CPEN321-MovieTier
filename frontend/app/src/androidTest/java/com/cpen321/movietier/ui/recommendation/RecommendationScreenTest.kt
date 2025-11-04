package com.cpen321.movietier.ui.recommendation

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.ui.viewmodels.RecommendationUiState
import com.cpen321.movietier.ui.viewmodels.RecommendationViewModel
import io.mockk.MockKAnnotations
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithTag


import androidx.navigation.compose.rememberNavController

/**
 * Frontend Test for Use Case 5: VIEW RECOMMENDED MOVIE LIST
 *
 * Covers:
 * - Main success: recommendations displayed
 * - Fallback: no rankings → trending displayed
 * - Error state: shows error message
 */
@RunWith(AndroidJUnit4::class)
class RecommendationScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private val mockRecommendationViewModel = mockk<RecommendationViewModel>(relaxed = true)

    @Before
    fun setUp() {
        MockKAnnotations.init(this)
    }

    // ==========================================
    // MAIN SUCCESS SCENARIO
    // ==========================================
    /**
     * Scenario:
     * 1. User opens recommendations screen.
     * 2. Personalized recommendations load successfully.
     * 3. List displays movies with correct titles.
     */
    @Test
    fun recommendationScreen_ShowsPersonalizedRecommendations() {
        val recs = listOf(
            Movie(1, "Inception", "A dream within a dream", null, "2010", 8.8),
            Movie(2, "The Dark Knight", "Batman faces Joker", null, "2008", 9.0)
        )
        val uiState =
            MutableStateFlow(RecommendationUiState(isLoading = false, recommendations = recs))

        every { mockRecommendationViewModel.uiState } returns uiState

        composeTestRule.setContent {
            RSContent(
                uiState = uiState.value,
                padding = PaddingValues(),
                featuredMovieOffset = 0,
                recommendationViewModel = mockRecommendationViewModel,
                onRefreshFeatured = {},
                onMovieSelect = {}
            )
        }

        composeTestRule.onNodeWithText("Recommended for You").assertIsDisplayed()
        composeTestRule.onNodeWithText("Inception").assertIsDisplayed()
        composeTestRule.onNodeWithText("The Dark Knight").assertIsDisplayed()
    }

    // ==========================================
    // FAILURE SCENARIO 1a: No ranked movies (trending fallback)
    // ==========================================
    @Test
    fun recommendationScreen_NoRankedMovies_ShowsTrendingFallback() {
        val trending = listOf(Movie(3, "Avatar", "Epic sci-fi", null, "2009", 7.8))
        val uiState = MutableStateFlow(
            RecommendationUiState(
                isLoading = false,
                trendingMovies = trending,
                recommendations = trending,
                isShowingTrending = true
            )
        )

        every { mockRecommendationViewModel.uiState } returns uiState

        composeTestRule.setContent {
            RSContent(
                uiState = uiState.value,
                padding = PaddingValues(),
                featuredMovieOffset = 0,
                recommendationViewModel = mockRecommendationViewModel,
                onRefreshFeatured = {},
                onMovieSelect = {}
            )
        }

        composeTestRule.onNodeWithText("Trending Now").assertIsDisplayed()
        composeTestRule.onNodeWithTag("movie_Avatar").assertIsDisplayed()


    }

    // ==========================================
    // FAILURE SCENARIO 2a: Error while loading
    // ==========================================
    @Test
    fun recommendationScreen_Error_ShowsErrorState() {
        val uiState = MutableStateFlow(
            RecommendationUiState(
                isLoading = false,
                errorMessage = "Failed to load"
            )
        )

        every { mockRecommendationViewModel.uiState } returns uiState

        composeTestRule.setContent {
            RSContent(
                uiState = uiState.value,
                padding = PaddingValues(),
                featuredMovieOffset = 0,
                recommendationViewModel = mockRecommendationViewModel,
                onRefreshFeatured = {},
                onMovieSelect = {}
            )
        }

        composeTestRule.onNodeWithText("Failed to load").assertIsDisplayed()
    }
}