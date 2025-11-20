/**
 * @mocked Mocked tests for quote feature
 * Tests with mocked external services (TMDB) and real MongoDB
 */

/**
 * Quote Routes Tests - Mocked
 * Tests for movie tagline fetching endpoint
 */

import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import express from "express";
import movieRoutes from "../../../src/routes/movieRoutes";
import { authenticate } from "../../../src/middleware/auth";
import User from "../../../src/models/user/User";
import { generateTestJWT, mockUsers } from "../../utils/test-fixtures";

// Mock TMDB tagline service
jest.mock("../../../src/services/tmdb/tmdbTaglineService", () => ({
  fetchMovieTagline: jest.fn(),
}));

import { fetchMovieTagline } from "../../../src/services/tmdb/tmdbTaglineService";
const mockFetchMovieTagline = fetchMovieTagline as jest.MockedFunction<
  typeof fetchMovieTagline
>;

describe("Quote Routes - Unmocked Tests", () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use(authenticate);
    app.use("/api/movies", movieRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    user = await User.create(mockUsers.validUser);
    token = generateTestJWT((user as any)._id.toString());
    jest.clearAllMocks();
  });

  describe("GET /", () => {
    it("should return fallback quote on service errors", async () => {
      mockFetchMovieTagline.mockRejectedValueOnce(new Error("TMDB API error"));

      const res = await request(app)
        .get("/quote?title=Test Movie")
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
        .get("/quote?title=Movie&year=")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(mockFetchMovieTagline).toHaveBeenCalledWith("Movie", undefined);
    });
  });
});
