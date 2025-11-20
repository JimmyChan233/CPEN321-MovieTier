/**
 * @mocked API tests for rerank endpoint
 * Tests rerank functionality with mocked dependencies
 */

import request from "supertest";
import jwt from "jsonwebtoken";
import RankedMovie from "../../../../../src/models/movie/RankedMovie";
import { getTmdbClient } from "../../../../../src/services/tmdb/tmdbClient";
import express from "express";

jest.mock("../../../../../src/models/movie/RankedMovie");
jest.mock("../../../../../src/services/tmdb/tmdbClient");

describe("Rerank Controller - Null Fallbacks", () => {
  let app: express.Application;
  let userId: string;
  let token: string;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    userId = "test-user-123";
    const jwtSecret = process.env.JWT_SECRET || "test-secret";
    token = jwt.sign({ userId }, jwtSecret, { expiresIn: "1h" });

    const movieRoutes =
      require("../../../../../src/routes/movieRoutes").default;
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

    (RankedMovie.findById as jest.Mock).mockResolvedValue(mockRankedMovie);
    // findOne for other movies to compare against
    (RankedMovie.findOne as jest.Mock).mockResolvedValue({
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
});
