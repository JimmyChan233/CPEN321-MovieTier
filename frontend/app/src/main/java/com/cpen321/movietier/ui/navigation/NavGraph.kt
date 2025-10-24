package com.cpen321.movietier.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.cpen321.movietier.ui.auth.AuthScreen
import com.cpen321.movietier.ui.feed.FeedScreen
import com.cpen321.movietier.ui.friends.FriendsScreen
import com.cpen321.movietier.ui.ranking.RankingScreen
import com.cpen321.movietier.ui.recommendation.RecommendationScreen
import com.cpen321.movietier.ui.profile.ProfileScreen
import com.cpen321.movietier.ui.profile.FriendProfileScreen
import com.cpen321.movietier.ui.profile.EditProfileScreen

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
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(NavRoutes.AUTH) {
            AuthScreen(
                onAuthSuccess = {
                    navController.navigate(NavRoutes.RECOMMENDATION) {
                        popUpTo(NavRoutes.AUTH) { inclusive = true }
                    }
                }
            )
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
            val userId = backStackEntry.arguments?.getString("userId") ?: return@composable
            FriendProfileScreen(navController = navController, userId = userId)
        }

        composable(NavRoutes.WATCHLIST) {
            com.cpen321.movietier.ui.watchlist.WatchlistScreen(navController = navController)
        }
    }
}
