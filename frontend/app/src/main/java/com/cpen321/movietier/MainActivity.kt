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
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.cpen321.movietier.ui.navigation.NavGraph
import com.cpen321.movietier.ui.navigation.NavRoutes
import com.cpen321.movietier.ui.theme.MovieTierTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MovieTierTheme {
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
                NavigationBar {
                    NavigationBarItem(
                        icon = { Icon(Icons.Default.Home, contentDescription = "Feed") },
                        label = { Text("Feed") },
                        selected = currentRoute == NavRoutes.FEED,
                        onClick = {
                            navController.navigate(NavRoutes.FEED) {
                                popUpTo(NavRoutes.FEED) { inclusive = true }
                            }
                        }
                    )
                    NavigationBarItem(
                        icon = { Icon(Icons.Default.Person, contentDescription = "Friends") },
                        label = { Text("Friends") },
                        selected = currentRoute == NavRoutes.FRIENDS,
                        onClick = {
                            navController.navigate(NavRoutes.FRIENDS) {
                                popUpTo(NavRoutes.FEED)
                            }
                        }
                    )
                    NavigationBarItem(
                        icon = { Icon(Icons.Default.Star, contentDescription = "Ranking") },
                        label = { Text("Ranking") },
                        selected = currentRoute == NavRoutes.RANKING,
                        onClick = {
                            navController.navigate(NavRoutes.RANKING) {
                                popUpTo(NavRoutes.FEED)
                            }
                        }
                    )
                    NavigationBarItem(
                        icon = { Icon(Icons.Default.Favorite, contentDescription = "Recommended") },
                        label = { Text("Recommended") },
                        selected = currentRoute == NavRoutes.RECOMMENDATION,
                        onClick = {
                            navController.navigate(NavRoutes.RECOMMENDATION) {
                                popUpTo(NavRoutes.FEED)
                            }
                        }
                    )
                    NavigationBarItem(
                        icon = { Icon(Icons.Default.AccountCircle, contentDescription = "Profile") },
                        label = { Text("Profile") },
                        selected = currentRoute == NavRoutes.PROFILE,
                        onClick = {
                            navController.navigate(NavRoutes.PROFILE) {
                                popUpTo(NavRoutes.FEED)
                            }
                        }
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
