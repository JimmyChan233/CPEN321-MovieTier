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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties

/**
 * State holder for fullscreen-related parameters
 */
private data class FullscreenState(
    val customView: View?,
    val onCustomViewChanged: (View?) -> Unit,
    val fullscreenContainer: FrameLayout?,
    val onFullscreenContainerChanged: (FrameLayout?) -> Unit,
    val onFullscreenChanged: (Boolean) -> Unit
)

/**
 * State holder for WebView-related parameters
 */
private data class WebViewState(
    val webViewContainer: FrameLayout?,
    val onWebViewContainerChanged: (FrameLayout?) -> Unit
)

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
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(9f / 16f)
            ) {
                if (!isFullscreen) {
                    YouTubePlayerCloseButton(onDismiss)
                }

                YouTubePlayerWebView(
                    videoKey = videoKey,
                    fullscreenState = FullscreenState(
                        customView = customView,
                        onCustomViewChanged = { customView = it },
                        fullscreenContainer = fullscreenContainer,
                        onFullscreenContainerChanged = { fullscreenContainer = it },
                        onFullscreenChanged = { isFullscreen = it }
                    ),
                    webViewState = WebViewState(
                        webViewContainer = webViewContainer,
                        onWebViewContainerChanged = { webViewContainer = it }
                    )
                )
            }
        }
    }
}

@Composable
private fun YouTubePlayerCloseButton(onDismiss: () -> Unit) {
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

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun YouTubePlayerWebView(
    videoKey: String,
    fullscreenState: FullscreenState,
    webViewState: WebViewState
) {
    AndroidView(
        factory = { ctx ->
            createYouTubeWebViewContainer(
                context = ctx,
                videoKey = videoKey,
                fullscreenState = fullscreenState,
                webViewState = webViewState
            )
        },
        modifier = Modifier
            .fillMaxSize()
            .clip(RoundedCornerShape(12.dp))
            .background(Color.Black)
    )
}

@SuppressLint("SetJavaScriptEnabled")
private fun createYouTubeWebViewContainer(
    context: android.content.Context,
    videoKey: String,
    fullscreenState: FullscreenState,
    webViewState: WebViewState
): FrameLayout {
    return FrameLayout(context).apply {
        webViewState.onWebViewContainerChanged(this)
        val newFullscreenContainer = FrameLayout(context)
        fullscreenState.onFullscreenContainerChanged(newFullscreenContainer)

        addView(WebView(context).apply {
            configureWebViewSettings(settings)
            webChromeClient = createWebChromeClient(
                fullscreenState.onFullscreenChanged,
                fullscreenState.onCustomViewChanged,
                fullscreenState.onFullscreenContainerChanged,
                webViewState.onWebViewContainerChanged,
                newFullscreenContainer
            )
            webViewClient = WebViewClient()
            loadUrl("https://m.youtube.com/watch?v=$videoKey")
        }, ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ))
    }
}

@SuppressLint("SetJavaScriptEnabled")
private fun configureWebViewSettings(settings: WebSettings) {
    settings.apply {
        javaScriptEnabled = true
        domStorageEnabled = true
        loadWithOverviewMode = true
        useWideViewPort = true
        mediaPlaybackRequiresUserGesture = false
        mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        databaseEnabled = true
        cacheMode = WebSettings.LOAD_DEFAULT
        setSupportZoom(true)
        builtInZoomControls = true
        displayZoomControls = false
        userAgentString = userAgentString?.replace("wv", "")
    }
}

private fun createWebChromeClient(
    onFullscreenChanged: (Boolean) -> Unit,
    onCustomViewChanged: (View?) -> Unit,
    onFullscreenContainerChanged: (FrameLayout?) -> Unit,
    onWebViewContainerChanged: (FrameLayout?) -> Unit,
    fullscreenContainer: FrameLayout
): WebChromeClient {
    var webViewContainerRef: FrameLayout? = null
    var customViewRef: View? = null

    return object : WebChromeClient() {
        override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
            if (view != null) {
                customViewRef = view
                onCustomViewChanged(view)
                onFullscreenChanged(true)

                fullscreenContainer.addView(
                    view,
                    ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                )

                webViewContainerRef?.addView(
                    fullscreenContainer,
                    ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                )
            }
        }

        override fun onHideCustomView() {
            if (customViewRef != null) {
                fullscreenContainer.removeView(customViewRef)
                webViewContainerRef?.removeView(fullscreenContainer)
                onCustomViewChanged(null)
                onFullscreenChanged(false)
            }
        }
    }
}
