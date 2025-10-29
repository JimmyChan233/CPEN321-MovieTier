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
