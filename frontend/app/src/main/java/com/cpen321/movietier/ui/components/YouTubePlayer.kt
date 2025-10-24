package com.cpen321.movietier.ui.components

import android.annotation.SuppressLint
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties

/**
 * Displays a YouTube video in a popup dialog with fullscreen support
 * Uses WebView to load full YouTube mobile page and automatically enters fullscreen
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun YouTubePlayerDialog(
    videoKey: String,
    movieTitle: String,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    var isFullscreen by remember { mutableStateOf(false) }
    var customView by remember { mutableStateOf<View?>(null) }
    var fullscreenContainer by remember { mutableStateOf<FrameLayout?>(null) }
    var webViewContainer by remember { mutableStateOf<FrameLayout?>(null) }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.8f)),
            contentAlignment = Alignment.Center
        ) {
            // Browser container - 9:16 aspect ratio maxed to width
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(9f / 16f)
            ) {
                // Close button row - hide when in fullscreen
                if (!isFullscreen) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 8.dp),
                        horizontalArrangement = Arrangement.End
                    ) {
                        FilledIconButton(
                            onClick = onDismiss,
                            colors = IconButtonDefaults.filledIconButtonColors(
                                containerColor = Color.White,
                                contentColor = Color.Black
                            )
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Close",
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }
                }

                // Embedded Chrome browser with YouTube page
                AndroidView(
                    factory = { ctx ->
                        FrameLayout(ctx).apply {
                            webViewContainer = this

                            // Create fullscreen container
                            fullscreenContainer = FrameLayout(ctx)

                            addView(WebView(ctx).apply {
                                settings.apply {
                                    javaScriptEnabled = true
                                    domStorageEnabled = true
                                    loadWithOverviewMode = true
                                    useWideViewPort = true
                                    mediaPlaybackRequiresUserGesture = false
                                    mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                                    // Enable modern web features
                                    databaseEnabled = true
                                    cacheMode = WebSettings.LOAD_DEFAULT
                                    setSupportZoom(true)
                                    builtInZoomControls = true
                                    displayZoomControls = false
                                    // Set user agent to mobile for better experience
                                    userAgentString = settings.userAgentString?.replace("wv", "")
                                }

                                // Custom WebChromeClient to handle fullscreen
                                webChromeClient = object : WebChromeClient() {
                                    override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                                        if (view != null && fullscreenContainer != null) {
                                            customView = view
                                            isFullscreen = true

                                            // Add fullscreen view to container
                                            fullscreenContainer!!.addView(
                                                view,
                                                ViewGroup.LayoutParams(
                                                    ViewGroup.LayoutParams.MATCH_PARENT,
                                                    ViewGroup.LayoutParams.MATCH_PARENT
                                                )
                                            )

                                            // Add fullscreen container to parent
                                            webViewContainer?.addView(
                                                fullscreenContainer,
                                                ViewGroup.LayoutParams(
                                                    ViewGroup.LayoutParams.MATCH_PARENT,
                                                    ViewGroup.LayoutParams.MATCH_PARENT
                                                )
                                            )
                                        }
                                    }

                                    override fun onHideCustomView() {
                                        if (customView != null && fullscreenContainer != null) {
                                            // Remove fullscreen view
                                            fullscreenContainer!!.removeView(customView)
                                            webViewContainer?.removeView(fullscreenContainer)
                                            customView = null
                                            isFullscreen = false
                                        }
                                    }
                                }

                                webViewClient = WebViewClient()

                                // Load YouTube page
                                loadUrl("https://m.youtube.com/watch?v=$videoKey")
                            }, ViewGroup.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT
                            ))
                        }
                    },
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color.Black)
                )
            }
        }
    }
}
