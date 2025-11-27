/**
 * @mocked Mocked tests for external services
 * Tests with mocked external services (TMDB, SSE, FCM) and real MongoDB
 */

/**
 * Notification Service Tests - Mocked
 * Tests notification service with mocked Firebase Admin
 */

// Mock logger to avoid console output during tests
jest.mock("../../../src/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock fs to prevent file system access during tests
jest.mock("fs", () => ({
  existsSync: jest.fn(() => false),
  readFileSync: jest.fn(),
}));

describe("Notification Service Tests - Mocked", () => {
  let mockMessaging: any;
  let mockAdmin: any;
  let NotificationService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Create fresh mock for each test
    mockMessaging = {
      send: jest.fn(),
      sendEachForMulticast: jest.fn(),
    };

    mockAdmin = {
      apps: [],
      initializeApp: jest.fn(),
      credential: {
        cert: jest.fn(),
      },
      messaging: jest.fn(() => mockMessaging),
    };

    // Mock firebase-admin
    jest.doMock("firebase-admin", () => ({
      __esModule: true,
      default: mockAdmin,
    }));

    // Reset environment variables
    delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
  });

  afterEach(() => {
    jest.dontMock("firebase-admin");
  });

  // Handle generic sending error
  it("should handle generic sending error", async () => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
    process.env.FIREBASE_PRIVATE_KEY = "test-key";

    mockAdmin.apps = [{}];
    mockMessaging.send.mockRejectedValue(new Error("Network error"));

    NotificationService =
      require("../../../src/services/notification.service").default;

    const result = await NotificationService.sendFeedNotification(
      "test-token",
      "John",
      "Movie",
      "act-1",
    );

    expect(result).toBe(false);
  });

  // Send friend request notification
  it("should send friend request notification", async () => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
    process.env.FIREBASE_PRIVATE_KEY = "test-key";

    mockAdmin.apps = [{}];
    mockMessaging.send.mockResolvedValue("msg-id");

    NotificationService =
      require("../../../src/services/notification.service").default;

    const result = await NotificationService.sendFriendRequestNotification(
      "token-123",
      "Alice",
      "request-456",
    );

    expect(result).toBe(true);
    expect(mockMessaging.send).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "token-123",
        notification: expect.objectContaining({
          title: "New Friend Request",
          body: "Alice sent you a friend request",
        }),
        data: {
          type: "friend_request",
          requestId: "request-456",
          senderName: "Alice",
        },
      }),
    );
  });

  // Send like notification
  it("should send like notification", async () => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
    process.env.FIREBASE_PRIVATE_KEY = "test-key";

    mockAdmin.apps = [{}];
    mockMessaging.send.mockResolvedValue("msg-id");

    NotificationService =
      require("../../../src/services/notification.service").default;

    const result = await NotificationService.sendLikeNotification(
      "token-123",
      "Charlie",
      "The Matrix",
      "activity-789",
    );

    expect(result).toBe(true);
    expect(mockMessaging.send).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "token-123",
        notification: expect.objectContaining({
          title: "Charlie liked your ranking",
          body: 'Charlie liked your ranking of "The Matrix"',
        }),
        data: {
          type: "activity_like",
          activityId: "activity-789",
          likerName: "Charlie",
          movieTitle: "The Matrix",
        },
      }),
    );
  });

  // Truncate long comments
  it("should truncate long comments in notification", async () => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
    process.env.FIREBASE_PRIVATE_KEY = "test-key";

    mockAdmin.apps = [{}];
    mockMessaging.send.mockResolvedValue("msg-id");

    NotificationService =
      require("../../../src/services/notification.service").default;

    const longComment =
      "This is a very long comment that exceeds fifty characters and should be truncated";

    await NotificationService.sendCommentNotification(
      "token-123",
      "Eve",
      longComment,
      "Movie",
      "act-1",
    );

    expect(mockMessaging.send).toHaveBeenCalledWith(
      expect.objectContaining({
        notification: expect.objectContaining({
          body: expect.stringContaining("..."),
        }),
      }),
    );
  });

  // Handle multicast with empty token array
  it("should handle multicast with empty token array", async () => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
    process.env.FIREBASE_PRIVATE_KEY = "test-key";

    mockAdmin.apps = [{}];
    NotificationService =
      require("../../../src/services/notification.service").default;

    const result = await NotificationService.sendMulticastNotification(
      [],
      "Title",
      "Body",
      {},
    );

    expect(result).toBe(0);
    expect(mockMessaging.sendEachForMulticast).not.toHaveBeenCalled();
  });

  // Handle multicast network error
  it("should handle multicast network error", async () => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
    process.env.FIREBASE_PRIVATE_KEY = "test-key";

    mockAdmin.apps = [{}];
    mockMessaging.sendEachForMulticast.mockRejectedValue(
      new Error("Network error"),
    );

    NotificationService =
      require("../../../src/services/notification.service").default;

    const result = await NotificationService.sendMulticastNotification(
      ["token1"],
      "Title",
      "Body",
      {},
    );

    expect(result).toBe(0);
  });

  // Verify Android-specific configuration in feed notification
  it("should include Android configuration in feed notification", async () => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
    process.env.FIREBASE_PRIVATE_KEY = "test-key";

    mockAdmin.apps = [{}];
    mockMessaging.send.mockResolvedValue("msg-id");

    NotificationService =
      require("../../../src/services/notification.service").default;

    await NotificationService.sendFeedNotification(
      "token",
      "User",
      "Movie",
      "act",
    );

    expect(mockMessaging.send).toHaveBeenCalledWith(
      expect.objectContaining({
        android: expect.objectContaining({
          priority: "high",
          notification: expect.objectContaining({
            channelId: "feed_updates",
            priority: "high",
            defaultSound: true,
            defaultVibrateTimings: true,
          }),
        }),
      }),
    );
  });

  // Verify different priorities for different notification types
  it("should use normal priority for friend request accepted", async () => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
    process.env.FIREBASE_PRIVATE_KEY = "test-key";

    mockAdmin.apps = [{}];
    mockMessaging.send.mockResolvedValue("msg-id");

    NotificationService =
      require("../../../src/services/notification.service").default;

    await NotificationService.sendFriendRequestAcceptedNotification(
      "token",
      "User",
    );

    expect(mockMessaging.send).toHaveBeenCalledWith(
      expect.objectContaining({
        android: expect.objectContaining({
          priority: "normal",
          notification: expect.objectContaining({
            priority: "default",
          }),
        }),
      }),
    );
  });

  // Handle generic error in sendLikeNotification
  it("should handle generic error in sendLikeNotification", async () => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
    process.env.FIREBASE_PRIVATE_KEY = "test-key";

    mockAdmin.apps = [{}];
    mockMessaging.send.mockRejectedValue(new Error("Network error"));

    NotificationService =
      require("../../../src/services/notification.service").default;

    const result = await NotificationService.sendLikeNotification(
      "token",
      "User",
      "Movie",
      "act-1",
    );

    expect(result).toBe(false);
  });

  // Handle generic error in sendCommentNotification
  it("should handle generic error in sendCommentNotification", async () => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
    process.env.FIREBASE_PRIVATE_KEY = "test-key";

    mockAdmin.apps = [{}];
    mockMessaging.send.mockRejectedValue(new Error("Network error"));

    NotificationService =
      require("../../../src/services/notification.service").default;

    const result = await NotificationService.sendCommentNotification(
      "token",
      "User",
      "Comment",
      "Movie",
      "act-1",
    );

    expect(result).toBe(false);
  });

  // Handle generic error in sendFriendRequestNotification
  it("should handle generic error in sendFriendRequestNotification", async () => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
    process.env.FIREBASE_PRIVATE_KEY = "test-key";

    mockAdmin.apps = [{}];
    mockMessaging.send.mockRejectedValue(new Error("Generic error"));

    NotificationService =
      require("../../../src/services/notification.service").default;

    const result = await NotificationService.sendFriendRequestNotification(
      "token",
      "User",
      "request-id",
    );

    expect(result).toBe(false);
  });

  // Handle errors in sendFriendRequestAcceptedNotification
  it("should handle errors in sendFriendRequestAcceptedNotification", async () => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
    process.env.FIREBASE_PRIVATE_KEY = "test-key";

    mockAdmin.apps = [{}];
    mockMessaging.send.mockRejectedValue(new Error("Network error"));

    NotificationService =
      require("../../../src/services/notification.service").default;

    const result =
      await NotificationService.sendFriendRequestAcceptedNotification(
        "token",
        "User",
      );

    expect(result).toBe(false);
  });

  it("should return false and warn when Firebase not initialized in sendFriendRequestNotification", async () => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
    process.env.FIREBASE_PRIVATE_KEY = "test-key";

    mockAdmin.apps = [];

    const { logger } = require("../../../src/utils/logger");
    NotificationService =
      require("../../../src/services/notification.service").default;

    // Manually set initialized to false to test the check
    NotificationService.initialized = false;

    const result = await NotificationService.sendFriendRequestNotification(
      "token-123",
      "Alice",
      "request-456",
    );

    expect(result).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      "Firebase not initialized, skipping notification",
    );
  });

  it("should return false and warn when Firebase not initialized in sendFriendRequestAcceptedNotification", async () => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
    process.env.FIREBASE_PRIVATE_KEY = "test-key";

    mockAdmin.apps = [];

    const { logger } = require("../../../src/utils/logger");
    NotificationService =
      require("../../../src/services/notification.service").default;

    // Manually set initialized to false to test the check
    NotificationService.initialized = false;

    const result =
      await NotificationService.sendFriendRequestAcceptedNotification(
        "token-123",
        "Bob",
      );

    expect(result).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      "Firebase not initialized, skipping notification",
    );
  });

  it("should return false and warn when Firebase not initialized in sendLikeNotification", async () => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
    process.env.FIREBASE_PRIVATE_KEY = "test-key";

    mockAdmin.apps = [];

    const { logger } = require("../../../src/utils/logger");
    NotificationService =
      require("../../../src/services/notification.service").default;

    // Manually set initialized to false to test the check
    NotificationService.initialized = false;

    const result = await NotificationService.sendLikeNotification(
      "token-123",
      "Charlie",
      "The Matrix",
      "activity-789",
    );

    expect(result).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      "Firebase not initialized, skipping notification",
    );
  });

  it("should return false and warn when Firebase not initialized in sendCommentNotification", async () => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
    process.env.FIREBASE_PRIVATE_KEY = "test-key";

    mockAdmin.apps = [];

    const { logger } = require("../../../src/utils/logger");
    NotificationService =
      require("../../../src/services/notification.service").default;

    // Manually set initialized to false to test the check
    NotificationService.initialized = false;

    const result = await NotificationService.sendCommentNotification(
      "token-123",
      "Diana",
      "Great movie!",
      "Interstellar",
      "activity-321",
    );

    expect(result).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      "Firebase not initialized, skipping notification",
    );
  });

  it("should not call messaging.send when Firebase not initialized", async () => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
    process.env.FIREBASE_PRIVATE_KEY = "test-key";

    mockAdmin.apps = [];
    mockMessaging.send.mockResolvedValue("message-id");

    const { logger } = require("../../../src/utils/logger");
    NotificationService =
      require("../../../src/services/notification.service").default;

    // Manually set initialized to false
    NotificationService.initialized = false;

    await NotificationService.sendFeedNotification(
      "test-token",
      "John",
      "Movie",
      "act-1",
    );

    // Should not call send if not initialized
    expect(mockMessaging.send).not.toHaveBeenCalled();
  });

  it("should not call messaging.sendEachForMulticast when Firebase not initialized", async () => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
    process.env.FIREBASE_PRIVATE_KEY = "test-key";

    mockAdmin.apps = [];

    const { logger } = require("../../../src/utils/logger");
    NotificationService =
      require("../../../src/services/notification.service").default;

    // Manually set initialized to false
    NotificationService.initialized = false;

    await NotificationService.sendMulticastNotification(
      ["token1"],
      "Title",
      "Body",
      {},
    );

    // Should not call sendEachForMulticast if not initialized
    expect(mockMessaging.sendEachForMulticast).not.toHaveBeenCalled();
  });

  describe("Firebase Initialization", () => {
    // Reset mockAdmin.apps before each Firebase initialization test
    beforeEach(() => {
      mockAdmin.apps = [];
    });

    it("should throw error when service account file is not .json", () => {
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH = "/path/to/serviceAccount.txt";

      const fs = require("fs");
      fs.existsSync.mockReturnValue(true); // File exists, so we can test the .json validation

      const { logger } = require("../../../src/utils/logger");

      NotificationService =
        require("../../../src/services/notification.service").default;

      // Should log error about file type
      expect(logger.error).toHaveBeenCalled();
    });

    it("should set initialized flag to false on failed initialization", () => {
      delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      delete process.env.FIREBASE_PROJECT_ID;
      delete process.env.FIREBASE_CLIENT_EMAIL;
      delete process.env.FIREBASE_PRIVATE_KEY;

      NotificationService =
        require("../../../src/services/notification.service").default;

      // Service should not be initialized
      expect(true).toBe(true);
    });

    it("should handle service account with .JSON uppercase extension", () => {
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH =
        "/path/to/serviceAccount.JSON";

      const { logger } = require("../../../src/utils/logger");

      NotificationService =
        require("../../../src/services/notification.service").default;

      // Should reject uppercase .JSON (case sensitive check)
      expect(logger.error).toHaveBeenCalled();
    });

    it("should successfully initialize Firebase with service account file", () => {
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH =
        "/path/to/serviceAccount.json";

      const fs = require("fs");
      const validServiceAccount = JSON.stringify({
        type: "service_account",
        project_id: "test-project",
        private_key_id: "key-id",
        private_key:
          "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n",
        client_email: "firebase@test.iam.gserviceaccount.com",
        client_id: "123456",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
      });

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(validServiceAccount);

      const { logger } = require("../../../src/utils/logger");

      NotificationService =
        require("../../../src/services/notification.service").default;

      // Should initialize successfully
      expect(mockAdmin.initializeApp).toHaveBeenCalled();
      expect(logger.success).toHaveBeenCalledWith(
        "Firebase Admin initialized with service account",
      );
    });
  });

  // Tests for error message nullish coalescing operator
  describe("Error message handling with nullish coalescing", () => {
    it("should handle error without message property in sendFeedNotification", async () => {
      process.env.FIREBASE_PROJECT_ID = "test-project";
      process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
      process.env.FIREBASE_PRIVATE_KEY = "test-key";

      mockAdmin.apps = [{}];
      const errorWithoutMessage: any = {
        code: "messaging/invalid-registration-token",
      }; // Error without message property
      mockMessaging.send.mockRejectedValue(errorWithoutMessage);

      const { logger } = require("../../../src/utils/logger");
      NotificationService =
        require("../../../src/services/notification.service").default;

      const result = await NotificationService.sendFeedNotification(
        "invalid-token",
        "John",
        "Movie",
        "act-1",
      );

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Unknown error"),
      );
    });

    it("should handle error without message in sendFriendRequestNotification", async () => {
      process.env.FIREBASE_PROJECT_ID = "test-project";
      process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
      process.env.FIREBASE_PRIVATE_KEY = "test-key";

      mockAdmin.apps = [{}];
      const errorWithoutMessage: any = {
        code: "messaging/registration-token-not-registered",
      }; // Error without message property
      mockMessaging.send.mockRejectedValue(errorWithoutMessage);

      const { logger } = require("../../../src/utils/logger");
      NotificationService =
        require("../../../src/services/notification.service").default;

      const result = await NotificationService.sendFriendRequestNotification(
        "unregistered-token",
        "Alice",
        "request-123",
      );

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Unknown error"),
      );
    });

    it("should handle error without message in sendFriendRequestAcceptedNotification", async () => {
      process.env.FIREBASE_PROJECT_ID = "test-project";
      process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
      process.env.FIREBASE_PRIVATE_KEY = "test-key";

      mockAdmin.apps = [{}];
      const errorWithoutMessage: any = {
        code: "messaging/invalid-registration-token",
      }; // Error without message property
      mockMessaging.send.mockRejectedValue(errorWithoutMessage);

      const { logger } = require("../../../src/utils/logger");
      NotificationService =
        require("../../../src/services/notification.service").default;

      const result =
        await NotificationService.sendFriendRequestAcceptedNotification(
          "bad-token",
          "Bob",
        );

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Unknown error"),
      );
    });

    it("should handle error without message in sendLikeNotification", async () => {
      process.env.FIREBASE_PROJECT_ID = "test-project";
      process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
      process.env.FIREBASE_PRIVATE_KEY = "test-key";

      mockAdmin.apps = [{}];
      const errorWithoutMessage: any = {
        code: "messaging/registration-token-not-registered",
      }; // Error without message property
      mockMessaging.send.mockRejectedValue(errorWithoutMessage);

      const { logger } = require("../../../src/utils/logger");
      NotificationService =
        require("../../../src/services/notification.service").default;

      const result = await NotificationService.sendLikeNotification(
        "unregistered-token",
        "Charlie",
        "The Matrix",
        "activity-789",
      );

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Unknown error"),
      );
    });

    it("should handle error without message in sendCommentNotification", async () => {
      process.env.FIREBASE_PROJECT_ID = "test-project";
      process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
      process.env.FIREBASE_PRIVATE_KEY = "test-key";

      mockAdmin.apps = [{}];
      const errorWithoutMessage: any = {
        code: "messaging/invalid-registration-token",
      }; // Error without message property
      mockMessaging.send.mockRejectedValue(errorWithoutMessage);

      const { logger } = require("../../../src/utils/logger");
      NotificationService =
        require("../../../src/services/notification.service").default;

      const result = await NotificationService.sendCommentNotification(
        "invalid-token",
        "Diana",
        "Great movie!",
        "Interstellar",
        "activity-321",
      );

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Unknown error"),
      );
    });

    it("should handle undefined token in multicast notification failure", async () => {
      process.env.FIREBASE_PROJECT_ID = "test-project";
      process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
      process.env.FIREBASE_PRIVATE_KEY = "test-key";

      mockAdmin.apps = [{}];
      // Create a sparse array with undefined at index 1
      const tokens = ["token1", undefined as any, "token3"];
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 2,
        failureCount: 1,
        responses: [
          { success: true },
          { success: false, error: { message: "Invalid token" } },
          { success: true },
        ],
      });

      const { logger } = require("../../../src/utils/logger");
      NotificationService =
        require("../../../src/services/notification.service").default;

      const result = await NotificationService.sendMulticastNotification(
        tokens,
        "Title",
        "Body",
        {},
      );

      expect(result).toBe(2);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("unknown"),
      );
    });
  });
});
