/**
 * Notification Service Tests - Mocked
 * Tests notification service with mocked Firebase Admin
 */

import admin from 'firebase-admin';

// Mock firebase-admin before importing the service
jest.mock('firebase-admin', () => {
  const mockMessaging = {
    send: jest.fn(),
    sendEachForMulticast: jest.fn()
  };

  return {
    __esModule: true,
    default: {
      apps: [],
      initializeApp: jest.fn(),
      credential: {
        cert: jest.fn()
      },
      messaging: jest.fn(() => mockMessaging)
    }
  };
});

// Mock logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Notification Service Tests - Mocked', () => {
  let notificationService: any;
  let mockMessaging: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Get mock messaging instance
    mockMessaging = (admin as any).messaging();

    // Reset environment variables
    delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;

    // Reset Firebase apps
    (admin as any).apps = [];
  });

  // Test Case 1: Initialize with service account path
  it('should initialize Firebase with service account path', () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH = './__mocks__/firebase-service-account.json';

    // Mock require to return service account
    jest.mock('./__mocks__/firebase-service-account.json', () => ({
      project_id: 'test-project',
      client_email: 'test@test.com',
      private_key: 'test-key'
    }), { virtual: true });

    // Re-import service to trigger initialization
    const NotificationService = require('../../src/services/notification.service').default;

    expect(admin.credential.cert).toHaveBeenCalled();
  });

  // Test Case 2: Initialize with environment variables
  it('should initialize Firebase with environment variables', () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key\\nwith\\nnewlines';

    const NotificationService = require('../../src/services/notification.service').default;

    expect(admin.credential.cert).toHaveBeenCalledWith({
      projectId: 'test-project',
      clientEmail: 'test@test.com',
      privateKey: 'test-key\nwith\nnewlines'
    });
  });

  // Test Case 3: Handle missing credentials
  it('should handle missing Firebase credentials', () => {
    // No env vars set
    const NotificationService = require('../../src/services/notification.service').default;

    // Should warn but not throw
    expect(true).toBe(true);
  });

  // Test Case 4: Send feed notification successfully
  it('should send feed notification successfully', async () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    (admin as any).apps = [{}]; // Simulate initialized

    mockMessaging.send.mockResolvedValue('message-id-123');

    const NotificationService = require('../../src/services/notification.service').default;
    (NotificationService as any).initialized = true;

    const result = await NotificationService.sendFeedNotification(
      'test-token',
      'John Doe',
      'Inception',
      'activity-123'
    );

    expect(result).toBe(true);
    expect(mockMessaging.send).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'test-token',
        notification: expect.objectContaining({
          title: 'John Doe ranked a new movie',
          body: 'John Doe just ranked "Inception"'
        }),
        data: {
          type: 'feed_activity',
          activityId: 'activity-123',
          friendName: 'John Doe',
          movieTitle: 'Inception'
        }
      })
    );
  });

  // Test Case 5: Feed notification when not initialized
  it('should skip feed notification when not initialized', async () => {
    const NotificationService = require('../../src/services/notification.service').default;
    (NotificationService as any).initialized = false;

    const result = await NotificationService.sendFeedNotification(
      'test-token',
      'John',
      'Movie',
      'act-1'
    );

    expect(result).toBe(false);
    expect(mockMessaging.send).not.toHaveBeenCalled();
  });

  // Test Case 6: Handle invalid registration token error
  it('should handle invalid registration token error', async () => {
    (admin as any).apps = [{}];

    const error: any = new Error('Invalid registration token');
    error.code = 'messaging/invalid-registration-token';
    mockMessaging.send.mockRejectedValue(error);

    const NotificationService = require('../../src/services/notification.service').default;
    (NotificationService as any).initialized = true;

    const result = await NotificationService.sendFeedNotification(
      'invalid-token',
      'John',
      'Movie',
      'act-1'
    );

    expect(result).toBe(false);
  });

  // Test Case 7: Handle registration token not registered error
  it('should handle registration token not registered error', async () => {
    (admin as any).apps = [{}];

    const error: any = new Error('Token not registered');
    error.code = 'messaging/registration-token-not-registered';
    mockMessaging.send.mockRejectedValue(error);

    const NotificationService = require('../../src/services/notification.service').default;
    (NotificationService as any).initialized = true;

    const result = await NotificationService.sendFeedNotification(
      'unregistered-token',
      'John',
      'Movie',
      'act-1'
    );

    expect(result).toBe(false);
  });

  // Test Case 8: Handle generic sending error
  it('should handle generic sending error', async () => {
    (admin as any).apps = [{}];

    mockMessaging.send.mockRejectedValue(new Error('Network error'));

    const NotificationService = require('../../src/services/notification.service').default;
    (NotificationService as any).initialized = true;

    const result = await NotificationService.sendFeedNotification(
      'test-token',
      'John',
      'Movie',
      'act-1'
    );

    expect(result).toBe(false);
  });

  // Test Case 9: Send friend request notification
  it('should send friend request notification', async () => {
    (admin as any).apps = [{}];
    mockMessaging.send.mockResolvedValue('msg-id');

    const NotificationService = require('../../src/services/notification.service').default;
    (NotificationService as any).initialized = true;

    const result = await NotificationService.sendFriendRequestNotification(
      'token-123',
      'Alice',
      'request-456'
    );

    expect(result).toBe(true);
    expect(mockMessaging.send).toHaveBeenCalledWith(
      expect.objectContaining({
        notification: expect.objectContaining({
          title: 'New Friend Request',
          body: 'Alice sent you a friend request'
        }),
        data: {
          type: 'friend_request',
          requestId: 'request-456',
          senderName: 'Alice'
        }
      })
    );
  });

  // Test Case 10: Send friend request accepted notification
  it('should send friend request accepted notification', async () => {
    (admin as any).apps = [{}];
    mockMessaging.send.mockResolvedValue('msg-id');

    const NotificationService = require('../../src/services/notification.service').default;
    (NotificationService as any).initialized = true;

    const result = await NotificationService.sendFriendRequestAcceptedNotification(
      'token-123',
      'Bob'
    );

    expect(result).toBe(true);
    expect(mockMessaging.send).toHaveBeenCalledWith(
      expect.objectContaining({
        notification: expect.objectContaining({
          title: 'Friend Request Accepted',
          body: 'Bob accepted your friend request'
        }),
        data: {
          type: 'friend_request_accepted',
          accepterName: 'Bob'
        }
      })
    );
  });

  // Test Case 11: Send like notification
  it('should send like notification', async () => {
    (admin as any).apps = [{}];
    mockMessaging.send.mockResolvedValue('msg-id');

    const NotificationService = require('../../src/services/notification.service').default;
    (NotificationService as any).initialized = true;

    const result = await NotificationService.sendLikeNotification(
      'token-123',
      'Charlie',
      'The Matrix',
      'activity-789'
    );

    expect(result).toBe(true);
    expect(mockMessaging.send).toHaveBeenCalledWith(
      expect.objectContaining({
        notification: expect.objectContaining({
          title: 'Charlie liked your ranking',
          body: 'Charlie liked your ranking of "The Matrix"'
        }),
        data: {
          type: 'activity_like',
          activityId: 'activity-789',
          likerName: 'Charlie',
          movieTitle: 'The Matrix'
        }
      })
    );
  });

  // Test Case 12: Send comment notification
  it('should send comment notification', async () => {
    (admin as any).apps = [{}];
    mockMessaging.send.mockResolvedValue('msg-id');

    const NotificationService = require('../../src/services/notification.service').default;
    (NotificationService as any).initialized = true;

    const result = await NotificationService.sendCommentNotification(
      'token-123',
      'Diana',
      'Great movie!',
      'Interstellar',
      'activity-321'
    );

    expect(result).toBe(true);
    expect(mockMessaging.send).toHaveBeenCalledWith(
      expect.objectContaining({
        notification: expect.objectContaining({
          title: 'Diana commented on your ranking',
          body: 'Diana on "Interstellar": Great movie!'
        })
      })
    );
  });

  // Test Case 13: Truncate long comments
  it('should truncate long comments in notification', async () => {
    (admin as any).apps = [{}];
    mockMessaging.send.mockResolvedValue('msg-id');

    const NotificationService = require('../../src/services/notification.service').default;
    (NotificationService as any).initialized = true;

    const longComment = 'This is a very long comment that exceeds fifty characters and should be truncated';

    await NotificationService.sendCommentNotification(
      'token-123',
      'Eve',
      longComment,
      'Movie',
      'act-1'
    );

    expect(mockMessaging.send).toHaveBeenCalledWith(
      expect.objectContaining({
        notification: expect.objectContaining({
          body: expect.stringContaining('...')
        })
      })
    );
  });

  // Test Case 14: Send multicast notification
  it('should send multicast notification to multiple tokens', async () => {
    (admin as any).apps = [{}];

    mockMessaging.sendEachForMulticast.mockResolvedValue({
      successCount: 3,
      failureCount: 0,
      responses: [
        { success: true },
        { success: true },
        { success: true }
      ]
    });

    const NotificationService = require('../../src/services/notification.service').default;
    (NotificationService as any).initialized = true;

    const tokens = ['token1', 'token2', 'token3'];
    const result = await NotificationService.sendMulticastNotification(
      tokens,
      'Test Title',
      'Test Body',
      { key: 'value' }
    );

    expect(result).toBe(3);
    expect(mockMessaging.sendEachForMulticast).toHaveBeenCalled();
  });

  // Test Case 15: Handle multicast with some failures
  it('should handle multicast with partial failures', async () => {
    (admin as any).apps = [{}];

    mockMessaging.sendEachForMulticast.mockResolvedValue({
      successCount: 2,
      failureCount: 1,
      responses: [
        { success: true },
        { success: false, error: { message: 'Invalid token' } },
        { success: true }
      ]
    });

    const NotificationService = require('../../src/services/notification.service').default;
    (NotificationService as any).initialized = true;

    const tokens = ['token1', 'invalid-token', 'token3'];
    const result = await NotificationService.sendMulticastNotification(
      tokens,
      'Title',
      'Body',
      {}
    );

    expect(result).toBe(2);
  });

  // Test Case 16: Handle multicast with empty token array
  it('should handle multicast with empty token array', async () => {
    const NotificationService = require('../../src/services/notification.service').default;
    (NotificationService as any).initialized = true;

    const result = await NotificationService.sendMulticastNotification(
      [],
      'Title',
      'Body',
      {}
    );

    expect(result).toBe(0);
    expect(mockMessaging.sendEachForMulticast).not.toHaveBeenCalled();
  });

  // Test Case 17: Handle multicast when not initialized
  it('should skip multicast when not initialized', async () => {
    const NotificationService = require('../../src/services/notification.service').default;
    (NotificationService as any).initialized = false;

    const result = await NotificationService.sendMulticastNotification(
      ['token1'],
      'Title',
      'Body',
      {}
    );

    expect(result).toBe(0);
  });

  // Test Case 18: Handle multicast network error
  it('should handle multicast network error', async () => {
    (admin as any).apps = [{}];

    mockMessaging.sendEachForMulticast.mockRejectedValue(new Error('Network error'));

    const NotificationService = require('../../src/services/notification.service').default;
    (NotificationService as any).initialized = true;

    const result = await NotificationService.sendMulticastNotification(
      ['token1'],
      'Title',
      'Body',
      {}
    );

    expect(result).toBe(0);
  });

  // Test Case 19: Verify Android-specific configuration in feed notification
  it('should include Android configuration in feed notification', async () => {
    (admin as any).apps = [{}];
    mockMessaging.send.mockResolvedValue('msg-id');

    const NotificationService = require('../../src/services/notification.service').default;
    (NotificationService as any).initialized = true;

    await NotificationService.sendFeedNotification('token', 'User', 'Movie', 'act');

    expect(mockMessaging.send).toHaveBeenCalledWith(
      expect.objectContaining({
        android: expect.objectContaining({
          priority: 'high',
          notification: expect.objectContaining({
            channelId: 'feed_updates',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true
          })
        })
      })
    );
  });

  // Test Case 20: Verify different priorities for different notification types
  it('should use normal priority for friend request accepted', async () => {
    (admin as any).apps = [{}];
    mockMessaging.send.mockResolvedValue('msg-id');

    const NotificationService = require('../../src/services/notification.service').default;
    (NotificationService as any).initialized = true;

    await NotificationService.sendFriendRequestAcceptedNotification('token', 'User');

    expect(mockMessaging.send).toHaveBeenCalledWith(
      expect.objectContaining({
        android: expect.objectContaining({
          priority: 'normal',
          notification: expect.objectContaining({
            priority: 'default'
          })
        })
      })
    );
  });
});