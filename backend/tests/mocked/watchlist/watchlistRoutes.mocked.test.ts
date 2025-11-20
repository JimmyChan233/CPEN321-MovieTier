/**
 * @mocked Unit tests for watchlist with mocked external services
 * Tests business logic with controlled responses
 */

/**
 * Watchlist Routes Tests - Mocked
 * Tests TMDB enrichment functionality with mocked responses
 */

import request from "supertest";
import express from "express";
import watchlistRoutes from "../../../src/routes/watchlistRoutes";
import User from "../../../src/models/user/User";
import WatchlistItem from "../../../src/models/watch/WatchlistItem";
import { generateTestJWT, mockUsers } from "../../utils/test-fixtures";

// Mock TMDB client for controlled responses
jest.mock("../../../src/services/tmdb/tmdbClient", () => ({
  getTmdbClient: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

// Mock database models
jest.mock("../../../src/models/user/User");
jest.mock("../../../src/models/watch/WatchlistItem");

describe("Mocked: Watchlist Routes - TMDB Enrichment", () => {
  let app: express.Application;
  let mockUser: any;
  let mockToken: string;
  let mockGet: jest.Mock;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/", watchlistRoutes);

    mockUser = { _id: "user123", name: "Test User", email: "test@example.com" };
    mockToken = generateTestJWT(mockUser._id);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock User.findById
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    // Setup TMDB mock
    const { getTmdbClient } = require("../../../src/services/tmdb/tmdbClient");
    mockGet = jest.fn();
    (getTmdbClient as jest.Mock).mockReturnValue({ get: mockGet });
    
    // Reset WatchlistItem mocks
    (WatchlistItem.findOne as jest.Mock).mockReset();
    (WatchlistItem.create as jest.Mock).mockReset();
  });

  describe("TMDB Enrichment Tests", () => {
    it("should handle TMDB enrichment when data is missing", async () => {
      // Mock TMDB response
      mockGet.mockResolvedValueOnce({
        data: {
          poster_path: "/enriched-poster.jpg",
          overview: "Enriched overview from TMDB",
        },
      });

      // Mock WatchlistItem.create to return a simple object
      (WatchlistItem.create as jest.Mock).mockResolvedValue({
        _id: "item123",
        userId: mockUser._id,
        movieId: 550,
        title: "Fight Club",
        posterPath: "/enriched-poster.jpg",
        overview: "Enriched overview from TMDB",
      });

      // Mock WatchlistItem.findOne to return null (no duplicate)
      (WatchlistItem.findOne as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post("/")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({
          movieId: 550,
          title: "Fight Club",
          // Missing posterPath and overview
        });

      // Check that we get a successful response
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      
      // Verify TMDB was called (this is the key part we're testing)
      expect(mockGet).toHaveBeenCalledWith("/movie/550", {"params": {"language": "en-US"}});
    });

    it("should enrich missing overview from TMDB", async () => {
      // Mock TMDB response
      mockGet.mockResolvedValueOnce({
        data: {
          poster_path: "/poster.jpg",
          overview: "Enriched overview text",
        },
      });

      // Mock WatchlistItem.create
      (WatchlistItem.create as jest.Mock).mockResolvedValue({
        _id: "item124",
        userId: mockUser._id,
        movieId: 680,
        title: "Pulp Fiction",
        posterPath: "/existing-poster.jpg", // Should keep existing
        overview: "Enriched overview text", // Should use enriched
      });

      // Mock WatchlistItem.findOne to return null (no duplicate)
      (WatchlistItem.findOne as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post("/")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({
          movieId: 680,
          title: "Pulp Fiction",
          posterPath: "/existing-poster.jpg", // Existing posterPath
          // Missing overview
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      // Verify TMDB was called for enrichment
      expect(mockGet).toHaveBeenCalledWith("/movie/680", {"params": {"language": "en-US"}});
    });

    it("should handle TMDB enrichment failure gracefully", async () => {
      // Mock TMDB to reject
      mockGet.mockRejectedValueOnce(new Error("TMDB API error"));

      // Mock WatchlistItem.create
      (WatchlistItem.create as jest.Mock).mockResolvedValue({
        _id: "item125",
        userId: mockUser._id,
        movieId: 550,
        title: "Fight Club",
        posterPath: undefined,
        overview: undefined,
      });

      // Mock WatchlistItem.findOne to return null (no duplicate)
      (WatchlistItem.findOne as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post("/")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({
          movieId: 550,
          title: "Fight Club",
          // Missing posterPath and overview
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      // Should still create the item even without enrichment
    });

    it("should not call TMDB when all data is provided", async () => {
      // Mock WatchlistItem.create
      (WatchlistItem.create as jest.Mock).mockResolvedValue({
        _id: "item126",
        userId: mockUser._id,
        movieId: 550,
        title: "Fight Club",
        posterPath: "/provided-poster.jpg",
        overview: "Provided overview",
      });

      // Mock WatchlistItem.findOne to return null (no duplicate)
      (WatchlistItem.findOne as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post("/")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({
          movieId: 550,
          title: "Fight Club",
          posterPath: "/provided-poster.jpg",
          overview: "Provided overview",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockGet).not.toHaveBeenCalled(); // TMDB should not be called
    });
  });

  describe("Validation Tests", () => {
    it("should reject missing movieId", async () => {
      const res = await request(app)
        .post("/")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({
          title: "Fight Club",
          // Missing movieId
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("movieId and title are required");
    });

    it("should reject missing title", async () => {
      const res = await request(app)
        .post("/")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({
          movieId: 550,
          // Missing title
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("movieId and title are required");
    });
  });

  describe("Duplicate Prevention Tests", () => {
    it("should reject duplicate movie", async () => {
      // Mock existing watchlist item
      (WatchlistItem.findOne as jest.Mock).mockResolvedValue({
        _id: "existing123",
        userId: mockUser._id,
        movieId: 550,
        title: "Fight Club",
      });

      const res = await request(app)
        .post("/")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({
          movieId: 550,
          title: "Fight Club",
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("already in watchlist");
      
      // Should not call TMDB or create new item
      expect(mockGet).not.toHaveBeenCalled();
      expect(WatchlistItem.create).not.toHaveBeenCalled();
    });
  });
});