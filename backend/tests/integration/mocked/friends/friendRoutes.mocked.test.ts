/**
 * @mocked Mocked tests for friend management API
 * Tests with mocked external services (TMDB, SSE, FCM) and real MongoDB
 */

/**
 * Friend Routes Tests - Mocked
 * Tests for error handling and edge cases in friend routes
 */

import request from "supertest";
import mongoose from "mongoose";
import express from "express";
import friendRoutes from "../../../../src/routes/friendRoutes";
import User from "../../../../src/models/user/User";
import { Friendship, FriendRequest } from "../../../../src/models/friend/Friend";
import { generateTestJWT, mockUsers } from "../../../utils/test-fixtures";
import {
  initializeTestMongo,
  cleanupTestMongo,
  skipIfMongoUnavailable,
  MongoTestContext,
} from "../../../utils/mongoConnect";

import { sseService } from "../../../../src/services/sse/sseService";

// Mock notification service
jest.mock("../../../../src/services/notification.service", () => ({
  __esModule: true,
  default: {
    sendFriendRequestNotification: jest.fn(),
    sendFriendAcceptNotification: jest.fn(),
    sendFriendRequestAcceptedNotification: jest.fn(),
  },
}));

describe("Mocked: Friend Routes", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;
  let user1: any;
  let user2: any;
  let token1: string;
  let token2: string;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log("Skipping test suite - MongoDB unavailable");
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/api/friends", friendRoutes);
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    skipIfMongoUnavailable(mongoContext);
    await User.deleteMany({});
    await Friendship.deleteMany({});
    await FriendRequest.deleteMany({});

    user1 = await User.create(mockUsers.validUser);
    user2 = await User.create({
      ...mockUsers.validUser,
      email: "user2@example.com",
      googleId: "google-456",
    });

    token1 = generateTestJWT((user1 as any)._id.toString());
    token2 = generateTestJWT((user2 as any)._id.toString());

    jest.clearAllMocks();
  });

  // ==================== GET / (Friends List) Error Tests ====================

  describe("GET / (friends list) error handling", () => {
    it("should handle database error gracefully", async () => {
      jest.spyOn(Friendship, "find").mockImplementationOnce(() => {
        throw new Error("Database error");
      });

      const res = await request(app)
        .get("/api/friends")
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Failed to get friends");
    });
  });

  // ==================== DELETE /requests/:requestId (Cancel Request) Tests ====================

  describe("DELETE /requests/:requestId (cancel friend request)", () => {
    it("should successfully cancel a pending outgoing friend request", async () => {
      // Create a pending request from user1 to user2
      const friendRequest = await FriendRequest.create({
        senderId: (user1 as any)._id,
        receiverId: (user2 as any)._id,
        status: "pending",
      });

      const res = await request(app)
        .delete(`/api/friends/requests/${(friendRequest as any)._id}`)
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/canceled/i);

      // Verify the request status was changed to rejected
      const updatedRequest = await FriendRequest.findById(
        (friendRequest as any)._id,
      );
      expect(updatedRequest?.status).toBe("rejected");
    });

    it("should return 404 when canceling non-existent friend request", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/api/friends/requests/${fakeId}`)
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });

    it("should return 403 when user tries to cancel someone elses request", async () => {
      // user2 sends request to user1
      const friendRequest = await FriendRequest.create({
        senderId: (user2 as any)._id,
        receiverId: (user1 as any)._id,
        status: "pending",
      });

      // user1 tries to cancel user2's request (not authorized)
      const res = await request(app)
        .delete(`/api/friends/requests/${(friendRequest as any)._id}`)
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Not authorized/i);
    });

    it("should return 400 when trying to cancel non-pending request", async () => {
      // Create an already accepted request
      const friendRequest = await FriendRequest.create({
        senderId: (user1 as any)._id,
        receiverId: (user2 as any)._id,
        status: "accepted",
      });

      const res = await request(app)
        .delete(`/api/friends/requests/${(friendRequest as any)._id}`)
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not pending/i);
    });

    it("should handle findById error when canceling request", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      // Mock findById to throw error
      jest
        .spyOn(FriendRequest, "findById")
        .mockRejectedValueOnce(new Error("Database error"));

      const res = await request(app)
        .delete(`/api/friends/requests/${fakeId}`)
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Failed to cancel/i);
    });
  });

  // ==================== DELETE /:friendId - Missing friendId Test ====================

  describe("DELETE /:friendId missing parameter", () => {});

  // ==================== GET /stream SSE Authorization Test ====================

  describe("GET /stream SSE authorization and error handling", () => {
    it("should handle errors in SSE setup and call res.end()", async () => {
      jest.spyOn(sseService, "addClient").mockImplementationOnce(() => {
        throw new Error("SSE error");
      });

      const res = await request(app)
        .get("/api/friends/stream")
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(200);
    });

    it("should trigger close handler when SSE connection is terminated", async () => {
      const { EventEmitter } = require("events");
      const removeClientSpy = jest.spyOn(sseService, "removeClient");

      // Capture the request object when addClient is called
      let capturedReq: any = null;
      jest.spyOn(sseService, "addClient").mockImplementation((userId, res) => {
        // The request object is available in the current scope when addClient is called
        // We'll capture it through a different method
      });

      // We need to spy on the request's 'on' method to capture the close handler
      let closeHandler: Function | null = null;
      const originalOn = EventEmitter.prototype.on;
      const onSpy = jest
        .spyOn(EventEmitter.prototype, "on")
        .mockImplementation(function (
          this: any,
          event: string,
          handler: Function,
        ) {
          if (event === "close" && this.userId) {
            // This is our SSE request's close handler
            closeHandler = handler;
          }
          return originalOn.call(this, event, handler);
        });

      // Make the request to trigger the route handler
      const agent = request(app)
        .get("/api/friends/stream")
        .set("Authorization", `Bearer ${token1}`)
        .buffer(false) // Don't buffer the response
        .parse(() => {}) // Custom parser that does nothing
        .end(() => {});

      // Wait for the handler to set up
      await new Promise((resolve) => setTimeout(resolve, 100));

      // The close handler should have been registered
      expect(closeHandler).toBeTruthy();

      // Trigger the close handler if it was captured
      if (closeHandler) {
        (closeHandler as Function)();

        // Verify removeClient was called
        expect(removeClientSpy).toHaveBeenCalled();
      }

      // Cleanup
      onSpy.mockRestore();
      jest.restoreAllMocks();
    });
  });

  // ==================== GET /requests Error Tests ====================

  describe("GET /requests error handling", () => {
    it("should handle database error gracefully", async () => {
      jest.spyOn(FriendRequest, "find").mockImplementationOnce(() => {
        throw new Error("Database error");
      });

      const res = await request(app)
        .get("/api/friends/requests")
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Failed to get requests");
    });
  });

  // ==================== GET /requests/detailed Error Tests ====================

  describe("GET /requests/detailed error handling", () => {
    it("should handle database error gracefully", async () => {
      jest.spyOn(FriendRequest, "find").mockImplementationOnce(() => {
        throw new Error("Database error");
      });

      const res = await request(app)
        .get("/api/friends/requests/detailed")
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Failed to get requests");
    });
  });

  // ==================== GET /requests/outgoing Error Tests ====================

  describe("GET /requests/outgoing error handling", () => {
    it("should handle database error gracefully", async () => {
      jest.spyOn(FriendRequest, "find").mockImplementationOnce(() => {
        throw new Error("Database error");
      });

      const res = await request(app)
        .get("/api/friends/requests/outgoing")
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Failed to get outgoing requests");
    });
  });

  // ==================== GET /requests/outgoing/detailed Error Tests ====================

  describe("GET /requests/outgoing/detailed error handling", () => {
    it("should handle database error gracefully", async () => {
      jest.spyOn(FriendRequest, "find").mockImplementationOnce(() => {
        throw new Error("Database error");
      });

      const res = await request(app)
        .get("/api/friends/requests/outgoing/detailed")
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Failed to get outgoing requests");
    });
  });

  // ==================== POST /request Error Tests ====================

  describe("POST /request error handling", () => {
    it("should return 401 when authenticated user not found in database", async () => {
      // Delete user1 after authentication to simulate deleted user
      await User.findByIdAndDelete((user1 as any)._id);

      const res = await request(app)
        .post("/api/friends/request")
        .set("Authorization", `Bearer ${token1}`)
        .send({ email: "user2@example.com" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Unauthorized");
    });

    it("should reject request when already friends with user", async () => {
      // Create a friendship between user1 and user2
      await Friendship.create({
        userId: (user1 as any)._id,
        friendId: (user2 as any)._id,
      });

      const res = await request(app)
        .post("/api/friends/request")
        .set("Authorization", `Bearer ${token1}`)
        .send({ email: "user2@example.com" });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Already friends");
    });
  });

  // ==================== POST /respond Error Tests ====================

  describe("POST /respond error handling", () => {
    it("should handle database error when creating friendships", async () => {
      // Create a friend request
      const friendRequest = await FriendRequest.create({
        senderId: (user1 as any)._id,
        receiverId: (user2 as any)._id,
        status: "pending",
      });

      // Mock database error during friendship creation
      jest
        .spyOn(Friendship.prototype, "save")
        .mockRejectedValueOnce(new Error("Database error"));

      const res = await request(app)
        .post("/api/friends/respond")
        .set("Authorization", `Bearer ${token2}`)
        .send({
          requestId: (friendRequest as any)._id.toString(),
          accept: true,
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Failed to respond to request");
    });
  });

  // ==================== DELETE /:friendId Error Tests ====================

  describe("DELETE /:friendId error handling", () => {
    it("should handle database error gracefully", async () => {
      // Create friendship first
      await Friendship.create([
        { userId: (user1 as any)._id, friendId: (user2 as any)._id },
        { userId: (user2 as any)._id, friendId: (user1 as any)._id },
      ]);

      // Mock database error
      jest
        .spyOn(Friendship, "deleteMany")
        .mockRejectedValueOnce(new Error("Database error"));

      const res = await request(app)
        .delete(`/api/friends/${(user2 as any)._id}`)
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Failed to remove friend");
    });

    it("should return 404 when friendship not found", async () => {
      const res = await request(app)
        .delete(`/api/friends/${(user2 as any)._id}`)
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Friendship not found");
    });

    it("should reject when user tries to remove themselves", async () => {
      const res = await request(app)
        .delete(`/api/friends/${(user1 as any)._id}`)
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Cannot remove yourself");
    });
    // ==================== DELETE /:friendId Validation Tests ====================

    describe("DELETE /:friendId parameter validation", () => {});
  });

  // ==================== Additional Edge Cases ====================

  describe("Additional edge cases", () => {
    it("should handle missing requestId field in respond request", async () => {
      const res = await request(app)
        .post("/api/friends/respond")
        .set("Authorization", `Bearer ${token2}`)
        .send({
          accept: true,
          // missing requestId
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject friend request when user not found", async () => {
      const res = await request(app)
        .post("/api/friends/request")
        .set("Authorization", `Bearer ${token1}`)
        .send({ email: "nonexistent@example.com" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("User not found");
    });

    it("should reject responding to non-existent friend request", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post("/api/friends/respond")
        .set("Authorization", `Bearer ${token2}`)
        .send({
          requestId: fakeId.toString(),
          accept: true,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Friend request not found");
    });

    it("should reject responding to request not directed to user", async () => {
      const user3 = await User.create({
        ...mockUsers.validUser,
        email: "user3@example.com",
        googleId: "google-789",
      });

      const friendRequest = await FriendRequest.create({
        senderId: (user1 as any)._id,
        receiverId: (user3 as any)._id,
        status: "pending",
      });

      const res = await request(app)
        .post("/api/friends/respond")
        .set("Authorization", `Bearer ${token2}`)
        .send({
          requestId: (friendRequest as any)._id.toString(),
          accept: true,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Not authorized");
    });
  });
  // Update the existing test in "POST /request error handling" section
  it("should handle notification service failure gracefully and still create request", async () => {
    // Set fcmToken on user2 so the notification code path is triggered
    await User.findByIdAndUpdate((user2 as any)._id, {
      fcmToken: "valid-fcm-token",
    });

    const notificationService =
      require("../../../../src/services/notification.service").default;
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    // Mock the notification to throw an error
    jest
      .spyOn(notificationService, "sendFriendRequestNotification")
      .mockRejectedValueOnce(new Error("FCM service unavailable"));

    const res = await request(app)
      .post("/api/friends/request")
      .set("Authorization", `Bearer ${token1}`)
      .send({ email: "user2@example.com" });

    // Should still succeed even if notification fails (201 = Created)
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Verify the error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to send FCM friend request notification:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  // Add this NEW test in "POST /respond error handling" section
  it("should handle FCM notification failure when accepting friend request", async () => {
    // Set fcmToken on user1 (sender) so notification code path is triggered
    await User.findByIdAndUpdate((user1 as any)._id, {
      fcmToken: "valid-fcm-token",
    });

    const friendRequest = await FriendRequest.create({
      senderId: (user1 as any)._id,
      receiverId: (user2 as any)._id,
      status: "pending",
    });

    const notificationService =
      require("../../../../src/services/notification.service").default;
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    // Mock the correct method name
    jest
      .spyOn(notificationService, "sendFriendRequestAcceptedNotification")
      .mockRejectedValueOnce(new Error("FCM delivery failed"));

    const res = await request(app)
      .post("/api/friends/respond")
      .set("Authorization", `Bearer ${token2}`)
      .send({
        requestId: (friendRequest as any)._id.toString(),
        accept: true,
      });

    // Should still succeed even if notification fails
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify the error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to send FCM friend request accepted notification:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});
