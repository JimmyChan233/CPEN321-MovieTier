/**
 * @unmocked Integration tests for movie operations
 * Tests with real MongoDB database
 */

/**
 * Movie Comparison Controller Complete Tests - Unmocked
 * Exhaustive tests covering ALL code paths in movieComparisionController.ts
 */

import request from "supertest";
import mongoose from "mongoose";
import express from "express";
import movieRoutes from "../../../src/routes/movieRoutes";
import User from "../../../src/models/user/User";
import RankedMovie from "../../../src/models/movie/RankedMovie";
import WatchlistItem from "../../../src/models/watch/WatchlistItem";
import FeedActivity from "../../../src/models/feed/FeedActivity";
import { Friendship } from "../../../src/models/friend/Friend";
import {
  generateTestJWT,
  mockUsers,
  mockMovies,
} from "../../utils/test-fixtures";
import { initializeTestMongo, cleanupTestMongo, skipIfMongoUnavailable, MongoTestContext } from "../../utils/mongoConnect";

describe("Movie Comparison Controller - Complete Coverage", () => {
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
    app.use("/", movieRoutes);

    user1 = await User.create(mockUsers.validUser);
    user2 = await User.create({
      ...mockUsers.validUser,
      email: "user2@example.com",
      googleId: "google-user2",
      fcmToken: "test-fcm-token",
    });

    token1 = generateTestJWT((user1 as any)._id.toString());
    token2 = generateTestJWT((user2 as any)._id.toString());
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    await RankedMovie.deleteMany({});
    await WatchlistItem.deleteMany({});
    await FeedActivity.deleteMany({});
    await Friendship.deleteMany({});

    // Clear any active comparison sessions
    const { endSession } = await import("../../../src/utils/comparisonSession");
    endSession((user1 as any)._id.toString());
    endSession((user2 as any)._id.toString());
  });

  // ========== addMovie: Case 1 - First Movie ==========

  it("should add first movie with rank 1 and create feed activity", async () => {
    const res = await request(app)
      .post("/add")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        movieId: 100,
        title: "Inception",
        posterPath: "/inception.jpg",
        overview: "A thief in a world of dreams",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe("added");
    expect(res.body.data.rank).toBe(1);

    // Verify RankedMovie was created in DB
    const ranked = await RankedMovie.findOne({
      userId: user1._id,
      movieId: 100,
    });
    expect(ranked).toBeDefined();
    expect(ranked!.rank).toBe(1);
    expect(ranked!.title).toBe("Inception");

    // Verify feed activity was created
    const activity = await FeedActivity.findOne({
      userId: user1._id,
      movieId: 100,
    });
    expect(activity).toBeDefined();
    expect(activity!.activityType).toBe("ranked_movie");
    expect(activity!.rank).toBe(1);

    // Verify removed from watchlist
    const watchlist = await WatchlistItem.findOne({
      userId: user1._id,
      movieId: 100,
    });
    expect(watchlist).toBeNull();
  });

  // ========== addMovie: Case 2 - Duplicate Movie ==========

  it("should reject duplicate movie with 400 status", async () => {
    // First, add a movie
    await RankedMovie.create({
      userId: user1._id,
      movieId: 200,
      title: "The Dark Knight",
      posterPath: "/dark-knight.jpg",
      rank: 1,
    });

    // Try to add the same movie again
    const res = await request(app)
      .post("/add")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        movieId: 200,
        title: "The Dark Knight",
        posterPath: "/dark-knight.jpg",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Movie already ranked");

    // Verify still only 1 ranked movie
    const count = await RankedMovie.countDocuments({ userId: user1._id });
    expect(count).toBe(1);
  });

  // ========== addMovie: Case 3 - Begin Comparison ==========

  it("should start comparison session when adding second movie", async () => {
    // Add first movie
    await RankedMovie.create({
      userId: user1._id,
      movieId: 300,
      title: "Interstellar",
      posterPath: "/interstellar.jpg",
      rank: 1,
    });

    // Add second movie - should start comparison
    const res = await request(app)
      .post("/add")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        movieId: 400,
        title: "The Matrix",
        posterPath: "/matrix.jpg",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe("compare");
    expect(res.body.data.compareWith).toBeDefined();
    expect(res.body.data.compareWith.movieId).toBe(300);
    expect(res.body.data.compareWith.title).toBe("Interstellar");

    // Verify session is active (no RankedMovie created yet, waiting for comparison)
    const newMovie = await RankedMovie.findOne({
      userId: user1._id,
      movieId: 400,
    });
    expect(newMovie).toBeNull(); // Not added until comparison completes

    // Verify removed from watchlist
    const watchlist = await WatchlistItem.findOne({
      userId: user1._id,
      movieId: 400,
    });
    expect(watchlist).toBeNull();
  });

  // ========== compareMovies: No Active Session ==========

  it("should reject comparison without active session", async () => {
    const res = await request(app)
      .post("/compare")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        preferredMovieId: 500,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("No active comparison session");
  });

  // ========== compareMovies: Prefer New Movie (high = middleIndex - 1) ==========

  it("should continue comparison when preferring new movie", async () => {
    // Setup: Create 3 ranked movies
    await RankedMovie.create({
      userId: user1._id,
      movieId: 1000,
      title: "Movie 1",
      posterPath: "/1.jpg",
      rank: 1,
    });
    await RankedMovie.create({
      userId: user1._id,
      movieId: 2000,
      title: "Movie 2",
      posterPath: "/2.jpg",
      rank: 2,
    });
    await RankedMovie.create({
      userId: user1._id,
      movieId: 3000,
      title: "Movie 3",
      posterPath: "/3.jpg",
      rank: 3,
    });

    // Add new movie to start comparison
    const addRes = await request(app)
      .post("/add")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        movieId: 5000,
        title: "New Movie",
        posterPath: "/new.jpg",
      });

    expect(addRes.status).toBe(200);

    // User prefers the new movie (should narrow high)
    const compareRes = await request(app)
      .post("/compare")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        preferredMovieId: 5000, // Prefer new movie
      });

    expect(compareRes.status).toBe(200);
    expect(compareRes.body.success).toBe(true);
    expect(compareRes.body.status).toBe("compare");
    // Should continue with next comparison
    expect(compareRes.body.data.compareWith).toBeDefined();
  });

  // ========== compareMovies: Prefer Existing Movie (low = middleIndex + 1) ==========

  it("should continue comparison when preferring existing movie", async () => {
    // Setup: Create 3 ranked movies
    await RankedMovie.create({
      userId: user1._id,
      movieId: 4000,
      title: "Movie A",
      posterPath: "/a.jpg",
      rank: 1,
    });
    await RankedMovie.create({
      userId: user1._id,
      movieId: 5000,
      title: "Movie B",
      posterPath: "/b.jpg",
      rank: 2,
    });
    await RankedMovie.create({
      userId: user1._id,
      movieId: 6000,
      title: "Movie C",
      posterPath: "/c.jpg",
      rank: 3,
    });

    // Add new movie to start comparison
    const addRes = await request(app)
      .post("/add")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        movieId: 7000,
        title: "New Movie B",
        posterPath: "/newb.jpg",
      });

    expect(addRes.status).toBe(200);

    // User prefers an existing movie (should narrow low)
    const compareRes = await request(app)
      .post("/compare")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        preferredMovieId: 4000, // Prefer existing movie
      });

    expect(compareRes.status).toBe(200);
    expect(compareRes.body.success).toBe(true);
  });

  // ========== compareMovies: Continue Comparison ==========

  it("should return continue status when session still active", async () => {
    // Setup: Create 4 ranked movies to allow multiple comparisons
    await RankedMovie.create({
      userId: user1._id,
      movieId: 11000,
      title: "Movie 1",
      posterPath: "/1.jpg",
      rank: 1,
    });
    await RankedMovie.create({
      userId: user1._id,
      movieId: 12000,
      title: "Movie 2",
      posterPath: "/2.jpg",
      rank: 2,
    });
    await RankedMovie.create({
      userId: user1._id,
      movieId: 13000,
      title: "Movie 3",
      posterPath: "/3.jpg",
      rank: 3,
    });
    await RankedMovie.create({
      userId: user1._id,
      movieId: 14000,
      title: "Movie 4",
      posterPath: "/4.jpg",
      rank: 4,
    });

    // Add new movie
    const addRes = await request(app)
      .post("/add")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        movieId: 15000,
        title: "New Movie",
        posterPath: "/new.jpg",
      });

    expect(addRes.status).toBe(200);

    // First comparison
    const compare1 = await request(app)
      .post("/compare")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        preferredMovieId: 15000,
      });

    expect(compare1.status).toBe(200);
    expect(compare1.body.success).toBe(true);
    expect(compare1.body.status).toBe("compare");
    expect(compare1.body.data.compareWith).toBeDefined();

    // Session should still be active - no RankedMovie created yet
    const stillPending = await RankedMovie.findOne({
      userId: user1._id,
      movieId: 15000,
    });
    expect(stillPending).toBeNull();
  });

  // ========== Error Handling ==========

  it("should handle movieComparisionController addMovie when user has no name property", async () => {
    // Mock User.findById to return a user document without name
    jest.spyOn(User, "findById").mockImplementationOnce(function (this: any) {
      return {
        select: jest.fn().mockResolvedValueOnce({
          _id: user1._id,
          // name is undefined
        }),
      } as any;
    });

    // Mock Friendship.find to return empty
    jest.spyOn(Friendship, "find").mockResolvedValueOnce([]);

    const res = await request(app)
      .post("/add")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        movieId: 100,
        title: "Test Movie",
        posterPath: "/poster.jpg",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    jest.restoreAllMocks();
  });

  it("should handle NODE_ENV being explicitly set to staging", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "staging";

    jest.resetModules();
    const config = require("../../../src/config").default;

    expect(config.nodeEnv).toBe("staging");

    if (originalEnv) {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("should handle error in compareMovies", async () => {
    await RankedMovie.create({
      userId: user1._id,
      movieId: 100001,
      title: "Movie 1",
      rank: 1,
      posterPath: "/1.jpg",
    });

    await request(app)
      .post("/add")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        movieId: 200000,
        title: "New Movie",
        posterPath: "/new.jpg",
      });

    // Close connection to force error
    await mongoose.connection.close();

    const res = await request(app)
      .post("/compare")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        preferredMovieId: 100001,
      });

    expect(res.status).toBe(500);

    // Reconnect
    await mongoose.connect(mongoContext.mongoUri);
  });
});
