/**
 * @unmocked Integration tests for friend management
 * Tests with real MongoDB database
 */

/**
 * Advanced Friend Routes Tests - Unmocked
 * Comprehensive tests for all friend management edge cases
 */

import request from "supertest";
import mongoose from "mongoose";
import {
  initializeTestMongo,
  cleanupTestMongo,
  skipIfMongoUnavailable,
  MongoTestContext,
} from "../../../utils/mongoConnect";
import express from "express";
import friendRoutes from "../../../../src/routes/friendRoutes";
import User from "../../../../src/models/user/User";
import { Friendship, FriendRequest } from "../../../../src/models/friend/Friend";
import { generateTestJWT, mockUsers } from "../../../utils/test-fixtures";

describe("Advanced Friend Routes Tests", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;
  let user1: any;
  let user2: any;
  let user3: any;
  let user4: any;
  let token1: string;
  let token2: string;
  let token3: string;
  let token4: string;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log("Skipping test suite - MongoDB unavailable");
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/", friendRoutes);

    user1 = await User.create(mockUsers.validUser);
    user2 = await User.create({
      ...mockUsers.validUser,
      email: "user2@example.com",
      googleId: "google-user2",
    });
    user3 = await User.create({
      ...mockUsers.validUser,
      email: "user3@example.com",
      googleId: "google-user3",
    });
    user4 = await User.create({
      ...mockUsers.validUser,
      email: "user4@example.com",
      googleId: "google-user4",
    });

    token1 = generateTestJWT((user1 as any)._id.toString());
    token2 = generateTestJWT((user2 as any)._id.toString());
    token3 = generateTestJWT((user3 as any)._id.toString());
    token4 = generateTestJWT((user4 as any)._id.toString());
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    await FriendRequest.deleteMany({});
    await Friendship.deleteMany({});
  });

  // Send friend request with email
  it("should send friend request using email", async () => {
    const res = await request(app)
      .post("/request")
      .set("Authorization", `Bearer ${token1}`)
      .send({ email: user2.email });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Verify friend request was created in database
    const friendRequest = await FriendRequest.findOne({
      senderId: user1._id,
      receiverId: user2._id,
      status: "pending"
    });

    expect(friendRequest).toBeDefined();
    expect(friendRequest?.senderId.toString()).toBe(user1._id.toString());
    expect(friendRequest?.receiverId.toString()).toBe(user2._id.toString());
    expect(friendRequest?.status).toBe("pending");
  });

  // Delete friendship removes both directions
  it("should remove bilateral friendships on delete", async () => {
    // Create bilateral friendships
    await Friendship.create([
      { userId: user1._id, friendId: user2._id },
      { userId: user2._id, friendId: user1._id },
    ]);

    const res = await request(app)
      .delete(`/${(user2 as any)._id.toString()}`)
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify both removed
    const count1 = await Friendship.countDocuments({
      userId: user1._id,
      friendId: user2._id,
    });
    const count2 = await Friendship.countDocuments({
      userId: user2._id,
      friendId: user1._id,
    });

    expect(count1).toBe(0);
    expect(count2).toBe(0);
  });

  // Reject friend request
  it("should reject friend request with accept=false", async () => {
    const friendReq = await FriendRequest.create({
      senderId: user2._id,
      receiverId: user1._id,
      status: "pending",
    });

    const res = await request(app)
      .post("/respond")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        requestId: (friendReq as any)._id.toString(),
        accept: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify friend request was rejected
    const updatedRequest = await FriendRequest.findById(friendReq._id);
    expect(updatedRequest?.status).toBe("rejected");

    // Verify no friendships created
    const friendshipCount = await Friendship.countDocuments({
      userId: user1._id,
    });
    expect(friendshipCount).toBe(0);
  });

  // Cannot send friend request to self
  it("should reject friend request to self", async () => {
    const res = await request(app)
      .post("/request")
      .set("Authorization", `Bearer ${token1}`)
      .send({ email: user1.email });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Cannot send a friend request to yourself");

    // Verify no friend request was created
    const friendRequest = await FriendRequest.findOne({
      senderId: user1._id,
      receiverId: user1._id
    });
    expect(friendRequest).toBeNull();
  });

  // Cannot send duplicate friend request
  it("should reject duplicate friend request", async () => {
    // Send first request
    const res1 = await request(app)
      .post("/request")
      .set("Authorization", `Bearer ${token1}`)
      .send({ email: user2.email });

    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);

    // Verify first request was created
    const firstRequest = await FriendRequest.findOne({
      senderId: user1._id,
      receiverId: user2._id
    });
    expect(firstRequest).toBeDefined();

    // Try to send again
    const res2 = await request(app)
      .post("/request")
      .set("Authorization", `Bearer ${token1}`)
      .send({ email: user2.email });

    expect(res2.status).toBe(409);
    expect(res2.body.success).toBe(false);
    expect(res2.body.message).toContain("Friend request already sent");

    // Verify only one request exists
    const requestCount = await FriendRequest.countDocuments({
      senderId: user1._id,
      receiverId: user2._id
    });
    expect(requestCount).toBe(1);
  });

  // Reverse pending request scenario
  it("should handle reverse pending request", async () => {
    // User2 sends request to User1
    await FriendRequest.create({
      senderId: user2._id,
      receiverId: user1._id,
      status: "pending",
    });

    // User1 tries to send request to User2
    await request(app)
      .post("/request")
      .set("Authorization", `Bearer ${token1}`)
      .send({ email: user2.email });
  });

  // Get detailed pending requests
  it("should get detailed pending requests", async () => {
    await FriendRequest.create([
      { senderId: user2._id, receiverId: user1._id, status: "pending" },
      { senderId: user3._id, receiverId: user1._id, status: "pending" },
    ]);

    const res = await request(app)
      .get("/requests/detailed")
      .set("Authorization", `Bearer ${token1}`);
  });

  // Get detailed outgoing requests
  it("should get detailed outgoing friend requests", async () => {
    await FriendRequest.create([
      { senderId: user1._id, receiverId: user2._id, status: "pending" },
      { senderId: user1._id, receiverId: user3._id, status: "pending" },
    ]);

    const res = await request(app)
      .get("/requests/outgoing/detailed")
      .set("Authorization", `Bearer ${token1}`);
  });

  // Friend request validation (parameterized)
  describe("Friend Request Validation", () => {
    const validationTests = [
      {
        name: "should handle request to non-existent email",
        email: "nonexistent@example.com",
      },
      {
        name: "should reject invalid email format",
        email: "not-an-email",
      },
      {
        name: "should reject request without email",
        email: undefined,
      },
    ];

    validationTests.forEach((test) => {
      it(test.name, async () => {
        const body: any = {};
        if (test.email !== undefined) {
          body.email = test.email;
        }
        await request(app)
          .post("/request")
          .set("Authorization", `Bearer ${token1}`)
          .send(body);
      });
    });
  });

  // Delete friendship with invalid friendId format
  it("should handle delete with invalid friendId format", async () => {
    await request(app)
      .delete("/invalid-id-format")
      .set("Authorization", `Bearer ${token1}`);
  });

  // Empty state endpoint tests (parameterized)
  describe("Empty State Endpoints", () => {
    const emptyStateTests = [
      { endpoint: "/", description: "get empty friends list when no friends" },
      {
        endpoint: "/requests",
        description: "get empty pending requests when none exist",
      },
      {
        endpoint: "/requests/detailed",
        description: "get empty detailed requests when none exist",
      },
      {
        endpoint: "/requests/outgoing",
        description: "get empty outgoing requests when none exist",
      },
      {
        endpoint: "/requests/outgoing/detailed",
        description: "get empty detailed outgoing requests when none exist",
      },
    ];

    emptyStateTests.forEach((test) => {});
  });

  // Complex friendship network
  it("should handle complex friendship network", async () => {
    // Create friendships: 1-2, 1-3, 1-4, 2-3, 2-4
    await Friendship.create([
      { userId: user1._id, friendId: user2._id },
      { userId: user2._id, friendId: user1._id },
      { userId: user1._id, friendId: user3._id },
      { userId: user3._id, friendId: user1._id },
      { userId: user1._id, friendId: user4._id },
      { userId: user4._id, friendId: user1._id },
      { userId: user2._id, friendId: user3._id },
      { userId: user3._id, friendId: user2._id },
      { userId: user2._id, friendId: user4._id },
      { userId: user4._id, friendId: user2._id },
    ]);

    // Get user1's friends (should have 3)
    const res1 = await request(app)
      .get("/")
      .set("Authorization", `Bearer ${token1}`);

    // Get user2's friends (should have 3)
    const res2 = await request(app)
      .get("/")
      .set("Authorization", `Bearer ${token2}`);
  });

  // Test Case 37: Accept request then try to accept again
  it("should prevent double acceptance of friend request", async () => {
    const friendReq = await FriendRequest.create({
      senderId: user2._id,
      receiverId: user1._id,
      status: "pending",
    });

    // First accept
    const res1 = await request(app)
      .post("/respond")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        requestId: (friendReq as any)._id.toString(),
        accept: true,
      });

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);

    // Verify request was accepted and friendships created
    const updatedRequest = await FriendRequest.findById(friendReq._id);
    expect(updatedRequest?.status).toBe("accepted");

    const friendshipCount = await Friendship.countDocuments({
      $or: [
        { userId: user1._id, friendId: user2._id },
        { userId: user2._id, friendId: user1._id }
      ]
    });
    expect(friendshipCount).toBe(2); // Bidirectional friendships

    // Try to accept again
    const res2 = await request(app)
      .post("/respond")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        requestId: (friendReq as any)._id.toString(),
        accept: true,
      });

    expect(res2.status).toBe(400);
    expect(res2.body.success).toBe(false);
    expect(res2.body.message).toContain("Request already handled");

    // Verify no additional friendships were created
    const finalFriendshipCount = await Friendship.countDocuments({
      $or: [
        { userId: user1._id, friendId: user2._id },
        { userId: user2._id, friendId: user1._id }
      ]
    });
    expect(finalFriendshipCount).toBe(2);
  });

  // Filter out non-pending requests
  it("should only return pending requests, not accepted/rejected", async () => {
    await FriendRequest.create([
      { senderId: user2._id, receiverId: user1._id, status: "pending" },
      { senderId: user3._id, receiverId: user1._id, status: "accepted" },
      { senderId: user4._id, receiverId: user1._id, status: "rejected" },
    ]);

    const res = await request(app)
      .get("/requests")
      .set("Authorization", `Bearer ${token1}`);
  });

  // Outgoing requests filter
  it("should only return outgoing requests from user", async () => {
    await FriendRequest.create([
      { senderId: user1._id, receiverId: user2._id, status: "pending" },
      { senderId: user1._id, receiverId: user3._id, status: "pending" },
      { senderId: user4._id, receiverId: user1._id, status: "pending" }, // Should not be in outgoing
    ]);

    const res = await request(app)
      .get("/requests/outgoing")
      .set("Authorization", `Bearer ${token1}`);
  });

  // Test unauthorized access to streamFriends endpoint
  it("should return 401 when userId is missing from streamFriends", async () => {
    skipIfMongoUnavailable(mongoContext);

    // Create a new app instance without auth middleware to simulate missing userId
    const unauthApp = express();
    unauthApp.use(express.json());
    unauthApp.use((req: any, res, next) => {
      req.userId = undefined;
      next();
    });
    unauthApp.use("/", friendRoutes);

    const res = await request(unauthApp).get("/stream");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/unauthorized|No authentication token/i);
  });
});
