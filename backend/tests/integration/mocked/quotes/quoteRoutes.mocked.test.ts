/**
 * @mocked Mocked tests for quote feature
 * Tests with mocked TMDB service and real MongoDB database
 */

/**
 * Quote Routes Tests - Mocked
 * Tests for movie tagline fetching endpoint with mocked TMDB service
 */

import request from "supertest";
import mongoose from "mongoose";
import express from "express";
import movieRoutes from "../../../../src/routes/movieRoutes";
import { authenticate } from "../../../../src/middleware/auth";
import User from "../../../../src/models/user/User";
import { generateTestJWT, mockUsers } from "../../../utils/test-fixtures";
import {
  initializeTestMongo,
  cleanupTestMongo,
  skipIfMongoUnavailable,
  MongoTestContext,
} from "../../../utils/mongoConnect";

// Mock TMDB tagline service
jest.mock("../../../../src/services/tmdb/tmdbTaglineService", () => ({
  fetchMovieTagline: jest.fn(),
}));

import { fetchMovieTagline } from "../../../../src/services/tmdb/tmdbTaglineService";
const mockFetchMovieTagline = fetchMovieTagline as jest.MockedFunction<
  typeof fetchMovieTagline
>;

describe("Mocked: Quote Routes", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log("Skipping test suite - MongoDB unavailable");
      return;
    }

    app = express();
    app.use(express.json());
    app.use(authenticate);
    app.use("/api/movies", movieRoutes);
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    skipIfMongoUnavailable(mongoContext);
    await User.deleteMany({});
    user = await User.create(mockUsers.validUser);
    token = generateTestJWT((user as any)._id.toString());
    jest.clearAllMocks();
  });

  describe("GET /", () => {
    it("should return fallback quote on service errors", async () => {
      mockFetchMovieTagline.mockRejectedValueOnce(new Error("TMDB API error"));

      const res = await request(app)
        .get("/api/movies/quote?title=Test Movie")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data).toBe("string");
      expect(res.body.fallback).toBe(true);
    });

    it("should handle empty year parameter", async () => {
      mockFetchMovieTagline.mockResolvedValueOnce("Tagline");

      const res = await request(app)
        .get("/api/movies/quote?title=Movie&year=")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(mockFetchMovieTagline).toHaveBeenCalledWith("Movie", undefined);
    });
  });
});
