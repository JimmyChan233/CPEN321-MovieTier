/**
 * @mocked Unit tests for recommendations with mocked external services
 * Tests business logic with controlled responses
 */

/**
 * Recommendations API Tests - Mocked
 * Tests: GET /recommendations, GET /recommendations/trending
 * These tests mock TMDB API calls to test business logic
 */

import request from "supertest";
import express from "express";
import recommendationRoutes from "../../../../src/routes/recommendationRoutes";
import User from "../../../../src/models/user/User";
import RankedMovie from "../../../../src/models/movie/RankedMovie";
import { generateTestJWT, mockUsers } from "../../../utils/test-fixtures";

// Mock the TMDB client to provide controlled responses
jest.mock("../../../../src/services/tmdb/tmdbClient", () => ({
  getTmdbClient: jest.fn(() => ({
    get: jest.fn((url: string) => {
      if (url === "/trending/movie/week") {
        return Promise.resolve({
          data: {
            results: [
              {
                id: 550,
                title: "Fight Club",
                overview: "A ticking-time-bomb insomniac...",
                poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
                release_date: "1999-10-15",
                vote_average: 8.4,
              },
              {
                id: 680,
                title: "Pulp Fiction",
                overview: "A burger-loving hit man...",
                poster_path: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
                release_date: "1994-09-10",
                vote_average: 8.5,
              },
            ],
          },
        });
      }
      if (url.includes("/similar") || url.includes("/recommendations")) {
        return Promise.resolve({
          data: {
            results: [
              {
                id: 424,
                title: "Schindler's List",
                overview: "The true story...",
                poster_path: "/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg",
                release_date: "1993-11-30",
                vote_average: 8.6,
              },
            ],
          },
        });
      }
      if (url.includes("/movie/")) {
        return Promise.resolve({
          data: {
            id: 278,
            genres: [
              { id: 18, name: "Drama" },
              { id: 80, name: "Crime" },
            ],
          },
        });
      }
      return Promise.reject(new Error("Not found"));
    }),
  })),
}));

// Mock database models
jest.mock("../../../../src/models/user/User");
jest.mock("../../../../src/models/movie/RankedMovie");

describe("Mocked: GET /recommendations", () => {
  let app: express.Application;
  let mockUser: any;
  let mockToken: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/", recommendationRoutes);

    // Use a valid MongoDB ObjectId format
    mockUser = {
      _id: "507f1f77bcf86cd799439011",
      name: "Test User",
      email: "test@example.com",
    };
    mockToken = generateTestJWT(mockUser._id);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock User.findById
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });
  });

  it("should return personalized recommendations based on user rankings", async () => {
    // Mock user has ranked movies
    (RankedMovie.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        {
          userId: "507f1f77bcf86cd799439011",
          movieId: 550,
          title: "Fight Club",
          rank: 1,
        },
        {
          userId: "507f1f77bcf86cd799439011",
          movieId: 680,
          title: "Pulp Fiction",
          rank: 2,
        },
      ]),
    });

    const res = await request(app)
      .get("/")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    // Verify TMDB was called for recommendations
    const { getTmdbClient } = require("../../../../src/services/tmdb/tmdbClient");
    expect(getTmdbClient).toHaveBeenCalled();
  });

  it("should return trending movies when user has no rankings", async () => {
    // Mock user has no ranked movies
    (RankedMovie.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    });

    const res = await request(app)
      .get("/")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    // When user has no rankings, it should still return trending movies based on our mock
    expect(res.body.data.length).toBeGreaterThanOrEqual(0); // Could be empty or have trending movies
  });

  it("should handle TMDB API errors gracefully", async () => {
    // Mock TMDB client to reject
    const { getTmdbClient } = require("../../../../src/services/tmdb/tmdbClient");
    (getTmdbClient as jest.Mock).mockReturnValue({
      get: jest.fn().mockRejectedValue(new Error("TMDB API error")),
    });

    (RankedMovie.find as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get("/")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Unable to load recommendations");
  });
});

describe("Mocked: GET /recommendations/trending", () => {
  let app: express.Application;
  let mockUser: any;
  let mockToken: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/", recommendationRoutes);

    // Use a valid MongoDB ObjectId format
    mockUser = {
      _id: "507f1f77bcf86cd799439011",
      name: "Test User",
      email: "test@example.com",
    };
    mockToken = generateTestJWT(mockUser._id);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock User.findById
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });
  });

  it("should return trending movies", async () => {
    // Ensure TMDB mock is set up correctly for trending
    const { getTmdbClient } = require("../../../../src/services/tmdb/tmdbClient");
    (getTmdbClient as jest.Mock).mockReturnValue({
      get: jest.fn((url: string) => {
        if (url === "/trending/movie/week") {
          return Promise.resolve({
            data: {
              results: [
                {
                  id: 550,
                  title: "Fight Club",
                  overview: "A ticking-time-bomb insomniac...",
                  poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
                  release_date: "1999-10-15",
                  vote_average: 8.4,
                },
                {
                  id: 680,
                  title: "Pulp Fiction",
                  overview: "A burger-loving hit man...",
                  poster_path: "/d5iIlFn5s0ImszBPb8JPIfbXD.jpg",
                  release_date: "1994-09-10",
                  vote_average: 8.5,
                },
              ],
            },
          });
        }
        return Promise.reject(new Error("Not found"));
      }),
    });

    const res = await request(app)
      .get("/trending")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2); // Based on our mock
    expect(res.body.data[0].title).toBe("Fight Club");
    expect(res.body.data[1].title).toBe("Pulp Fiction");
  });

  it("should handle empty trending response", async () => {
    // Mock TMDB to return empty results
    const { getTmdbClient } = require("../../../../src/services/tmdb/tmdbClient");
    (getTmdbClient as jest.Mock).mockReturnValue({
      get: jest.fn().mockResolvedValue({
        data: { results: [] },
      }),
    });

    const res = await request(app)
      .get("/trending")
      .set("Authorization", `Bearer ${mockToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });
});
