/**
 * @mocked API tests for movie edge cases with mocked TMDB
 * Tests TMDB response fallbacks, null handling, and enrichment logic
 */

import request from "supertest";
import mongoose from "mongoose";
import express, { Express } from "express";
import movieRoutes from "../../../../src/routes/movieRoutes";
import watchlistRoutes from "../../../../src/routes/watchlistRoutes";
import feedRoutes from "../../../../src/routes/feedRoutes";
import { authenticate } from "../../../../src/middleware/auth";
import User from "../../../../src/models/user/User";
import WatchlistItem from "../../../../src/models/watch/WatchlistItem";
import FeedActivity from "../../../../src/models/feed/FeedActivity";
import { generateTestJWT } from "../../../utils/test-fixtures";
import { initializeTestMongo, cleanupTestMongo, skipIfMongoUnavailable, MongoTestContext } from "../../../utils/mongoConnect";

const mockTmdbGet = jest.fn();
jest.mock("../../../../src/services/tmdb/tmdbClient", () => ({
  getTmdbClient: () => ({
    get: mockTmdbGet,
  }),
}));

describe("Movie Routes - TMDB Field Fallbacks", () => {
  let mongoContext: MongoTestContext;
  let app: Express;
  let token: string;
  let user: any;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log('Skipping test suite - MongoDB unavailable');
      return;
    }

    app = express();
    app.use(express.json());
    app.use(authenticate);
    app.use("/api/movies", movieRoutes);

    user = await User.create({
      email: "test@example.com",
      name: "Test User",
      googleId: "google-123",
    });

    token = generateTestJWT(String(user._id));
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should handle videos list with non-YouTube videos", async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        results: [
          { key: "abc123", site: "Vimeo" }, // Non-YouTube, should be filtered
          { key: "xyz789", site: "YouTube" },
        ],
      },
    });

    const res = await request(app)
      .get("/api/movies/1/videos")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it("should handle null data.results in /providers endpoint", async () => {
    const movieId = 278;

    mockTmdbGet.mockResolvedValue({
      data: {
        results: null, // Triggers ?? {} fallback
      },
    });

    const res = await request(app)
      .get(`/api/movies/${movieId}/providers`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should handle null detailsResp.data in /details endpoint", async () => {
    const movieId = 278;

    mockTmdbGet
      .mockResolvedValueOnce({
        data: null, // Triggers ?? {} fallback for detailsResp.data
      })
      .mockResolvedValueOnce({
        data: {
          cast: [],
        },
      });

    const res = await request(app)
      .get(`/api/movies/${movieId}/details`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it("should handle non-array data.results in /videos endpoint", async () => {
    const movieId = 278;

    mockTmdbGet.mockResolvedValue({
      data: {
        results: "not an array", // Triggers Array.isArray false branch
      },
    });

    const res = await request(app)
      .get(`/api/movies/${movieId}/videos`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    // Should return null trailer when results isn't an array
    expect(res.body.data).toBeNull();
  });
});

describe("Watchlist Routes - TMDB Enrichment", () => {
  let mongoContext: MongoTestContext;
  let app: Express;
  let token: string;
  let user: any;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log('Skipping test suite - MongoDB unavailable');
      return;
    }

    app = express();
    app.use(express.json());
    app.use(authenticate);
    app.use("/api/watchlist", watchlistRoutes);

    user = await User.create({
      email: "watchlist@example.com",
      name: "Watchlist User",
      googleId: "google-watchlist",
    });

    token = generateTestJWT(String(user._id));
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should add watchlist item with missing fields from TMDB", async () => {
    mockTmdbGet.mockResolvedValueOnce({
      data: {
        id: 100,
        title: "Test Movie",
        // Missing poster_path and overview
      },
    });

    const res = await request(app)
      .post("/api/watchlist")
      .set("Authorization", `Bearer ${token}`)
      .send({
        movieId: 100,
        title: "Test Movie",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.posterPath).toBeUndefined(); // Should not be set since TMDB didn't have it
  });
});

describe("Feed Routes - Activity Enrichment", () => {
  let mongoContext: MongoTestContext;
  let app: Express;
  let token: string;
  let user: any;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log('Skipping test suite - MongoDB unavailable');
      return;
    }

    app = express();
    app.use(express.json());
    app.use(authenticate);
    app.use("/api/feed", feedRoutes);

    user = await User.create({
      email: "feed@example.com",
      name: "Feed User",
      googleId: "google-feed",
    });

    token = generateTestJWT(String(user._id));
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    await FeedActivity.deleteMany({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should skip enrichment when activity already has poster and overview", async () => {
    await FeedActivity.create({
      userId: user._id,
      activityType: "ranked_movie",
      movieId: 201,
      movieTitle: "Complete Movie",
      posterPath: "/poster.jpg",
      overview: "Already has overview",
    });

    const res = await request(app)
      .get("/api/feed")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    // TMDB should not be called since both fields are present
    expect(mockTmdbGet).not.toHaveBeenCalled();
  });
});

describe("Config Module NODE_ENV Fallback", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should use production when NODE_ENV is set to production", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    jest.resetModules();
    const config = require("../../../../src/config").default;

    expect(config.nodeEnv).toBe("production");

    if (originalEnv) {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
