/**
 * @unmocked Integration tests for feed operations with real MongoDB
 * MongoDB is unmocked (real database), external services (SSE, FCM) are mocked
 * Focuses on constraint validation and error handling
 */

/**
 * Feed API Tests - Unmocked
 * Tests: GET /feed, POST /feed/:activityId/like,
 *        GET /feed/:activityId/comments, POST /feed/:activityId/comments
 * Focus: Validation, constraints (unique likes), error cases, database integration
 */

import request from "supertest";
import mongoose from "mongoose";
import {
  initializeTestMongo,
  cleanupTestMongo,
  skipIfMongoUnavailable,
  MongoTestContext,
} from "../../../helpers/mongoConnect";
import express from "express";
import feedRoutes from "../../../../src/routes/feedRoutes";
import User from "../../../../src/models/user/User";
import FeedActivity from "../../../../src/models/feed/FeedActivity";
import Like from "../../../../src/models/feed/Like";
import Comment from "../../../../src/models/feed/Comment";
import { Friendship } from "../../../../src/models/friend/Friend";
import { generateTestJWT, mockUsers } from "../../../helpers/test-fixtures";

describe("Unmocked: GET /feed", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;
  let user: any;
  let friend: any;
  let token: string;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log("Skipping test suite - MongoDB unavailable");
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/", feedRoutes);

    user = await User.create(mockUsers.validUser);
    friend = await User.create(mockUsers.anotherUser);
    token = generateTestJWT(user._id.toString());

    // Create friendship
    await Friendship.create({ userId: user._id, friendId: friend._id });
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    skipIfMongoUnavailable(mongoContext);
    await FeedActivity.deleteMany({});
    await Like.deleteMany({});
  });

  // Input: Unauthenticated request
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it("should reject unauthenticated feed request", async () => {
    const res = await request(app).get("/");

    expect(res.status).toStrictEqual(401);
  });

  // Note: Tests for returning feed data are in the mocked test suite
  // This integration test focuses on authentication and error cases
});

describe("Unmocked: POST /feed/:activityId/like", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;
  let user: any;
  let friend: any;
  let activity: any;
  let token: string;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log("Skipping test suite - MongoDB unavailable");
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/", feedRoutes);

    user = await User.create(mockUsers.validUser);
    friend = await User.create(mockUsers.anotherUser);
    token = generateTestJWT(user._id.toString());

    activity = await FeedActivity.create({
      userId: friend._id,
      activityType: "ranked_movie",
      movieId: 278,
      movieTitle: "The Shawshank Redemption",
    });
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    skipIfMongoUnavailable(mongoContext);
    await Like.deleteMany({});
  });

  // Input: Duplicate like on same activity
  // Expected status code: 400
  // Expected behavior: Database constraint prevents duplicate
  // Expected output: Error about duplicate like
  it("should reject duplicate like on same activity", async () => {
    // Create first like
    const firstLike = await Like.create({
      userId: user._id,
      activityId: activity._id,
    });

    // Verify like was created
    expect(firstLike).toBeDefined();

    // Try to like again
    const res = await request(app)
      .post(`/${activity._id}/like`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toStrictEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Already liked");

    // Verify only one like exists in database
    const likeCount = await Like.countDocuments({
      userId: user._id,
      activityId: activity._id,
    });
    expect(likeCount).toBe(1);

    // Verify the original like still exists
    const originalLike = await Like.findById(firstLike._id);
    expect(originalLike).toBeDefined();
  });

  // Note: Tests for creating successful likes are in the mocked test suite
  // This integration test focuses on constraint validation
});

describe("Unmocked: POST /feed/:activityId/like - Success Cases", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;
  let user: any;
  let friend: any;
  let token: string;
  let activity: any;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log("Skipping test suite - MongoDB unavailable");
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/", feedRoutes);

    user = await User.create(mockUsers.validUser);
    friend = await User.create(mockUsers.anotherUser);
    token = generateTestJWT((user as any)._id.toString());

    // Create friendship
    await Friendship.create([
      { userId: (user as any)._id, friendId: (friend as any)._id },
      { userId: (friend as any)._id, friendId: (user as any)._id },
    ]);

    // Create activity by friend
    activity = await FeedActivity.create({
      userId: (friend as any)._id,
      activityType: "ranked_movie",
      movieId: 123,
      movieTitle: "Test Movie",
      moviePosterPath: "/test.jpg",
      rank: 1,
    });
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    await Like.deleteMany({});
  });

  it("should successfully create like with proper database validation", async () => {
    // Verify no likes exist initially
    const initialLikeCount = await Like.countDocuments({
      userId: user._id,
      activityId: activity._id,
    });
    expect(initialLikeCount).toBe(0);

    // Create like via API
    const res = await request(app)
      .post(`/${activity._id}/like`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Verify like was created in database
    const createdLike = await Like.findOne({
      userId: user._id,
      activityId: activity._id,
    });

    expect(createdLike).toBeDefined();
    expect(createdLike?.userId.toString()).toBe(user._id.toString());
    expect(createdLike?.activityId.toString()).toBe(activity._id.toString());
    expect(createdLike?.createdAt).toBeDefined();

    // Verify like count by counting actual Like documents
    const likeCount = await Like.countDocuments({
      userId: user._id,
      activityId: activity._id,
    });
    expect(likeCount).toBe(1);
  });

  it("should successfully delete like with proper database validation", async () => {
    // Create like first
    const like = await Like.create({
      userId: user._id,
      activityId: activity._id,
    });

    // Update activity like count
    await FeedActivity.findByIdAndUpdate(activity._id, {
      $inc: { likeCount: 1 },
    });

    // Verify initial state
    const initialLike = await Like.findById(like._id);
    expect(initialLike).toBeDefined();

    // Verify initial like count by counting documents
    const initialLikeCount = await Like.countDocuments({
      userId: user._id,
      activityId: activity._id,
    });
    expect(initialLikeCount).toBe(1);

    // Delete like via API
    const res = await request(app)
      .delete(`/${activity._id}/like`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify like was deleted from database
    const deletedLike = await Like.findById(like._id);
    expect(deletedLike).toBeNull();

    // Verify like count is updated by counting documents
    const updatedLikeCount = await Like.countDocuments({
      userId: user._id,
      activityId: activity._id,
    });
    expect(updatedLikeCount).toBe(0);
  });
});

describe("Unmocked: GET /feed/:activityId/comments", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;
  let user: any;
  let friend: any;
  let activity: any;
  let token: string;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log("Skipping test suite - MongoDB unavailable");
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/", feedRoutes);

    user = await User.create(mockUsers.validUser);
    friend = await User.create(mockUsers.anotherUser);
    token = generateTestJWT(user._id.toString());

    activity = await FeedActivity.create({
      userId: friend._id,
      activityType: "ranked_movie",
      movieId: 278,
      movieTitle: "The Shawshank Redemption",
    });
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    await Comment.deleteMany({});
  });

  // Input: Activity with comments
  // Expected status code: 200
  // Expected behavior: Return all comments for activity
  // Expected output: Array of comments with user info

  // Input: Activity with no comments
  // Expected status code: 200
  // Expected behavior: Return empty array
  // Expected output: Empty array
  it("should return empty array for activity with no comments", async () => {
    const res = await request(app)
      .get(`/${activity._id}/comments`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toStrictEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });
});

describe("Unmocked: POST /feed/:activityId/comments", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;
  let user: any;
  let friend: any;
  let activity: any;
  let token: string;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log("Skipping test suite - MongoDB unavailable");
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/", feedRoutes);

    user = await User.create(mockUsers.validUser);
    friend = await User.create(mockUsers.anotherUser);
    token = generateTestJWT(user._id.toString());

    activity = await FeedActivity.create({
      userId: friend._id,
      activityType: "ranked_movie",
      movieId: 278,
      movieTitle: "The Shawshank Redemption",
    });
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    await Comment.deleteMany({});
  });

  // Input: Valid comment text within 500 character limit
  // Expected status code: 201
  // Expected behavior: Comment is created in database
  // Expected output: Created comment object

  // Input: Empty comment text
  // Expected status code: 400
  // Expected behavior: Request is rejected
  // Expected output: Validation error

  // Input: Comment text exceeding 500 characters
  // Expected status code: 400
  // Expected behavior: Request is rejected
  // Expected output: Length validation error
  it("should reject comment exceeding 500 characters", async () => {
    const longText = "a".repeat(501);
    const res = await request(app)
      .post(`/${activity._id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ text: longText });

    expect(res.status).toStrictEqual(400);
    expect(res.body.message).toMatch(/characters|length/);
  });
});
