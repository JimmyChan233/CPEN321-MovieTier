// Load config first to ensure environment variables are available
import '../config';
import admin from 'firebase-admin';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

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
        // Validate and sanitize the path to prevent directory traversal
        const resolvedPath = path.resolve(serviceAccountPath);

        // Ensure the file exists and is a .json file
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(`Service account file not found: ${resolvedPath}`);
        }

        if (!resolvedPath.endsWith('.json')) {
          throw new Error('Service account file must be a .json file');
        }

        // Read and parse the service account file securely
        const serviceAccountContent = fs.readFileSync(resolvedPath, 'utf8');
        const serviceAccount = JSON.parse(serviceAccountContent);

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
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'messaging/invalid-registration-token' ||
          err.code === 'messaging/registration-token-not-registered') {
        logger.warn(`Invalid FCM token for feed notification: ${err.message ?? 'Unknown error'}`);
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
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'messaging/invalid-registration-token' ||
          err.code === 'messaging/registration-token-not-registered') {
        logger.warn(`Invalid FCM token for friend request notification: ${err.message ?? 'Unknown error'}`);
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
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'messaging/invalid-registration-token' ||
          err.code === 'messaging/registration-token-not-registered') {
        logger.warn(`Invalid FCM token for friend request accepted notification: ${err.message ?? 'Unknown error'}`);
      } else {
        logger.error('Error sending friend request accepted notification:', error);
      }
      return false;
    }
  }

  /**
   * Send notification when someone likes your activity
   */
  async sendLikeNotification(
    recipientToken: string,
    likerName: string,
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
          title: `${likerName} liked your ranking`,
          body: `${likerName} liked your ranking of "${movieTitle}"`,
        },
        data: {
          type: 'activity_like',
          activityId,
          likerName,
          movieTitle
        },
        android: {
          priority: 'normal',
          notification: {
            channelId: 'feed_updates',
            priority: 'default',
            defaultSound: true
          }
        }
      };

      const response = await admin.messaging().send(message);
      logger.info(`Like notification sent successfully: ${response}`);
      return true;
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'messaging/invalid-registration-token' ||
          err.code === 'messaging/registration-token-not-registered') {
        logger.warn(`Invalid FCM token for like notification: ${err.message ?? 'Unknown error'}`);
      } else {
        logger.error('Error sending like notification:', error);
      }
      return false;
    }
  }

  /**
   * Send notification when someone comments on your activity
   */
  async sendCommentNotification(
    recipientToken: string,
    commenterName: string,
    commentText: string,
    movieTitle: string,
    activityId: string
  ): Promise<boolean> {
    if (!this.initialized) {
      logger.warn('Firebase not initialized, skipping notification');
      return false;
    }

    try {
      const truncatedComment = commentText.length > 50
        ? commentText.substring(0, 50) + '...'
        : commentText;

      const message: admin.messaging.Message = {
        token: recipientToken,
        notification: {
          title: `${commenterName} commented on your ranking`,
          body: `${commenterName} on "${movieTitle}": ${truncatedComment}`,
        },
        data: {
          type: 'activity_comment',
          activityId,
          commenterName,
          movieTitle,
          commentText: truncatedComment
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
      logger.info(`Comment notification sent successfully: ${response}`);
      return true;
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'messaging/invalid-registration-token' ||
          err.code === 'messaging/registration-token-not-registered') {
        logger.warn(`Invalid FCM token for comment notification: ${err.message ?? 'Unknown error'}`);
      } else {
        logger.error('Error sending comment notification:', error);
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
    data: Record<string, string>
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
            const token = tokens.at(idx) ?? 'unknown';
            logger.warn(`Failed to send to token ${token}: ${resp.error?.message}`);
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
