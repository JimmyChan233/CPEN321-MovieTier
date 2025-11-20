/**
 * @mocked Mocked tests for recommendation API
 * Tests with mocked external services (TMDB, SSE, FCM) and real MongoDB
 */

/**
 * Recommendation Controller Tests - Mocked
 * Comprehensive tests with mocked TMDB responses to cover all code paths
 */

import request from "supertest";
import mongoose from "mongoose";
import express from "express";
import recommendationRoutes from "../../../../src/routes/recommendationRoutes";
import User from "../../../../src/models/user/User";
import RankedMovie from "../../../../src/models/movie/RankedMovie";
import { generateTestJWT, mockUsers } from "../../../utils/test-fixtures";
import {
  initializeTestMongo,
  cleanupTestMongo,
  skipIfMongoUnavailable,
  MongoTestContext,
} from "../../../utils/mongoConnect";

// Mock TMDB client
const mockTmdbGet = jest.fn();
jest.mock("../../../../src/services/tmdb/tmdbClient", () => ({
  getTmdbClient: () => ({
    get: mockTmdbGet,
  }),
}));

// Mock logger
jest.mock("../../../../src/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("Mocked: Recommendation Controller", () => {
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
    app.use("/api/recommendations", recommendationRoutes);
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    skipIfMongoUnavailable(mongoContext);
    await User.deleteMany({});
    await RankedMovie.deleteMany({});

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT((user as any)._id.toString());

    jest.clearAllMocks();
  });

  // ==================== GET /trending Tests ====================

  describe("GET /trending", () => {
    it("should return empty array when TMDB returns no data", async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: null,
      });

      const res = await request(app)
        .get("/api/recommendations/trending")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it("should handle null/undefined movie fields", async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 550,
              title: "Test Movie",
              // Missing overview, poster_path, release_date, vote_average
            },
          ],
        },
      });

      const res = await request(app)
        .get("/api/recommendations/trending")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].overview).toBeNull();
      expect(res.body.data[0].posterPath).toBeNull();
      expect(res.body.data[0].releaseDate).toBeNull();
      expect(res.body.data[0].voteAverage).toBeNull();
    });

    it("should handle TMDB API error", async () => {
      mockTmdbGet.mockRejectedValueOnce(new Error("TMDB API error"));

      const res = await request(app)
        .get("/api/recommendations/trending")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Unable to load trending movies");
    });
  });

  // ==================== GET / (getRecommendations) Tests ====================

  describe("GET /", () => {
    it("should return 401 when userId is missing from request", async () => {
      // Create a malformed token without userId
      const malformedToken = generateTestJWT("");

      const res = await request(app)
        .get("/api/recommendations")
        .set("Authorization", `Bearer ${malformedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("User ID not found");
    });

    it("should return empty array when user has no ranked movies", async () => {
      const res = await request(app)
        .get("/api/recommendations")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it("should return empty array when all API sources fail", async () => {
      await RankedMovie.create({
        userId: (user as any)._id,
        movieId: 155,
        title: "The Dark Knight",
        rank: 1,
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: {
          genres: [{ id: 28, name: "Action" }],
          original_language: "en",
          vote_average: 9.0,
        },
      });

      // All recommendation sources fail (discover, similar, recommendations)
      mockTmdbGet.mockRejectedValueOnce(new Error("Discover failed"));
      mockTmdbGet.mockRejectedValueOnce(new Error("Similar failed"));
      mockTmdbGet.mockRejectedValueOnce(new Error("Recommendations failed"));

      const res = await request(app)
        .get("/api/recommendations")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it("should filter out already seen movies", async () => {
      await RankedMovie.create([
        {
          userId: (user as any)._id,
          movieId: 155,
          title: "The Dark Knight",
          rank: 1,
        },
        {
          userId: (user as any)._id,
          movieId: 550, // This movie is already ranked
          title: "Fight Club",
          rank: 2,
        },
      ]);

      mockTmdbGet.mockResolvedValueOnce({
        data: {
          genres: [{ id: 28, name: "Action" }],
          original_language: "en",
          vote_average: 9.0,
        },
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: {
          genres: [{ id: 18, name: "Drama" }],
          original_language: "en",
          vote_average: 8.8,
        },
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 550, // Already ranked - should be filtered
              title: "Fight Club",
              overview: "Overview",
              poster_path: "/poster.jpg",
              release_date: "1999-01-01",
              vote_average: 8.8,
              genre_ids: [18],
              original_language: "en",
            },
            {
              id: 1000, // New movie - should be included
              title: "New Movie",
              overview: "Overview",
              poster_path: "/new.jpg",
              release_date: "2023-01-01",
              vote_average: 8.0,
              genre_ids: [28],
              original_language: "en",
            },
          ],
        },
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [] },
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [] },
      });

      const res = await request(app)
        .get("/api/recommendations")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      const movieIds = res.body.data.map((m: any) => m.id);
      expect(movieIds).not.toContain(550); // Already ranked movie filtered out
    });

    it("should handle preference analysis failures gracefully", async () => {
      await RankedMovie.create({
        userId: (user as any)._id,
        movieId: 155,
        title: "The Dark Knight",
        rank: 1,
      });

      // Preference analysis fails
      mockTmdbGet.mockRejectedValueOnce(
        new Error("Movie details fetch failed"),
      );

      // But discover still works
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 1000,
              title: "Movie",
              overview: "Overview",
              poster_path: "/poster.jpg",
              release_date: "2023-01-01",
              vote_average: 8.0,
              genre_ids: [],
              original_language: "en",
            },
          ],
        },
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [] },
      });

      mockTmdbGet.mockResolvedValueOnce({
        data: { results: [] },
      });

      const res = await request(app)
        .get("/api/recommendations")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should handle recommendations with movies having partial fields", async () => {
      // Create a ranked movie to base recommendations on
      await RankedMovie.create({
        userId: (user as any)._id,
        movieId: 100,
        title: "Base Movie",
        rank: 1,
      });

      mockTmdbGet
        .mockResolvedValueOnce({
          data: {
            results: [{ id: 100, title: "Base", genres: [] }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            results: [
              {
                id: 201,
                title: "Similar Movie 1",
                genre_ids: [28],
                original_language: "en",
                // Missing: overview, poster_path, release_date, vote_average
              },
              {
                id: 202,
                title: "Similar Movie 2",
                overview: "Has overview",
                genre_ids: [18],
                // Missing: poster_path, release_date, vote_average, original_language
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          data: {
            results: [
              {
                id: 301,
                title: "Recommended",
                poster_path: "/rec.jpg",
                vote_average: 8.0,
                // Missing: overview, release_date, original_language
              },
            ],
          },
        });

      const res = await request(app)
        .get("/api/recommendations")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it("should handle recommendations with movies missing genre_ids", async () => {
      // Create a ranked movie to base recommendations on
      await RankedMovie.create({
        userId: (user as any)._id,
        movieId: 100,
        title: "Base Movie",
        rank: 1,
      });

      mockTmdbGet
        .mockResolvedValueOnce({
          data: {
            results: [{ id: 100, title: "Base", genres: [] }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            results: [
              {
                id: 201,
                title: "Similar Movie",
                overview: "Overview",
                poster_path: "/poster.jpg",
                release_date: "2023-01-01",
                vote_average: 8.0,
                original_language: "en",
                // Missing: genre_ids - should default to [] in convertTmdbMovie
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          data: {
            results: [],
          },
        })
        .mockResolvedValueOnce({
          data: {
            results: [],
          },
        });

      const res = await request(app)
        .get("/api/recommendations")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      // Verify that movies were returned (convertTmdbMovie was used)
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });
});
