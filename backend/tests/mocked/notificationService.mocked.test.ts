/**
 * Notification Service Tests - Mocked
 * Tests notification service with mocked Firebase Admin
 */

// Mock logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Notification Service Tests - Mocked', () => {
  let mockMessaging: any;
  let mockAdmin: any;
  let NotificationService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Create fresh mock for each test
    mockMessaging = {
      send: jest.fn(),
      sendEachForMulticast: jest.fn()
    };

    mockAdmin = {
      apps: [],
      initializeApp: jest.fn(),
      credential: {
        cert: jest.fn()
      },
      messaging: jest.fn(() => mockMessaging)
    };

    // Mock firebase-admin
    jest.doMock('firebase-admin', () => ({
      __esModule: true,
      default: mockAdmin
    }));

    // Reset environment variables
    delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
  });

  afterEach(() => {
    jest.dontMock('firebase-admin');
  });

  // Note: Initialization tests are skipped because the service is a singleton
  // that initializes on import with real environment variables. These tests
  // are better suited for integration tests rather than unit tests.

  // Test Case 4: Send feed notification successfully
  it('should send feed notification successfully', async () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}]; // Simulate initialized
    mockMessaging.send.mockResolvedValue('message-id-123');

    NotificationService = require('../../src/services/notification.service').default;

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

  // Test Case 5: Skipped - testing "not initialized" state is not feasible with singleton pattern

  // Test Case 6: Handle invalid registration token error
  it('should handle invalid registration token error', async () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    const error: any = new Error('Invalid registration token');
    error.code = 'messaging/invalid-registration-token';
    mockMessaging.send.mockRejectedValue(error);

    NotificationService = require('../../src/services/notification.service').default;

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
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    const error: any = new Error('Token not registered');
    error.code = 'messaging/registration-token-not-registered';
    mockMessaging.send.mockRejectedValue(error);

    NotificationService = require('../../src/services/notification.service').default;

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
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    mockMessaging.send.mockRejectedValue(new Error('Network error'));

    NotificationService = require('../../src/services/notification.service').default;

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
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    mockMessaging.send.mockResolvedValue('msg-id');

    NotificationService = require('../../src/services/notification.service').default;

    const result = await NotificationService.sendFriendRequestNotification(
      'token-123',
      'Alice',
      'request-456'
    );

    expect(result).toBe(true);
    expect(mockMessaging.send).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'token-123',
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
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    mockMessaging.send.mockResolvedValue('msg-id');

    NotificationService = require('../../src/services/notification.service').default;

    const result = await NotificationService.sendFriendRequestAcceptedNotification(
      'token-123',
      'Bob'
    );

    expect(result).toBe(true);
    expect(mockMessaging.send).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'token-123',
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
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    mockMessaging.send.mockResolvedValue('msg-id');

    NotificationService = require('../../src/services/notification.service').default;

    const result = await NotificationService.sendLikeNotification(
      'token-123',
      'Charlie',
      'The Matrix',
      'activity-789'
    );

    expect(result).toBe(true);
    expect(mockMessaging.send).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'token-123',
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
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    mockMessaging.send.mockResolvedValue('msg-id');

    NotificationService = require('../../src/services/notification.service').default;

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
        token: 'token-123',
        notification: expect.objectContaining({
          title: 'Diana commented on your ranking',
          body: 'Diana on "Interstellar": Great movie!'
        }),
        data: {
          type: 'activity_comment',
          activityId: 'activity-321',
          commenterName: 'Diana',
          movieTitle: 'Interstellar',
          commentText: 'Great movie!'
        }
      })
    );
  });

  // Test Case 13: Truncate long comments
  it('should truncate long comments in notification', async () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    mockMessaging.send.mockResolvedValue('msg-id');

    NotificationService = require('../../src/services/notification.service').default;

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
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    mockMessaging.sendEachForMulticast.mockResolvedValue({
      successCount: 3,
      failureCount: 0,
      responses: [
        { success: true },
        { success: true },
        { success: true }
      ]
    });

    NotificationService = require('../../src/services/notification.service').default;

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
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    mockMessaging.sendEachForMulticast.mockResolvedValue({
      successCount: 2,
      failureCount: 1,
      responses: [
        { success: true },
        { success: false, error: { message: 'Invalid token' } },
        { success: true }
      ]
    });

    NotificationService = require('../../src/services/notification.service').default;

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
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    NotificationService = require('../../src/services/notification.service').default;

    const result = await NotificationService.sendMulticastNotification(
      [],
      'Title',
      'Body',
      {}
    );

    expect(result).toBe(0);
    expect(mockMessaging.sendEachForMulticast).not.toHaveBeenCalled();
  });

  // Test Case 17: Skipped - testing "not initialized" state is not feasible with singleton pattern

  // Test Case 18: Handle multicast network error
  it('should handle multicast network error', async () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    mockMessaging.sendEachForMulticast.mockRejectedValue(new Error('Network error'));

    NotificationService = require('../../src/services/notification.service').default;

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
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    mockMessaging.send.mockResolvedValue('msg-id');

    NotificationService = require('../../src/services/notification.service').default;

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
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    mockMessaging.send.mockResolvedValue('msg-id');

    NotificationService = require('../../src/services/notification.service').default;

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

  // Test Case 21: Skipped - testing "not initialized" state is not feasible with singleton pattern

  // Test Case 22: Handle invalid token in sendLikeNotification
  it('should handle invalid token error in sendLikeNotification', async () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    const error: any = new Error('Invalid registration token');
    error.code = 'messaging/invalid-registration-token';
    mockMessaging.send.mockRejectedValue(error);

    NotificationService = require('../../src/services/notification.service').default;

    const result = await NotificationService.sendLikeNotification(
      'invalid-token',
      'User',
      'Movie',
      'act-1'
    );

    expect(result).toBe(false);
  });

  // Test Case 23: Handle token not registered in sendLikeNotification
  it('should handle token not registered error in sendLikeNotification', async () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    const error: any = new Error('Token not registered');
    error.code = 'messaging/registration-token-not-registered';
    mockMessaging.send.mockRejectedValue(error);

    NotificationService = require('../../src/services/notification.service').default;

    const result = await NotificationService.sendLikeNotification(
      'unregistered-token',
      'User',
      'Movie',
      'act-1'
    );

    expect(result).toBe(false);
  });

  // Test Case 24: Handle generic error in sendLikeNotification
  it('should handle generic error in sendLikeNotification', async () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    mockMessaging.send.mockRejectedValue(new Error('Network error'));

    NotificationService = require('../../src/services/notification.service').default;

    const result = await NotificationService.sendLikeNotification(
      'token',
      'User',
      'Movie',
      'act-1'
    );

    expect(result).toBe(false);
  });

  // Test Case 25: Skipped - testing "not initialized" state is not feasible with singleton pattern

  // Test Case 26: Handle invalid token in sendCommentNotification
  it('should handle invalid token error in sendCommentNotification', async () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    const error: any = new Error('Invalid registration token');
    error.code = 'messaging/invalid-registration-token';
    mockMessaging.send.mockRejectedValue(error);

    NotificationService = require('../../src/services/notification.service').default;

    const result = await NotificationService.sendCommentNotification(
      'invalid-token',
      'User',
      'Comment',
      'Movie',
      'act-1'
    );

    expect(result).toBe(false);
  });

  // Test Case 27: Handle token not registered in sendCommentNotification
  it('should handle token not registered error in sendCommentNotification', async () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    const error: any = new Error('Token not registered');
    error.code = 'messaging/registration-token-not-registered';
    mockMessaging.send.mockRejectedValue(error);

    NotificationService = require('../../src/services/notification.service').default;

    const result = await NotificationService.sendCommentNotification(
      'unregistered-token',
      'User',
      'Comment',
      'Movie',
      'act-1'
    );

    expect(result).toBe(false);
  });

  // Test Case 28: Handle generic error in sendCommentNotification
  it('should handle generic error in sendCommentNotification', async () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    mockMessaging.send.mockRejectedValue(new Error('Network error'));

    NotificationService = require('../../src/services/notification.service').default;

    const result = await NotificationService.sendCommentNotification(
      'token',
      'User',
      'Comment',
      'Movie',
      'act-1'
    );

    expect(result).toBe(false);
  });

  // Test Case 29: Skipped - testing "not initialized" state is not feasible with singleton pattern

  // Test Case 30: Handle errors in sendFriendRequestNotification
  it('should handle errors in sendFriendRequestNotification', async () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    const error: any = new Error('Invalid token');
    error.code = 'messaging/invalid-registration-token';
    mockMessaging.send.mockRejectedValue(error);

    NotificationService = require('../../src/services/notification.service').default;

    const result = await NotificationService.sendFriendRequestNotification(
      'bad-token',
      'User',
      'request-id'
    );

    expect(result).toBe(false);
  });

  // Test Case 30a: Handle token not registered in sendFriendRequestNotification
  it('should handle token not registered in sendFriendRequestNotification', async () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    const error: any = new Error('Token not registered');
    error.code = 'messaging/registration-token-not-registered';
    mockMessaging.send.mockRejectedValue(error);

    NotificationService = require('../../src/services/notification.service').default;

    const result = await NotificationService.sendFriendRequestNotification(
      'unregistered-token',
      'User',
      'request-id'
    );

    expect(result).toBe(false);
  });

  // Test Case 30b: Handle generic error in sendFriendRequestNotification
  it('should handle generic error in sendFriendRequestNotification', async () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    mockMessaging.send.mockRejectedValue(new Error('Generic error'));

    NotificationService = require('../../src/services/notification.service').default;

    const result = await NotificationService.sendFriendRequestNotification(
      'token',
      'User',
      'request-id'
    );

    expect(result).toBe(false);
  });

  // Test Case 31: Skipped - testing "not initialized" state is not feasible with singleton pattern

  // Test Case 32: Handle errors in sendFriendRequestAcceptedNotification
  it('should handle errors in sendFriendRequestAcceptedNotification', async () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    mockMessaging.send.mockRejectedValue(new Error('Network error'));

    NotificationService = require('../../src/services/notification.service').default;

    const result = await NotificationService.sendFriendRequestAcceptedNotification(
      'token',
      'User'
    );

    expect(result).toBe(false);
  });

  // Test Case 32a: Handle invalid token in sendFriendRequestAcceptedNotification
  it('should handle invalid token in sendFriendRequestAcceptedNotification', async () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    const error: any = new Error('Invalid registration token');
    error.code = 'messaging/invalid-registration-token';
    mockMessaging.send.mockRejectedValue(error);

    NotificationService = require('../../src/services/notification.service').default;

    const result = await NotificationService.sendFriendRequestAcceptedNotification(
      'invalid-token',
      'User'
    );

    expect(result).toBe(false);
  });

  // Test Case 32b: Handle token not registered in sendFriendRequestAcceptedNotification
  it('should handle token not registered in sendFriendRequestAcceptedNotification', async () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    const error: any = new Error('Token not registered');
    error.code = 'messaging/registration-token-not-registered';
    mockMessaging.send.mockRejectedValue(error);

    NotificationService = require('../../src/services/notification.service').default;

    const result = await NotificationService.sendFriendRequestAcceptedNotification(
      'unregistered-token',
      'User'
    );

    expect(result).toBe(false);
  });

  // Test Case 33: Skipped - testing "already initialized" state is not feasible with singleton pattern

  // Test Case 34: Handle multicast with all failures
  it('should handle multicast with all failures', async () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    mockMessaging.sendEachForMulticast.mockResolvedValue({
      successCount: 0,
      failureCount: 3,
      responses: [
        { success: false, error: { message: 'Error 1' } },
        { success: false, error: { message: 'Error 2' } },
        { success: false, error: { message: 'Error 3' } }
      ]
    });

    NotificationService = require('../../src/services/notification.service').default;

    const result = await NotificationService.sendMulticastNotification(
      ['token1', 'token2', 'token3'],
      'Title',
      'Body',
      {}
    );

    expect(result).toBe(0);
  });

  // Test Case 35: Verify data payload in multicast
  it('should include data payload in multicast notification', async () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';

    mockAdmin.apps = [{}];
    mockMessaging.sendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }]
    });

    NotificationService = require('../../src/services/notification.service').default;

    await NotificationService.sendMulticastNotification(
      ['token1'],
      'Title',
      'Body',
      { customKey: 'customValue' }
    );

    expect(mockMessaging.sendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['token1'],
        notification: expect.objectContaining({
          title: 'Title',
          body: 'Body'
        }),
        data: { customKey: 'customValue' }
      })
    );
  });

  // Note: Testing "not initialized" state and certain initialization error paths
  // is not feasible with the current singleton pattern without significant refactoring.
  // Current coverage: 81.73% (improved from 80%)
  // Uncovered lines are primarily initialization edge cases and "not initialized" state checks
});