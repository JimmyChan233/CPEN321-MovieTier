/**
 * @unmocked Integration tests for recommendations
 * Tests with real MongoDB database
 * Note: These tests focus on validation, error handling, and database integration
 * External service calls (TMDB) are skipped if unavailable
 */

/**
 * Recommendations API Tests - Unmocked
 * Tests: GET /recommendations, GET /recommendations/trending
 */

import request from "supertest";
import mongoose from "mongoose";
import express from "express";
import recommendationRoutes from "../../../src/routes/recommendationRoutes";
import User from "../../../src/models/user/User";
import RankedMovie from "../../../src/models/movie/RankedMovie";
import { generateTestJWT, mockUsers } from "../../utils/test-fixtures";
import { initializeTestMongo, cleanupTestMongo, skipIfMongoUnavailable, MongoTestContext } from "../../utils/mongoConnect";

// Helper function to check if TMDB service is available
const isTmdbAvailable = async (): Promise<boolean> => {
  try {
    const { getTmdbClient } = require("../../../src/services/tmdb/tmdbClient");
    const client = getTmdbClient();
    // Test with a simple endpoint to check if TMDB is accessible
    await client.get("/configuration");
    return true;
  } catch (error) {
    return false;
  }
};

describe("Unmocked: GET /recommendations", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;
  let user: any;
  let token: string;
  let tmdbAvailable: boolean;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log('Skipping test suite - MongoDB unavailable');
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/", recommendationRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT(user._id.toString());
    
    // Check if TMDB is available
    tmdbAvailable = await isTmdbAvailable();
    if (!tmdbAvailable) {
      console.log('TMDB service unavailable - some recommendation tests will be skipped');
    }
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    skipIfMongoUnavailable(mongoContext);
    await RankedMovie.deleteMany({});
  });

  // Input: No authentication token
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it("should reject unauthenticated recommendation request", async () => {
    const res = await request(app).get("/");

    expect(res.status).toStrictEqual(401);
  });

  // Test with valid authentication but no ranked movies
  it("should handle request with authentication but no user rankings", async () => {
    if (!tmdbAvailable) {
      console.log('Skipping test - TMDB service unavailable');
      return;
    }

    const res = await request(app)
      .get("/")
      .set("Authorization", `Bearer ${token}`);

    // Should return some recommendations (trending or similar)
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // Test with user rankings
  it("should provide recommendations based on user rankings", async () => {
    if (!tmdbAvailable) {
      console.log('Skipping test - TMDB service unavailable');
      return;
    }

    // Add some ranked movies for the user
    await RankedMovie.create([
      {
        userId: user._id,
        movieId: 550,
        title: "Fight Club",
        posterPath: "/fight-club.jpg",
        rank: 1,
      },
      {
        userId: user._id,
        movieId: 680,
        title: "Pulp Fiction",
        posterPath: "/pulp-fiction.jpg",
        rank: 2,
      }
    ]);

    const res = await request(app)
      .get("/")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe("Unmocked: GET /recommendations/trending", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;
  let user: any;
  let token: string;
  let tmdbAvailable: boolean;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log('Skipping test suite - MongoDB unavailable');
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/", recommendationRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT(user._id.toString());
    
    // Check if TMDB is available
    tmdbAvailable = await isTmdbAvailable();
    if (!tmdbAvailable) {
      console.log('TMDB service unavailable - trending tests will be skipped');
    }
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  // Input: No authentication token
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it("should reject unauthenticated trending request", async () => {
    const res = await request(app).get("/trending");

    expect(res.status).toStrictEqual(401);
  });

  // Test trending movies with valid authentication
  it("should return trending movies when authenticated", async () => {
    if (!tmdbAvailable) {
      console.log('Skipping test - TMDB service unavailable');
      return;
    }

    const res = await request(app)
      .get("/trending")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  // Test error handling for trending endpoint
  it("should handle trending request errors gracefully", async () => {
    if (!tmdbAvailable) {
      console.log('Skipping test - TMDB service unavailable');
      return;
    }

    // Test with invalid query parameters
    const res = await request(app)
      .get("/trending?invalidParam=value")
      .set("Authorization", `Bearer ${token}`);

    // Should still work with invalid params (they should be ignored)
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
