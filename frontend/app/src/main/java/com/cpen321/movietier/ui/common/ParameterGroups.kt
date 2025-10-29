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
