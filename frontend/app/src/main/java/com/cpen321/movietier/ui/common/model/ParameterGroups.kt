package com.cpen321.movietier.ui.common.model

import android.content.Context
import androidx.compose.material3.SnackbarHostState
import com.cpen321.movietier.data.model.Movie
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
 * Groups movie action callbacks for bottom sheets
 */
data class MovieActionCallbacks(
    val onAddToRanking: (Movie) -> Unit = {},
    val onAddToWatchlist: (Movie) -> Unit = {},
    val onDismiss: () -> Unit = {}
)


/**
 * Groups side effect callbacks
 */
data class SideEffectCallbacks(
    val onCountryChanged: (String) -> Unit = {},
    val onMovieDetailsUpdated: (Map<Int, Movie>) -> Unit = {},
    val onCloseSheet: () -> Unit = {}
)
