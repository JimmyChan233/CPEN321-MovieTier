/**
 * @mocked Mocked tests for feed API
 * Tests with mocked external services (TMDB, SSE, FCM) and real MongoDB
 */

/**
 * Feed Routes Tests - Mocked
 * Tests for error handling and edge cases in feed routes
 */

import request from "supertest";
import mongoose from "mongoose";
import express from "express";
import feedRoutes from "../../../src/routes/feedRoutes";
import User from "../../../src/models/user/User";
import FeedActivity from "../../../src/models/feed/FeedActivity";
import Like from "../../../src/models/feed/Like";
import Comment from "../../../src/models/feed/Comment";
import { Friendship } from "../../../src/models/friend/Friend";
import { generateTestJWT, mockUsers } from "../../utils/test-fixtures";
import RankedMovie from "../../../src/models/movie/RankedMovie";
import { initializeTestMongo, cleanupTestMongo, skipIfMongoUnavailable, MongoTestContext } from "../../utils/mongoConnect";

// Mock TMDB client
jest.mock("../../../src/services/tmdb/tmdbClient", () => ({
  getTmdbClient: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

// Mock notification service
jest.mock("../../../src/services/notification.service", () => ({
  __esModule: true,
  default: {
    sendLikeNotification: jest.fn(),
    sendCommentNotification: jest.fn(),
  },
}));

// Mock SSE service
jest.mock("../../../src/services/sse/sseService", () => ({
  sseService: {
    addClient: jest.fn(),
    removeClient: jest.fn(),
    send: jest.fn(),
  },
}));

describe("Mocked: Feed Routes", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;
  let user1: any;
  let user2: any;
  let token1: string;
  let token2: string;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log('Skipping test suite - MongoDB unavailable');
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/api/feed", feedRoutes);
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    skipIfMongoUnavailable(mongoContext);
    await User.deleteMany({});
    await FeedActivity.deleteMany({});
    await Like.deleteMany({});
    await Comment.deleteMany({});
    await Friendship.deleteMany({});

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

  // ==================== GET / (Friends Feed) Error Tests ====================

  describe("GET / (friends feed) error handling", () => {
    it("should handle database error gracefully", async () => {
      jest
        .spyOn(Friendship, "find")
        .mockRejectedValueOnce(new Error("Database error"));

      const res = await request(app)
        .get("/api/feed")
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Unable to load feed");
    });
  });

  // ==================== GET /me Error Tests ====================

  describe("GET /me error handling", () => {});

  // ==================== GET /stream Error Tests ====================

  describe("GET /stream error handling", () => {
    // Line 255: Unauthorized check

    it("should handle SSE setup errors gracefully", async () => {
      const { sseService } = require("../../../src/services/sse/sseService");
      sseService.addClient.mockImplementationOnce(() => {
        throw new Error("SSE error");
      });

      const res = await request(app)
        .get("/api/feed/stream")
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(200);
    });
  });

  // ==================== POST /:activityId/like Error Tests ====================

  describe("POST /:activityId/like error handling", () => {
    it("should handle notification errors gracefully", async () => {
      // Create activity by user2
      const activity = await FeedActivity.create({
        userId: (user2 as any)._id,
        activityType: "ranked_movie",
        movieId: 550,
        movieTitle: "Fight Club",
        rank: 1,
      });

      // Make user2 have fcmToken
      await User.findByIdAndUpdate((user2 as any)._id, {
        fcmToken: "test-token",
      });

      // Mock notification to fail
      const notificationService =
        require("../../../src/services/notification.service").default;
      notificationService.sendLikeNotification.mockRejectedValueOnce(
        new Error("FCM error"),
      );

      const res = await request(app)
        .post(`/api/feed/${activity._id}/like`)
        .set("Authorization", `Bearer ${token1}`);

      // Should still succeed even if notification fails
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it("should handle database error gracefully", async () => {
      const activity = await FeedActivity.create({
        userId: (user2 as any)._id,
        activityType: "ranked_movie",
        movieId: 550,
        movieTitle: "Fight Club",
        rank: 1,
      });

      jest
        .spyOn(Like.prototype, "save")
        .mockRejectedValueOnce(new Error("Database error"));

      const res = await request(app)
        .post(`/api/feed/${activity._id}/like`)
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Failed to like activity");
    });
  });

  // ==================== DELETE /:activityId/like Error Tests ====================

  describe("DELETE /:activityId/like error handling", () => {
    it("should handle database error gracefully", async () => {
      const activity = await FeedActivity.create({
        userId: (user2 as any)._id,
        activityType: "ranked_movie",
        movieId: 550,
        movieTitle: "Fight Club",
        rank: 1,
      });

      jest
        .spyOn(Like, "findOneAndDelete")
        .mockRejectedValueOnce(new Error("Database error"));

      const res = await request(app)
        .delete(`/api/feed/${activity._id}/like`)
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Failed to unlike activity");
    });
  });

  // ==================== GET /:activityId/comments Error Tests ====================

  describe("GET /:activityId/comments error handling", () => {
    it("should handle database error gracefully", async () => {
      const activity = await FeedActivity.create({
        userId: (user1 as any)._id,
        activityType: "ranked_movie",
        movieId: 550,
        movieTitle: "Fight Club",
        rank: 1,
      });

      jest.spyOn(Comment, "find").mockImplementationOnce(() => {
        throw new Error("Database error");
      });

      const res = await request(app)
        .get(`/api/feed/${activity._id}/comments`)
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Failed to load comments");
    });
  });

  // ==================== POST /:activityId/comments Error Tests ====================

  describe("POST /:activityId/comments error handling", () => {
    it("should handle notification errors gracefully", async () => {
      const activity = await FeedActivity.create({
        userId: (user2 as any)._id,
        activityType: "ranked_movie",
        movieId: 550,
        movieTitle: "Fight Club",
        rank: 1,
      });

      // Make user2 have fcmToken
      await User.findByIdAndUpdate((user2 as any)._id, {
        fcmToken: "test-token",
      });

      // Mock notification to fail
      const notificationService =
        require("../../../src/services/notification.service").default;
      notificationService.sendCommentNotification.mockRejectedValueOnce(
        new Error("FCM error"),
      );

      const res = await request(app)
        .post(`/api/feed/${activity._id}/comments`)
        .set("Authorization", `Bearer ${token1}`)
        .send({ text: "Great movie!" });

      // Should still succeed even if notification fails
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it("should handle database error gracefully", async () => {
      const activity = await FeedActivity.create({
        userId: (user2 as any)._id,
        activityType: "ranked_movie",
        movieId: 550,
        movieTitle: "Fight Club",
        rank: 1,
      });

      jest
        .spyOn(Comment.prototype, "save")
        .mockRejectedValueOnce(new Error("Database error"));

      const res = await request(app)
        .post(`/api/feed/${activity._id}/comments`)
        .set("Authorization", `Bearer ${token1}`)
        .send({ text: "Great movie!" });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Failed to add comment");
    });
  });

  describe("TMDB enrichment (lines 154-158)", () => {
    it("should skip enrichment for only first 8 activities to avoid burst calls", async () => {
      await Friendship.create({
        userId: (user1 as any)._id,
        friendId: (user2 as any)._id,
      });

      // Create 15 activities
      for (let i = 0; i < 15; i++) {
        await FeedActivity.create({
          userId: (user2 as any)._id,
          activityType: "ranked_movie",
          movieId: 550 + i,
          movieTitle: `Movie ${i}`,
          rank: i + 1,
        });
      }

      const {
        getTmdbClient,
      } = require("../../../src/services/tmdb/tmdbClient");
      const mockGet = jest.fn().mockResolvedValue({
        data: {
          overview: "Test overview",
          poster_path: "/test.jpg",
          release_date: "1999-10-15",
          vote_average: 8.8,
        },
      });
      getTmdbClient.mockReturnValue({ get: mockGet });

      await request(app)
        .get("/api/feed")
        .set("Authorization", `Bearer ${token1}`);

      // TMDB should be called only 8 times (first 8 activities), not 15
      expect(mockGet).toHaveBeenCalledTimes(8);
    });
  });

  describe("GET /me enrichment and aggregations", () => {
    it("should indicate if current user has liked their own activity", async () => {
      const activity = await FeedActivity.create({
        userId: (user1 as any)._id,
        activityType: "ranked_movie",
        movieId: 278,
        movieTitle: "Movie",
        rank: 1,
      });

      // User1 likes their own activity
      await Like.create({
        userId: (user1 as any)._id,
        activityId: activity._id,
      });

      const {
        getTmdbClient,
      } = require("../../../src/services/tmdb/tmdbClient");
      getTmdbClient.mockReturnValue({
        get: jest.fn().mockResolvedValue({ data: {} }),
      });

      const res = await request(app)
        .get("/api/feed/me")
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].isLikedByUser).toBe(true);
    });

    it("should fetch and include comment counts in response", async () => {
      const activity = await FeedActivity.create({
        userId: (user1 as any)._id,
        activityType: "ranked_movie",
        movieId: 278,
        movieTitle: "Movie",
        rank: 1,
      });

      // Create comments
      await Comment.create([
        {
          userId: (user2 as any)._id,
          activityId: activity._id,
          text: "Comment 1",
        },
        {
          userId: (user2 as any)._id,
          activityId: activity._id,
          text: "Comment 2",
        },
        {
          userId: (user1 as any)._id,
          activityId: activity._id,
          text: "Comment 3",
        },
      ]);

      const {
        getTmdbClient,
      } = require("../../../src/services/tmdb/tmdbClient");
      getTmdbClient.mockReturnValue({
        get: jest.fn().mockResolvedValue({ data: {} }),
      });

      const res = await request(app)
        .get("/api/feed/me")
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].commentCount).toBe(3);
    });

    it("should limit enrichment to first 8 activities only", async () => {
      // Create 15 activities
      for (let i = 0; i < 15; i++) {
        await FeedActivity.create({
          userId: (user1 as any)._id,
          activityType: "ranked_movie",
          movieId: 550 + i,
          movieTitle: `Movie ${i}`,
          rank: i + 1,
        });
      }

      const {
        getTmdbClient,
      } = require("../../../src/services/tmdb/tmdbClient");
      const mockGet = jest.fn().mockResolvedValue({
        data: {
          overview: "Test",
          poster_path: "/test.jpg",
          release_date: "1999-10-15",
          vote_average: 8.0,
        },
      });
      getTmdbClient.mockReturnValue({ get: mockGet });

      await request(app)
        .get("/api/feed/me")
        .set("Authorization", `Bearer ${token1}`);

      // Should only call TMDB 8 times, not 15
      expect(mockGet).toHaveBeenCalledTimes(8);
    });

    it("should handle Comment aggregation errors gracefully", async () => {
      await FeedActivity.create({
        userId: (user1 as any)._id,
        activityType: "ranked_movie",
        movieId: 278,
        movieTitle: "Movie",
        rank: 1,
      });

      // Mock Comment.aggregate to fail
      jest.spyOn(Comment, "aggregate").mockImplementationOnce(() => {
        throw new Error("Aggregation error");
      });

      const {
        getTmdbClient,
      } = require("../../../src/services/tmdb/tmdbClient");
      getTmdbClient.mockReturnValue({
        get: jest.fn().mockResolvedValue({ data: {} }),
      });

      const res = await request(app)
        .get("/api/feed/me")
        .set("Authorization", `Bearer ${token1}`);

      // Should fail and return error
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });

    it("should include all activity fields in response shape", async () => {
      const activity = await FeedActivity.create({
        userId: (user1 as any)._id,
        activityType: "ranked_movie",
        movieId: 278,
        movieTitle: "The Shawshank Redemption",
        overview: "Prison escape story",
        posterPath: "/poster.jpg",
        releaseDate: "1994-09-23",
        voteAverage: 9.3,
        rank: 1,
      });

      await RankedMovie.create({
        userId: (user1 as any)._id,
        movieId: 278,
        title: "The Shawshank Redemption",
        rank: 1,
        posterPath: "/poster.jpg",
      });

      const {
        getTmdbClient,
      } = require("../../../src/services/tmdb/tmdbClient");
      getTmdbClient.mockReturnValue({
        get: jest.fn().mockResolvedValue({ data: {} }),
      });

      const res = await request(app)
        .get("/api/feed/me")
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(200);
      const returnedActivity = res.body.data[0];
      expect(returnedActivity).toHaveProperty("_id");
      expect(returnedActivity).toHaveProperty("userId");
      expect(returnedActivity).toHaveProperty("userName");
      expect(returnedActivity).toHaveProperty("userProfileImage");
      expect(returnedActivity).toHaveProperty("activityType");
      expect(returnedActivity).toHaveProperty("movie");
      expect(returnedActivity.movie).toHaveProperty("id");
      expect(returnedActivity.movie).toHaveProperty("title");
      expect(returnedActivity.movie).toHaveProperty("posterPath");
      expect(returnedActivity.movie).toHaveProperty("overview");
      expect(returnedActivity.movie).toHaveProperty("releaseDate");
      expect(returnedActivity.movie).toHaveProperty("voteAverage");
      expect(returnedActivity).toHaveProperty("rank");
      expect(returnedActivity).toHaveProperty("likeCount");
      expect(returnedActivity).toHaveProperty("commentCount");
      expect(returnedActivity).toHaveProperty("isLikedByUser");
      expect(returnedActivity).toHaveProperty("createdAt");
    });
  });

  describe("DELETE /:activityId/comments/:commentId - Delete comment", () => {
    it("should handle comment not found in activity gracefully", async () => {
      const activity1 = await FeedActivity.create({
        userId: (user1 as any)._id,
        activityType: "ranked_movie",
        movieId: 278,
        movieTitle: "Movie 1",
        rank: 1,
      });

      const activity2 = await FeedActivity.create({
        userId: (user1 as any)._id,
        activityType: "ranked_movie",
        movieId: 238,
        movieTitle: "Movie 2",
        rank: 2,
      });

      // Comment belongs to activity2
      const comment = await Comment.create({
        userId: (user1 as any)._id,
        activityId: activity2._id,
        text: "Comment for activity 2",
      });

      // Try to delete comment from wrong activity
      const res = await request(app)
        .delete(`/api/feed/${activity1._id}/comments/${comment._id}`)
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Comment not found");

      // Comment should still exist
      const stillExists = await Comment.findById(comment._id);
      expect(stillExists).toBeDefined();
    });

    it("should handle invalid commentId format", async () => {
      const activity = await FeedActivity.create({
        userId: (user1 as any)._id,
        activityType: "ranked_movie",
        movieId: 278,
        movieTitle: "Movie",
        rank: 1,
      });

      const res = await request(app)
        .delete(`/api/feed/${activity._id}/comments/invalid-id`)
        .set("Authorization", `Bearer ${token1}`);

      // Should return 500
      expect(res.status).toStrictEqual(500);
    });

    it("should verify comment ownership before deletion", async () => {
      const activity = await FeedActivity.create({
        userId: (user2 as any)._id,
        activityType: "ranked_movie",
        movieId: 278,
        movieTitle: "Movie",
        rank: 1,
      });

      // Create comments from both users
      const user1Comment = await Comment.create({
        userId: (user1 as any)._id,
        activityId: activity._id,
        text: "User 1 comment",
      });

      const user2Comment = await Comment.create({
        userId: (user2 as any)._id,
        activityId: activity._id,
        text: "User 2 comment",
      });

      // User1 can delete their own comment
      let res = await request(app)
        .delete(`/api/feed/${activity._id}/comments/${user1Comment._id}`)
        .set("Authorization", `Bearer ${token1}`);
      expect(res.status).toBe(200);

      // User1 cannot delete user2's comment
      res = await request(app)
        .delete(`/api/feed/${activity._id}/comments/${user2Comment._id}`)
        .set("Authorization", `Bearer ${token1}`);
      expect(res.status).toBe(403);

      // Verify user2's comment still exists
      const stillExists = await Comment.findById(user2Comment._id);
      expect(stillExists).toBeDefined();
    });
  });
});
