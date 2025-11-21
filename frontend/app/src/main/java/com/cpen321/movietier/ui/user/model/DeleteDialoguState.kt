package com.cpen321.movietier.ui.user.model

/**
 * Groups delete dialog state and callback
 */
data class DeleteDialogState(
    val showDialog: Boolean = false,
    val onShowDialogChange: (Boolean) -> Unit = {}
)