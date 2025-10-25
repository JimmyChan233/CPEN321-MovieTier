package com.cpen321.movietier

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.lifecycle.lifecycleScope
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.cpen321.movietier.data.api.ApiService
import com.cpen321.movietier.fcm.FcmHelper
import com.cpen321.movietier.ui.navigation.NavGraph
import com.cpen321.movietier.ui.navigation.NavRoutes
import com.cpen321.movietier.ui.theme.MovieTierTheme
import com.cpen321.movietier.ui.viewmodels.ThemeViewModel
import androidx.hilt.navigation.compose.hiltViewModel
import com.google.firebase.FirebaseApp
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var apiService: ApiService

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Only attempt FCM setup if google_app_id is present (i.e., google-services.json added)
        val googleAppIdResId = resources.getIdentifier("google_app_id", "string", packageName)
        val hasGoogleAppId = googleAppIdResId != 0 && runCatching { getString(googleAppIdResId) }.getOrNull()?.isNotBlank() == true

        if (hasGoogleAppId) {
            // Initialize FirebaseApp since auto-init provider is disabled when missing config
            runCatching { FirebaseApp.initializeApp(applicationContext) }
            // Request notification permission (Android 13+)
            FcmHelper.requestNotificationPermission(this)
            // Initialize FCM and register token
            FcmHelper.initializeFcm(apiService, lifecycleScope)
        }

        setContent {
            val themeViewModel: ThemeViewModel = hiltViewModel()
            val themeMode by themeViewModel.themeMode.collectAsState()
            MovieTierTheme(themeMode = themeMode) {
                MovieTierApp()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MovieTierApp() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val showBottomBar = currentRoute != NavRoutes.AUTH

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(
                    modifier = Modifier.testTag("bottom_navigation")
                ) {
                    // 1. Discover
                    NavigationBarItem(
                        icon = {
                            Icon(
                                Icons.Default.Favorite,
                                contentDescription = "Discover"
                            )
                        },
                        label = { Text("Discover") },
                        selected = currentRoute == NavRoutes.RECOMMENDATION,
                        onClick = {
                            navController.navigate(NavRoutes.RECOMMENDATION) {
                                popUpTo(NavRoutes.RECOMMENDATION) { inclusive = true }
                            }
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.onPrimaryContainer,
                            selectedTextColor = MaterialTheme.colorScheme.onSurface,
                            indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                        ),
                        modifier = Modifier.testTag("nav_recommendation")
                    )
                    // 2. Ranking
                    NavigationBarItem(
                        icon = {
                            Icon(
                                Icons.Default.Star,
                                contentDescription = "Ranking"
                            )
                        },
                        label = { Text("Ranking") },
                        selected = currentRoute == NavRoutes.RANKING,
                        onClick = {
                            navController.navigate(NavRoutes.RANKING) {
                                popUpTo(NavRoutes.RECOMMENDATION)
                            }
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.onPrimaryContainer,
                            selectedTextColor = MaterialTheme.colorScheme.onSurface,
                            indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                        ),
                        modifier = Modifier.testTag("nav_ranking")
                    )
                    // 3. Feed
                    NavigationBarItem(
                        icon = {
                            Icon(
                                Icons.Default.Home,
                                contentDescription = "Feed"
                            )
                        },
                        label = { Text("Feed") },
                        selected = currentRoute == NavRoutes.FEED,
                        onClick = {
                            navController.navigate(NavRoutes.FEED) {
                                popUpTo(NavRoutes.RECOMMENDATION)
                            }
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.onPrimaryContainer,
                            selectedTextColor = MaterialTheme.colorScheme.onSurface,
                            indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                        ),
                        modifier = Modifier.testTag("nav_feed")
                    )
                    // 4. Friends
                    NavigationBarItem(
                        icon = {
                            Icon(
                                Icons.Default.Person,
                                contentDescription = "Friends"
                            )
                        },
                        label = { Text("Friends") },
                        selected = currentRoute == NavRoutes.FRIENDS,
                        onClick = {
                            navController.navigate(NavRoutes.FRIENDS) {
                                popUpTo(NavRoutes.RECOMMENDATION)
                            }
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.onPrimaryContainer,
                            selectedTextColor = MaterialTheme.colorScheme.onSurface,
                            indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                        ),
                        modifier = Modifier.testTag("nav_friends")
                    )
                    // 5. Profile
                    NavigationBarItem(
                        icon = {
                            Icon(
                                Icons.Default.AccountCircle,
                                contentDescription = "Profile"
                            )
                        },
                        label = { Text("Profile") },
                        selected = currentRoute == NavRoutes.PROFILE,
                        onClick = {
                            navController.navigate(NavRoutes.PROFILE) {
                                popUpTo(NavRoutes.RECOMMENDATION)
                            }
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.onPrimaryContainer,
                            selectedTextColor = MaterialTheme.colorScheme.onSurface,
                            indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                        ),
                        modifier = Modifier.testTag("nav_profile")
                    )
                }
            }
        }
    ) { innerPadding ->
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            NavGraph(navController = navController)
        }
    }
}
