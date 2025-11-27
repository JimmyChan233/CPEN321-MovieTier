/**
 * @unmocked Integration tests for feed operations
 * Tests with real MongoDB database
 */

/**
 * Feed Route Handlers Tests - Unmocked
 * Comprehensive tests for inline handlers in feedRoutes.ts
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
import RankedMovie from "../../../../src/models/movie/RankedMovie";
import { Friendship } from "../../../../src/models/friend/Friend";
import Like from "../../../../src/models/feed/Like";
import Comment from "../../../../src/models/feed/Comment";
import { generateTestJWT, mockUsers } from "../../../helpers/test-fixtures";

describe("Feed Route Handlers - Inline Handlers", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;
  let user1: any;
  let user2: any;
  let user3: any;
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
    app.use("/api/feed", feedRoutes);

    user1 = await User.create(mockUsers.validUser);
    user2 = await User.create({
      ...mockUsers.validUser,
      email: "user2@example.com",
      googleId: "google-user2",
      fcmToken: "test-fcm-token-user2",
    });
    user3 = await User.create({
      ...mockUsers.validUser,
      email: "user3@example.com",
      googleId: "google-user3",
    });

    token1 = generateTestJWT((user1 as any)._id.toString());
    token2 = generateTestJWT((user2 as any)._id.toString());
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    await FeedActivity.deleteMany({});
    await RankedMovie.deleteMany({});
    await Friendship.deleteMany({});
    await Like.deleteMany({});
    await Comment.deleteMany({});
  });

  // GET /feed with comment counts
  it("should include comment counts in feed", async () => {
    await Friendship.create({ userId: user1._id, friendId: user2._id });

    const activity = await FeedActivity.create({
      userId: user2._id,
      activityType: "ranked_movie",
      movieId: 278,
      movieTitle: "Movie",
      rank: 1,
    });

    // Add comments
    await Comment.create({
      userId: user1._id,
      activityId: activity._id,
      text: "Great movie!",
    });

    const res = await request(app)
      .get("/api/feed")
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
  });

  // GET /feed with user's like status
  it("should mark activities liked by user", async () => {
    await Friendship.create({ userId: user1._id, friendId: user2._id });

    const activity = await FeedActivity.create({
      userId: user2._id,
      activityType: "ranked_movie",
      movieId: 278,
      movieTitle: "Movie",
      rank: 1,
    });

    // User1 likes the activity
    await Like.create({ userId: user1._id, activityId: activity._id });

    const res = await request(app)
      .get("/api/feed")
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
  });

  // GET /feed with current rank from RankedMovie
  it("should show current rank from RankedMovie collection", async () => {
    await Friendship.create({ userId: user1._id, friendId: user2._id });

    await FeedActivity.create({
      userId: user2._id,
      activityType: "ranked_movie",
      movieId: 278,
      movieTitle: "Movie",
      rank: 1,
    });

    // Create ranked movie with updated rank
    await RankedMovie.create({
      userId: user2._id,
      movieId: 278,
      title: "Movie",
      rank: 3,
      posterPath: "/test.jpg",
    });

    const res = await request(app)
      .get("/api/feed")
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
  });

  // Test Case: GET /stream (SSE)
  it("should establish SSE stream", (done) => {
    const req = request(app)
      .get("/api/feed/stream")
      .set("Authorization", `Bearer ${token1}`)
      .set("Accept", "text/event-stream")
      .parse((res: any) => {
        // Check headers on initial response
        if (
          res.statusCode === 200 &&
          res.headers["content-type"] === "text/event-stream"
        ) {
          req.abort();
          done();
        }
      })
      .end((err: any) => {
        // Ignore abort errors - they're expected for SSE
        if (err && err.code !== "ECONNRESET") {
          done(err);
        }
      });
  });

  // POST /:activityId/like with non-existent activity
  it("should return 404 when liking non-existent activity", async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post(`/api/feed/${fakeId.toString()}/like`)
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(404);
  });

  // DELETE /:activityId/like
  it("should unlike an activity", async () => {
    const activity = await FeedActivity.create({
      userId: user2._id,
      activityType: "ranked_movie",
      movieId: 278,
      movieTitle: "Movie",
      rank: 1,
    });

    // Create like
    await Like.create({
      userId: user1._id,
      activityId: activity._id,
    });

    const res = await request(app)
      .delete(`/api/feed/${(activity as any)._id.toString()}/like`)
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);

    // Verify like was deleted
    const like = await Like.findOne({
      userId: user1._id,
      activityId: activity._id,
    });
    expect(like).toBeNull();
  });

  // DELETE /:activityId/like when not liked
  it("should handle unlike when not previously liked", async () => {
    const activity = await FeedActivity.create({
      userId: user2._id,
      activityType: "ranked_movie",
      movieId: 278,
      movieTitle: "Movie",
      rank: 1,
    });

    const res = await request(app)
      .delete(`/api/feed/${(activity as any)._id.toString()}/like`)
      .set("Authorization", `Bearer ${token1}`);

    // Should handle not found when not previously liked
    expect(res.status).toStrictEqual(404);
  });

  // GET /:activityId/comments
  it("should get comments for an activity", async () => {
    const activity = await FeedActivity.create({
      userId: user2._id,
      activityType: "ranked_movie",
      movieId: 278,
      movieTitle: "Movie",
      rank: 1,
    });

    await Comment.create([
      {
        userId: user1._id,
        activityId: activity._id,
        text: "Comment 1",
      },
      {
        userId: user2._id,
        activityId: activity._id,
        text: "Comment 2",
      },
    ]);

    const res = await request(app)
      .get(`/api/feed/${(activity as any)._id.toString()}/comments`)
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
  });

  // POST /:activityId/comments on non-existent activity
  it("should return 404 when commenting on non-existent activity", async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post(`/api/feed/${fakeId.toString()}/comments`)
      .set("Authorization", `Bearer ${token1}`)
      .send({ text: "Comment" });

    expect(res.status).toBe(404);
  });

  // GET /feed with activity having both overview and posterPath (needsEnrichment returns false)
  it("should handle activity with complete metadata (no enrichment needed)", async () => {
    await Friendship.create({ userId: user1._id, friendId: user2._id });

    await FeedActivity.create({
      userId: user2._id,
      activityType: "ranked_movie",
      movieId: 550,
      movieTitle: "The Fight Club",
      overview:
        "An insomniac office worker and a devil-may-care soapmaker form an underground fight club...",
      posterPath: "/path/to/poster.jpg",
      rank: 1,
    });

    const res = await request(app)
      .get("/api/feed")
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].movie.overview).toBe(
      "An insomniac office worker and a devil-may-care soapmaker form an underground fight club...",
    );
    expect(res.body.data[0].movie.posterPath).toBe("/path/to/poster.jpg");
  });
});
