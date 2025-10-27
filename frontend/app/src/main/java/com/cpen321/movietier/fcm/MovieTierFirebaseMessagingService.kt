package com.cpen321.movietier.fcm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.cpen321.movietier.MainActivity
import com.cpen321.movietier.R
import com.cpen321.movietier.data.api.ApiService
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class MovieTierFirebaseMessagingService : FirebaseMessagingService() {

    @Inject
    lateinit var apiService: ApiService

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    companion object {
        private const val TAG = "FCMService"
        private const val FEED_CHANNEL_ID = "feed_updates"
        private const val FEED_CHANNEL_NAME = "Friend Activity"
        private const val FRIEND_CHANNEL_ID = "friend_requests"
        private const val FRIEND_CHANNEL_NAME = "Friend Requests"
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "Refreshed token: $token")

        // Send token to backend
        serviceScope.launch {
            try {
                val response = apiService.registerFcmToken(mapOf("token" to token))
                if (response.isSuccessful) {
                    Log.d(TAG, "FCM token registered successfully")
                } else {
                    Log.e(TAG, "Failed to register FCM token: ${response.message()}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error registering FCM token", e)
            }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        Log.d(TAG, "Message received from: ${message.from}")

        // Get notification type
        val notificationType = message.data["type"] ?: return

        when (notificationType) {
            "feed_activity" -> handleFeedNotification(message)
            "friend_request" -> handleFriendRequestNotification(message)
            "friend_request_accepted" -> handleFriendRequestAcceptedNotification(message)
            "activity_like" -> handleActivityLikeNotification(message)
            "activity_comment" -> handleActivityCommentNotification(message)
            else -> Log.w(TAG, "Unknown notification type: $notificationType")
        }
    }

    private fun handleFeedNotification(message: RemoteMessage) {
        val friendName = message.data["friendName"] ?: "A friend"
        val movieTitle = message.data["movieTitle"] ?: "a movie"

        val title = message.notification?.title ?: "$friendName ranked a new movie"
        val body = message.notification?.body ?: "$friendName just ranked \"$movieTitle\""

        showNotification(
            channelId = FEED_CHANNEL_ID,
            notificationId = System.currentTimeMillis().toInt(),
            title = title,
            body = body,
            priority = NotificationCompat.PRIORITY_HIGH
        )
    }

    private fun handleFriendRequestNotification(message: RemoteMessage) {
        val senderName = message.data["senderName"] ?: "Someone"

        val title = message.notification?.title ?: "New Friend Request"
        val body = message.notification?.body ?: "$senderName sent you a friend request"

        showNotification(
            channelId = FRIEND_CHANNEL_ID,
            notificationId = System.currentTimeMillis().toInt(),
            title = title,
            body = body,
            priority = NotificationCompat.PRIORITY_HIGH
        )
    }

    private fun handleFriendRequestAcceptedNotification(message: RemoteMessage) {
        val accepterName = message.data["accepterName"] ?: "Someone"

        val title = message.notification?.title ?: "Friend Request Accepted"
        val body = message.notification?.body ?: "$accepterName accepted your friend request"

        showNotification(
            channelId = FRIEND_CHANNEL_ID,
            notificationId = System.currentTimeMillis().toInt(),
            title = title,
            body = body,
            priority = NotificationCompat.PRIORITY_DEFAULT
        )
    }

    private fun handleActivityLikeNotification(message: RemoteMessage) {
        val likerName = message.data["likerName"] ?: "Someone"
        val movieTitle = message.data["movieTitle"] ?: "a movie"

        val title = message.notification?.title ?: "$likerName liked your ranking"
        val body = message.notification?.body ?: "$likerName liked your ranking of \"$movieTitle\""

        showNotification(
            channelId = FEED_CHANNEL_ID,
            notificationId = System.currentTimeMillis().toInt(),
            title = title,
            body = body,
            priority = NotificationCompat.PRIORITY_DEFAULT
        )
    }

    private fun handleActivityCommentNotification(message: RemoteMessage) {
        val commenterName = message.data["commenterName"] ?: "Someone"
        val movieTitle = message.data["movieTitle"] ?: "a movie"
        val commentText = message.data["commentText"] ?: ""

        val title = message.notification?.title ?: "$commenterName commented on your ranking"
        val body = message.notification?.body ?: "$commenterName on \"$movieTitle\": $commentText"

        showNotification(
            channelId = FEED_CHANNEL_ID,
            notificationId = System.currentTimeMillis().toInt(),
            title = title,
            body = body,
            priority = NotificationCompat.PRIORITY_HIGH
        )
    }

    private fun showNotification(
        channelId: String,
        notificationId: Int,
        title: String,
        body: String,
        priority: Int
    ) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(priority)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(notificationId, notification)
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Feed updates channel
            val feedChannel = NotificationChannel(
                FEED_CHANNEL_ID,
                FEED_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications when friends rank new movies"
                enableVibration(true)
            }

            // Friend requests channel
            val friendChannel = NotificationChannel(
                FRIEND_CHANNEL_ID,
                FRIEND_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Friend request notifications"
                enableVibration(true)
            }

            notificationManager.createNotificationChannel(feedChannel)
            notificationManager.createNotificationChannel(friendChannel)
        }
    }
}
