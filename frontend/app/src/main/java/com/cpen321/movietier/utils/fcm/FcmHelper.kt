package com.cpen321.movietier.utils.fcm

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.cpen321.movietier.data.api.ApiService
import com.google.firebase.messaging.FirebaseMessaging
import java.io.IOException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

object FcmHelper {
    private const val TAG = "FcmHelper"
    private const val NOTIFICATION_PERMISSION_REQUEST_CODE = 1001

    /**
     * Initialize FCM and register token with backend
     */
    fun initializeFcm(apiService: ApiService, scope: CoroutineScope) {
        scope.launch(Dispatchers.IO) {
            try {
                // Get FCM token
                val token = FirebaseMessaging.getInstance().token.await()
                Log.d(TAG, "FCM Token retrieved: ${token.take(20)}...")

                // Register token with backend
                val response = apiService.registerFcmToken(mapOf("token" to token))
                if (response.isSuccessful) {
                    Log.d(TAG, "FCM token registered successfully")
                } else {
                    Log.e(TAG, "Failed to register FCM token: ${response.message()}")
                }
            } catch (e: IOException) {
                Log.e(TAG, "Error initializing FCM", e)
            }
        }
    }

    /**
     * Check if notification permission is granted (Android 13+)
     */
    fun hasNotificationPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true // Permission not required before Android 13
        }
    }

    /**
     * Request notification permission (Android 13+)
     */
    fun requestNotificationPermission(activity: Activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (!hasNotificationPermission(activity)) {
                ActivityCompat.requestPermissions(
                    activity,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    NOTIFICATION_PERMISSION_REQUEST_CODE
                )
            }
        }
    }
}
