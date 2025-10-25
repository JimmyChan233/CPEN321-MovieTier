import admin from 'firebase-admin';
import { logger } from '../utils/logger';

class NotificationService {
  private initialized = false;

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      // Check if Firebase is already initialized
      if (admin.apps.length > 0) {
        this.initialized = true;
        logger.info('Firebase Admin already initialized');
        return;
      }

      // Initialize Firebase Admin with service account
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

      if (serviceAccountPath) {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        this.initialized = true;
        logger.success('Firebase Admin initialized with service account');
      } else if (process.env.FIREBASE_PROJECT_ID) {
        // Fallback: Initialize with environment variables (for production)
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
          })
        });
        this.initialized = true;
        logger.success('Firebase Admin initialized with environment variables');
      } else {
        logger.warn('Firebase credentials not found. Push notifications will be disabled.');
      }
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin:', error);
      this.initialized = false;
    }
  }

  /**
   * Send notification when a friend ranks a new movie
   */
  async sendFeedNotification(
    recipientToken: string,
    friendName: string,
    movieTitle: string,
    activityId: string
  ): Promise<boolean> {
    if (!this.initialized) {
      logger.warn('Firebase not initialized, skipping notification');
      return false;
    }

    try {
      const message: admin.messaging.Message = {
        token: recipientToken,
        notification: {
          title: `${friendName} ranked a new movie`,
          body: `${friendName} just ranked "${movieTitle}"`,
        },
        data: {
          type: 'feed_activity',
          activityId,
          friendName,
          movieTitle
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'feed_updates',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true
          }
        }
      };

      const response = await admin.messaging().send(message);
      logger.info(`Feed notification sent successfully: ${response}`);
      return true;
    } catch (error: any) {
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        logger.warn(`Invalid FCM token for feed notification: ${error.message}`);
      } else {
        logger.error('Error sending feed notification:', error);
      }
      return false;
    }
  }

  /**
   * Send notification for friend request received
   */
  async sendFriendRequestNotification(
    recipientToken: string,
    senderName: string,
    requestId: string
  ): Promise<boolean> {
    if (!this.initialized) {
      logger.warn('Firebase not initialized, skipping notification');
      return false;
    }

    try {
      const message: admin.messaging.Message = {
        token: recipientToken,
        notification: {
          title: 'New Friend Request',
          body: `${senderName} sent you a friend request`,
        },
        data: {
          type: 'friend_request',
          requestId,
          senderName
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'friend_requests',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true
          }
        }
      };

      const response = await admin.messaging().send(message);
      logger.info(`Friend request notification sent successfully: ${response}`);
      return true;
    } catch (error: any) {
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        logger.warn(`Invalid FCM token for friend request notification: ${error.message}`);
      } else {
        logger.error('Error sending friend request notification:', error);
      }
      return false;
    }
  }

  /**
   * Send notification when friend request is accepted
   */
  async sendFriendRequestAcceptedNotification(
    recipientToken: string,
    accepterName: string
  ): Promise<boolean> {
    if (!this.initialized) {
      logger.warn('Firebase not initialized, skipping notification');
      return false;
    }

    try {
      const message: admin.messaging.Message = {
        token: recipientToken,
        notification: {
          title: 'Friend Request Accepted',
          body: `${accepterName} accepted your friend request`,
        },
        data: {
          type: 'friend_request_accepted',
          accepterName
        },
        android: {
          priority: 'normal',
          notification: {
            channelId: 'friend_requests',
            priority: 'default',
            defaultSound: true
          }
        }
      };

      const response = await admin.messaging().send(message);
      logger.info(`Friend request accepted notification sent successfully: ${response}`);
      return true;
    } catch (error: any) {
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        logger.warn(`Invalid FCM token for friend request accepted notification: ${error.message}`);
      } else {
        logger.error('Error sending friend request accepted notification:', error);
      }
      return false;
    }
  }

  /**
   * Send notifications to multiple users (for batch notifications)
   */
  async sendMulticastNotification(
    tokens: string[],
    title: string,
    body: string,
    data: { [key: string]: string }
  ): Promise<number> {
    if (!this.initialized) {
      logger.warn('Firebase not initialized, skipping notification');
      return 0;
    }

    if (tokens.length === 0) {
      return 0;
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title,
          body
        },
        data,
        android: {
          priority: 'high',
          notification: {
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true
          }
        }
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      logger.info(`Multicast notification: ${response.successCount} successful, ${response.failureCount} failed`);

      // Log failed tokens for cleanup
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            logger.warn(`Failed to send to token ${tokens[idx]}: ${resp.error?.message}`);
          }
        });
      }

      return response.successCount;
    } catch (error) {
      logger.error('Error sending multicast notification:', error);
      return 0;
    }
  }
}

export default new NotificationService();
