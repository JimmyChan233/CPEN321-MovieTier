package com.cpen321.movietier.ui.common

import android.content.Context
import androidx.compose.material3.SnackbarHostState
import kotlinx.coroutines.CoroutineScope

/**
 * Groups context, coroutine scope, and snackbar host state which commonly travel together
 */
data class CommonContext(
    val context: Context,
    val scope: CoroutineScope,
    val snackbarHostState: SnackbarHostState
)

/**
 * Groups dialog-related UI state for movie dialogs
 */
data class MovieDialogState(
    val trailerKey: String? = null,
    val showTrailerDialog: Boolean = false,
    val trailerMovieTitle: String = ""
)

/**
 * Groups dialog callbacks for movie dialogs
 */
data class MovieDialogCallbacks(
    val onTrailerKeyUpdate: (String?) -> Unit = {},
    val onDismissMovie: () -> Unit = {},
    val onShowTrailer: (String) -> Unit = {},
    val onDismissTrailer: (Boolean) -> Unit = {}
)

/**
 * Groups add friend email-related state
 */
data class AddFriendEmailState(
    val email: String = "",
    val isValidEmail: Boolean = false
)

/**
 * Groups add friend name search state
 */
data class AddFriendNameState(
    val nameQuery: String = "",
    val searchResults: List<com.cpen321.movietier.data.model.User> = emptyList()
)

/**
 * Groups add friend data
 */
data class AddFriendData(
    val friends: List<com.cpen321.movietier.data.model.Friend> = emptyList(),
    val outgoingRequests: List<com.cpen321.movietier.ui.viewmodels.FriendRequestUi> = emptyList()
)

/**
 * Groups add friend callbacks
 */
data class AddFriendCallbacks(
    val onEmailChange: (String) -> Unit = {},
    val onNameQueryChange: (String) -> Unit = {},
    val onSendRequest: (String) -> Unit = {}
)

/**
 * Groups movie action callbacks for bottom sheets
 */
data class MovieActionCallbacks(
    val onAddToRanking: (com.cpen321.movietier.data.model.Movie) -> Unit = {},
    val onAddToWatchlist: (com.cpen321.movietier.data.model.Movie) -> Unit = {},
    val onDismiss: () -> Unit = {}
)

/**
 * Groups ViewModels for profile screen
 */
data class ProfileViewModels(
    val watchlistVm: com.cpen321.movietier.ui.viewmodels.WatchlistViewModel,
    val themeViewModel: com.cpen321.movietier.ui.viewmodels.ThemeViewModel,
    val authViewModel: com.cpen321.movietier.ui.viewmodels.AuthViewModel
)

/**
 * Groups UI state for profile screen
 */
data class ProfileUiStates(
    val authUiState: com.cpen321.movietier.ui.viewmodels.AuthUiState,
    val themeMode: com.cpen321.movietier.ui.theme.ThemeMode
)

/**
 * Groups delete dialog state and callback
 */
data class DeleteDialogState(
    val showDialog: Boolean = false,
    val onShowDialogChange: (Boolean) -> Unit = {}
)

/**
 * Groups ViewModels and NavController for dialog screens
 */
data class DialogViewModels(
    val vm: Any,
    val rankingViewModel: com.cpen321.movietier.ui.viewmodels.RankingViewModel,
    val navController: androidx.navigation.NavController
)

/**
 * Groups ViewModels for recommendation screen dialogs
 */
data class RecommendationViewModels(
    val recommendationViewModel: com.cpen321.movietier.ui.viewmodels.RecommendationViewModel,
    val rankingViewModel: com.cpen321.movietier.ui.viewmodels.RankingViewModel
)

/**
 * Groups side effect callbacks
 */
data class SideEffectCallbacks(
    val onCountryChanged: (String) -> Unit = {},
    val onMovieDetailsUpdated: (Map<Int, com.cpen321.movietier.data.model.Movie>) -> Unit = {},
    val onCloseSheet: () -> Unit = {}
)

/**
 * Groups comments-related state
 */
data class CommentsState(
    val showCommentsForActivity: String? = null,
    val commentsData: Map<String, List<com.cpen321.movietier.data.model.FeedComment>> = emptyMap(),
    val currentUserId: String? = null
)

/**
 * Groups dismiss callbacks
 */
data class DismissCallbacks(
    val onDismissMovie: () -> Unit = {},
    val onDismissComments: () -> Unit = {}
)

/**
 * Groups watchlist content data
 */
data class WatchlistContentData(
    val uiState: com.cpen321.movietier.ui.viewmodels.WatchlistUiState,
    val movieDetails: Map<Int, com.cpen321.movietier.data.model.Movie>,
    val country: String
)

/**
 * Groups data for friend profile side effects
 */
data class FriendProfileSideEffectData(
    val watchlist: List<com.cpen321.movietier.data.model.WatchlistItem>,
    val rankings: List<com.cpen321.movietier.data.model.RankedMovie>,
    val movieDetailsMap: Map<Int, com.cpen321.movietier.data.model.Movie>
)

/**
 * Groups ViewModels for friend profile side effects
 */
data class FriendProfileViewModels(
    val vm: com.cpen321.movietier.ui.viewmodels.FriendProfileViewModel,
    val rankingViewModel: com.cpen321.movietier.ui.viewmodels.RankingViewModel
)
