package com.cpen321.movietier.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.cpen321.movietier.ui.auth.screen.AuthScreen
import com.cpen321.movietier.ui.feed.screen.FeedScreen
import com.cpen321.movietier.ui.friends.screen.FriendsScreen
import com.cpen321.movietier.ui.movie.screen.RankingScreen
import com.cpen321.movietier.ui.recommendation.screen.RecommendationScreen
import com.cpen321.movietier.ui.user.screen.ProfileScreen
import com.cpen321.movietier.ui.friends.screen.FriendProfileScreen
import com.cpen321.movietier.ui.user.screen.EditProfileScreen
import androidx.hilt.navigation.compose.hiltViewModel
import com.cpen321.movietier.ui.auth.viewmodel.AuthViewModel
import com.cpen321.movietier.ui.watchlist.screen.WatchlistScreen

object NavRoutes {
    const val AUTH = "auth"
    const val FEED = "feed"
    const val FRIENDS = "friends"
    const val RANKING = "ranking"
    const val RECOMMENDATION = "recommendation"
    const val PROFILE = "profile"
    const val EDIT_PROFILE = "edit_profile"
    const val PROFILE_USER = "profile/{userId}"
    const val WATCHLIST = "watchlist"
}

@Composable
fun NavGraph(
    navController: NavHostController,
    startDestination: String = NavRoutes.AUTH
) {
    val authViewModel: AuthViewModel = hiltViewModel()
    val authState = authViewModel.uiState.collectAsState()

    // ✅ Navigate when auth state changes
    LaunchedEffect(authState.value.isAuthenticated) {
        if (authState.value.isAuthenticated) {
            navController.navigate(NavRoutes.RECOMMENDATION) {
                popUpTo(NavRoutes.AUTH) { inclusive = true }
            }
        }
    }

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(NavRoutes.AUTH) {
            AuthScreen()
        }

        composable(NavRoutes.FEED) {
            FeedScreen(navController = navController)
        }

        composable(NavRoutes.FRIENDS) {
            FriendsScreen(navController = navController)
        }

        composable(NavRoutes.RANKING) {
            RankingScreen(navController = navController)
        }

        composable(NavRoutes.RECOMMENDATION) {
            RecommendationScreen(navController = navController)
        }

        composable(NavRoutes.PROFILE) {
            ProfileScreen(navController = navController)
        }

        composable(NavRoutes.EDIT_PROFILE) {
            EditProfileScreen(navController = navController)
        }

        composable(NavRoutes.PROFILE_USER) { backStackEntry ->
            val userId = backStackEntry.arguments?.getString("userId")
            if (userId != null) {
                FriendProfileScreen(navController = navController, userId = userId)
            }
        }

        composable(NavRoutes.WATCHLIST) {
            WatchlistScreen(navController = navController)
        }
    }
}