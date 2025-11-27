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
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.cpen321.movietier.data.api.ApiService
import com.cpen321.movietier.utils.fcm.FcmHelper
import com.cpen321.movietier.ui.navigation.NavGraph
import com.cpen321.movietier.ui.navigation.NavRoutes
import com.cpen321.movietier.ui.user.theme.MovieTierTheme
import com.cpen321.movietier.ui.user.viewmodel.ThemeViewModel
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
            // Note: FCM token registration moved to AuthViewModel after successful authentication
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
                MovieTierBottomNavigation(
                    currentRoute = currentRoute,
                    navController = navController
                )
            }
        }
    ) { innerPadding ->
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            NavGraph(navController = navController)  // Always start at AUTH
        }
    }
}
@Composable
private fun MovieTierBottomNavigation(
    currentRoute: String?,
    navController: androidx.navigation.NavController
) {
    NavigationBar(
        modifier = Modifier.testTag("bottom_navigation")
    ) {
        MovieTierNavigationItem(
            icon = Icons.Default.Favorite,
            label = "Discover",
            route = NavRoutes.RECOMMENDATION,
            currentRoute = currentRoute,
            navController = navController,
            testTag = "nav_recommendation",
            popUpToInclusive = true
        )
        MovieTierNavigationItem(
            icon = Icons.Default.Star,
            label = "Ranking",
            route = NavRoutes.RANKING,
            currentRoute = currentRoute,
            navController = navController,
            testTag = "nav_ranking"
        )
        MovieTierNavigationItem(
            icon = Icons.Default.Home,
            label = "Feed",
            route = NavRoutes.FEED,
            currentRoute = currentRoute,
            navController = navController,
            testTag = "nav_feed"
        )
        MovieTierNavigationItem(
            icon = Icons.Default.Person,
            label = "Friends",
            route = NavRoutes.FRIENDS,
            currentRoute = currentRoute,
            navController = navController,
            testTag = "nav_friends"
        )
        MovieTierNavigationItem(
            icon = Icons.Default.AccountCircle,
            label = "Profile",
            route = NavRoutes.PROFILE,
            currentRoute = currentRoute,
            navController = navController,
            testTag = "nav_profile"
        )
    }
}

@Composable
private fun androidx.compose.foundation.layout.RowScope.MovieTierNavigationItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    route: String,
    currentRoute: String?,
    navController: androidx.navigation.NavController,
    testTag: String,
    popUpToInclusive: Boolean = false
) {
    NavigationBarItem(
        icon = {
            Icon(
                icon,
                contentDescription = label
            )
        },
        label = { Text(label) },
        selected = currentRoute == route,
        onClick = {
            navController.navigate(route) {
                popUpTo(NavRoutes.RECOMMENDATION) {
                    inclusive = popUpToInclusive
                }
            }
        },
        colors = NavigationBarItemDefaults.colors(
            selectedIconColor = MaterialTheme.colorScheme.onPrimaryContainer,
            selectedTextColor = MaterialTheme.colorScheme.onSurface,
            indicatorColor = MaterialTheme.colorScheme.primaryContainer,
            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
        ),
        modifier = Modifier.testTag(testTag)
    )
}