package com.cpen321.movietier.ui.components

import android.annotation.SuppressLint
import android.app.Activity
import android.content.pm.ActivityInfo
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
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

@Stable
private data class YouTubePlayerState(
    val videoKey: String,
    val activity: Activity?,
    val isFullscreen: Boolean,
    val customView: View?,
    val rootContainer: FrameLayout?,
    val onRootContainerChanged: (FrameLayout) -> Unit,
    val onFullscreenChanged: (Boolean, View?) -> Unit,
    val onDismiss: () -> Unit
)

/**
 * Displays a YouTube video in a popup dialog with fullscreen support
 * Uses WebView to load full YouTube mobile page with improved fullscreen handling
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun YouTubePlayerDialog(
    videoKey: String,
    movieTitle: String,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val activity = context as? Activity
    var isFullscreen by remember { mutableStateOf(false) }
    var customView by remember { mutableStateOf<View?>(null) }
    var rootContainer by remember { mutableStateOf<FrameLayout?>(null) }

    YouTubePlayerCleanup(activity, isFullscreen)

    Dialog(
        onDismissRequest = {
            // Ensure fullscreen mode is exited before dismissing
            if (isFullscreen) {
                isFullscreen = false
                customView = null
                activity?.let { exitFullscreenMode(it) }
            }
            onDismiss()
        },
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false
        )
    ) {
        YouTubePlayerContent(
            state = YouTubePlayerState(
                videoKey = videoKey,
                activity = activity,
                isFullscreen = isFullscreen,
                customView = customView,
                rootContainer = rootContainer,
                onRootContainerChanged = { rootContainer = it },
                onFullscreenChanged = { fullscreen, view ->
                    isFullscreen = fullscreen
                    customView = view
                    activity?.let {
                        if (fullscreen) {
                            enterFullscreenMode(it)
                        } else {
                            exitFullscreenMode(it)
                        }
                    }
                },
                onDismiss = onDismiss
            )
        )
    }
}

@Composable
private fun YouTubePlayerCleanup(activity: Activity?, isFullscreen: Boolean) {
    val originalOrientation = remember { activity?.requestedOrientation }

    DisposableEffect(isFullscreen) {
        onDispose {
            activity?.let {
                // Restore window insets and orientation on cleanup
                if (isFullscreen) {
                    exitFullscreenMode(it)
                }
                // Restore original orientation
                originalOrientation?.let { orientation ->
                    it.requestedOrientation = orientation
                }
            }
        }
    }
}

@Composable
private fun YouTubePlayerContent(state: YouTubePlayerState) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        // Always render the WebView to preserve state
        YouTubePlayerNormalView(
            videoKey = state.videoKey,
            activity = state.activity,
            rootContainer = state.rootContainer,
            onRootContainerChanged = state.onRootContainerChanged,
            onFullscreenChanged = state.onFullscreenChanged,
            onDismiss = state.onDismiss,
            visible = !state.isFullscreen
        )

        // Overlay fullscreen custom view on top when in fullscreen
        if (state.isFullscreen && state.customView != null) {
            AndroidView(
                factory = { state.customView },
                modifier = Modifier.fillMaxSize()
            )
        }
    }
}

@Composable
private fun YouTubePlayerNormalView(
    videoKey: String,
    activity: Activity?,
    rootContainer: FrameLayout?,
    onRootContainerChanged: (FrameLayout) -> Unit,
    onFullscreenChanged: (Boolean, View?) -> Unit,
    onDismiss: () -> Unit,
    visible: Boolean = true
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .fillMaxHeight(0.7f)
            .then(if (!visible) Modifier.size(0.dp) else Modifier),
        horizontalAlignment = Alignment.End
    ) {
        if (visible) {
            YouTubePlayerCloseButton(onDismiss)
        }
        YouTubePlayerWebView(
            videoKey = videoKey,
            activity = activity,
            rootContainer = rootContainer,
            onRootContainerChanged = onRootContainerChanged,
            onFullscreenChanged = onFullscreenChanged
        )
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
    activity: Activity?,
    rootContainer: FrameLayout?,
    onRootContainerChanged: (FrameLayout) -> Unit,
    onFullscreenChanged: (Boolean, View?) -> Unit
) {
    AndroidView(
        factory = { ctx ->
            createYouTubeWebViewContainer(
                context = ctx,
                videoKey = videoKey,
                activity = activity,
                onRootContainerChanged = onRootContainerChanged,
                onFullscreenChanged = onFullscreenChanged
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
    activity: Activity?,
    onRootContainerChanged: (FrameLayout) -> Unit,
    onFullscreenChanged: (Boolean, View?) -> Unit
): FrameLayout {
    return FrameLayout(context).apply {
        onRootContainerChanged(this)

        addView(WebView(context).apply {
            configureWebViewSettings(settings)
            webChromeClient = createWebChromeClient(
                activity = activity,
                onFullscreenChanged = onFullscreenChanged
            )
            webViewClient = WebViewClient()
            loadUrl("https://m.youtube.com/watch?v=$videoKey&autoplay=1")
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
    activity: Activity?,
    onFullscreenChanged: (Boolean, View?) -> Unit
): WebChromeClient {
    var customViewCallback: WebChromeClient.CustomViewCallback? = null

    return object : WebChromeClient() {
        override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
            super.onShowCustomView(view, callback)
            if (view != null) {
                customViewCallback = callback
                onFullscreenChanged(true, view)
                // Allow landscape orientation in fullscreen
                activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
            }
        }

        override fun onHideCustomView() {
            super.onHideCustomView()
            customViewCallback?.onCustomViewHidden()
            customViewCallback = null
            onFullscreenChanged(false, null)
            // Restore portrait orientation
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
    }
}

private fun enterFullscreenMode(activity: Activity) {
    // App already uses edge-to-edge (decorFitsSystemWindows = false), so no need to change it
    WindowInsetsControllerCompat(activity.window, activity.window.decorView).apply {
        hide(WindowInsetsCompat.Type.systemBars())
        systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    }
}

private fun exitFullscreenMode(activity: Activity) {
    // Restore system bars without changing decorFitsSystemWindows (keep edge-to-edge)
    WindowInsetsControllerCompat(activity.window, activity.window.decorView).apply {
        show(WindowInsetsCompat.Type.systemBars())
        systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_DEFAULT
    }
}
