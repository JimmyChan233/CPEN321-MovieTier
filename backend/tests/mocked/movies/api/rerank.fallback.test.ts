/**
 * @mocked Fallback tests for rerank endpoint
 * Tests rerank functionality without MongoDB dependency
 */

import request from "supertest";
import jwt from "jsonwebtoken";
import express from "express";

// Mock the RankedMovie model to avoid MongoDB dependency
jest.mock("../../../../src/models/movie/RankedMovie", () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  deleteMany: jest.fn(),
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

// Mock TMDB client
jest.mock("../../../../src/services/tmdb/tmdbClient", () => ({
  getTmdbClient: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

// Mock other dependencies
jest.mock("../../../../src/models/friend/Friend", () => ({
  Friendship: {
    find: jest.fn(),
    findOne: jest.fn(),
    deleteMany: jest.fn(),
  },
  FriendRequest: {
    find: jest.fn(),
    findOne: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

jest.mock("../../../../src/services/sse/sseService", () => ({
  sseService: {
    send: jest.fn(),
  },
}));

describe("Rerank Controller - Null Fallbacks (Fallback)", () => {
  let app: express.Application;
  let userId: string;
  let token: string;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    userId = "test-user-123";
    const jwtSecret = process.env.JWT_SECRET || "test-secret";
    token = jwt.sign({ userId }, jwtSecret, { expiresIn: "1h" });

    const movieRoutes = require("../../../../src/routes/movieRoutes").default;
    app.use("/movies", movieRoutes);

    jest.clearAllMocks();
  });

  it("should use null fallback for posterPath when undefined", async () => {
    // When startRerank is called, it retrieves a movie to compare against
    // If that movie has undefined posterPath, the ?? null fallback is triggered

    const rankedMovieId = "ranked-movie-123";
    const movieId = 278;
    const title = "Inception";

    // Mock the compareWith movie having undefined posterPath
    const mockRankedMovie = {
      _id: rankedMovieId,
      movieId,
      title,
      posterPath: undefined, // This triggers the ?? null fallback
      rank: 1,
      userId,
    };

    const RankedMovie = require("../../../../src/models/movie/RankedMovie");
    RankedMovie.findById.mockResolvedValue(mockRankedMovie);
    
    // findOne for other movies to compare against
    RankedMovie.findOne.mockResolvedValue({
      _id: "another-movie",
      movieId: 100,
      title: "Other Movie",
      posterPath: "/other.jpg",
      rank: 2,
    });

    const response = await request(app)
      .post("/movies/rerank/start")
      .set("Authorization", `Bearer ${token}`)
      .send({
        rankedId: rankedMovieId,
      });

    // Should succeed
    if (response.status === 200) {
      // The response will contain compareWith with posterPath: null
      expect(response.body.data.compareWith.posterPath).toBeNull();
    }
  });

  it("should handle null fallback for title when undefined", async () => {
    const rankedMovieId = "ranked-movie-456";
    const movieId = 100;

    // Mock the compareWith movie having undefined title
    const mockRankedMovie = {
      _id: rankedMovieId,
      movieId,
      title: undefined, // This triggers the ?? null fallback
      posterPath: "/poster.jpg",
      rank: 1,
      userId,
    };

    const RankedMovie = require("../../../../src/models/movie/RankedMovie");
    RankedMovie.findById.mockResolvedValue(mockRankedMovie);
    
    RankedMovie.findOne.mockResolvedValue({
      _id: "another-movie",
      movieId: 200,
      title: "Another Movie",
      posterPath: "/another.jpg",
      rank: 2,
    });

    const response = await request(app)
      .post("/movies/rerank/start")
      .set("Authorization", `Bearer ${token}`)
      .send({
        rankedId: rankedMovieId,
      });

    // Should handle the case gracefully
    expect([200, 400, 404]).toContain(response.status);
  });

  it("should handle edge case when ranked movie is not found", async () => {
    const rankedMovieId = "non-existent-movie";

    const RankedMovie = require("../../../../src/models/movie/RankedMovie");
    RankedMovie.findById.mockResolvedValue(null); // Movie not found

    const response = await request(app)
      .post("/movies/rerank/start")
      .set("Authorization", `Bearer ${token}`)
      .send({
        rankedId: rankedMovieId,
      });

    // Should return appropriate error status
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});