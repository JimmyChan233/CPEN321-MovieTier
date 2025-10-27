# Firebase Cloud Messaging Setup Guide

This guide will walk you through setting up Firebase Cloud Messaging (FCM) for push notifications in the MovieTier app.
 
## Prerequisites

- Google account
- Firebase project (you should already have one since you added `google-services.json`)
- Node.js backend running
- Android app built and ready to test

## Step 1: Get Firebase Service Account Key (Backend)

### 1.1 Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your MovieTier project

### 1.2 Generate Service Account Key
1. Click the **gear icon** ⚙️ next to "Project Overview" → **Project settings**
2. Go to the **Service accounts** tab
3. Click **Generate new private key**
4. Click **Generate key** in the confirmation dialog
5. A JSON file will download (e.g., `movietier-xxxxx-firebase-adminsdk-xxxxx.json`)

### 1.3 Save the Service Account File
1. Rename the file to something simple like `serviceAccountKey.json`
2. Move it to your backend directory:
   ```bash
   mv ~/Downloads/movietier-*-firebase-adminsdk-*.json /Users/jimmychen/CPEN321-MovieTier/backend/serviceAccountKey.json
   ```

3. **IMPORTANT**: Make sure this file is in `.gitignore`:
   ```bash
   cd /Users/jimmychen/CPEN321-MovieTier/backend
   echo "serviceAccountKey.json" >> .gitignore
   ```

## Step 2: Configure Backend Environment

### 2.1 Update `.env` File
Edit `/Users/jimmychen/CPEN321-MovieTier/backend/.env`:

```bash
# Option 1: Use service account file (RECOMMENDED for development)
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json

# Option 2: Use environment variables (for production/deployment)
# Leave these commented out if using Option 1
# FIREBASE_PROJECT_ID=your-project-id
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

**For local development**, just use Option 1 (service account file path).

### 2.2 Verify Backend Configuration
1. Restart your backend server:
   ```bash
   cd /Users/jimmychen/CPEN321-MovieTier/backend
   npm run dev
   ```

2. Check the logs for:
   ```
   ✓ Firebase Admin initialized with service account
   ```

If you see an error, check that:
- The file path in `.env` is correct
- The JSON file is valid
- The file exists in the backend directory

## Step 3: Verify Android Configuration

### 3.1 Confirm google-services.json is in Place
The file should be at:
```
/Users/jimmychen/CPEN321-MovieTier/frontend/app/google-services.json
```

### 3.2 Verify Project Configuration Matches
Open `google-services.json` and check that:
- The `project_id` matches your Firebase project
- The `package_name` is `com.cpen321.movietier`

## Step 4: Test the Setup

### 4.1 Build and Install the App
```bash
cd /Users/jimmychen/CPEN321-MovieTier/frontend
./gradlew installDebug
```

### 4.2 Test Notification Permission
1. Open the app on your Android device/emulator
2. On first launch (Android 13+), you should see a permission dialog asking to allow notifications
3. **Tap "Allow"**

### 4.3 Verify FCM Token Registration
Check your backend logs. You should see:
```
✓ FCM token registered for user <userId>
```

This means the app successfully registered its FCM token with the backend.

### 4.4 Test Feed Notifications

**Setup:**
1. Have two user accounts (you can use two devices or one device + Android Studio emulator)
2. Make them friends in the app

**Test:**
1. User A opens the app
2. User B opens the app and ranks a movie
3. User A should receive a push notification: "{User B Name} ranked a new movie"

**Debug if no notification:**
- Check backend logs for "Feed notification sent successfully"
- Check if User A granted notification permission
- Try force-closing and reopening the app
- Check Android notification settings (Settings → Apps → MovieTier → Notifications)

### 4.5 Test Friend Request Notifications

**Test:**
1. User A sends a friend request to User B
2. User B should receive a notification: "New Friend Request"
3. User B accepts the request
4. User A should receive a notification: "Friend Request Accepted"

## Step 5: Troubleshooting

### Backend Issues

**"Firebase credentials not found"**
- Check that `FIREBASE_SERVICE_ACCOUNT_PATH` in `.env` points to the correct file
- Verify the JSON file exists and is valid JSON

**"Failed to send FCM notification: messaging/invalid-registration-token"**
- The device's FCM token is invalid or expired
- App will automatically refresh and re-register the token
- User should restart the app

**"ENOENT: no such file or directory"**
- The service account file path is wrong
- Use absolute path: `FIREBASE_SERVICE_ACCOUNT_PATH=/Users/jimmychen/CPEN321-MovieTier/backend/serviceAccountKey.json`

### Frontend Issues

**No notification permission dialog**
- Android 12 and below don't require permission - notifications work automatically
- Android 13+ requires explicit permission

**App crashes on launch**
- Check `google-services.json` is in the correct location
- Verify package name matches in JSON file
- Rebuild: `./gradlew clean assembleDebug`

**Notifications not appearing**
- Check notification permission is granted
- Open Android Settings → Apps → MovieTier → Notifications → Ensure "All MovieTier notifications" is ON
- Check notification channels are enabled
- Try sending a test notification from Firebase Console:
  1. Firebase Console → Cloud Messaging → Send your first message
  2. Enter a test notification
  3. Select the app
  4. Send test message

**FCM token not registering**
- Check backend logs for errors
- Verify API endpoint is reachable
- Check if user is authenticated (token registration requires valid JWT)

## Step 6: Production Deployment (Optional)

When deploying to production (e.g., Azure, AWS, Heroku):

### 6.1 Use Environment Variables Instead of File
1. Extract values from your `serviceAccountKey.json`:
   ```json
   {
     "project_id": "your-project-id",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
   }
   ```

2. Set these as environment variables on your server:
   ```bash
   export FIREBASE_PROJECT_ID="your-project-id"
   export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   export FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
   ```

3. Remove or comment out `FIREBASE_SERVICE_ACCOUNT_PATH` from `.env`

### 6.2 Secure Your Credentials
- Never commit service account JSON to git
- Use secret management (Azure Key Vault, AWS Secrets Manager, etc.)
- Rotate keys periodically

## Notification Channels

The app creates two notification channels:

### Feed Updates
- **ID**: `feed_updates`
- **Name**: Friend Activity
- **Importance**: High
- **Description**: Notifications when friends rank new movies
- **Vibration**: Enabled

### Friend Requests
- **ID**: `friend_requests`
- **Name**: Friend Requests
- **Importance**: High
- **Description**: Friend request notifications
- **Vibration**: Enabled

Users can customize these in Android Settings → Apps → MovieTier → Notifications.

## Testing Checklist

- [ ] Backend starts without Firebase errors
- [ ] App requests notification permission (Android 13+)
- [ ] App registers FCM token with backend (check logs)
- [ ] Feed notification received when friend ranks movie
- [ ] Friend request notification received
- [ ] Friend request accepted notification received
- [ ] Notifications open the app when tapped
- [ ] Notifications appear even when app is closed
- [ ] Notifications work on physical device (not just emulator)

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [Android Notification Channels](https://developer.android.com/develop/ui/views/notifications/channels)
- [Handling FCM Messages on Android](https://firebase.google.com/docs/cloud-messaging/android/receive)

## Need Help?

If you encounter issues:
1. Check backend logs for Firebase initialization messages
2. Check Android logcat for FCM-related logs: `adb logcat | grep FCM`
3. Verify Firebase project configuration in console
4. Test with Firebase Console test notifications first
5. Check that both devices have internet connection
