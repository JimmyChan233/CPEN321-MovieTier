/**
 * @unmocked Integration tests for watchlist operations
 * Tests with real MongoDB database
 * Note: These tests focus on validation, error handling, and database integration
 * External service calls (TMDB) are skipped if unavailable
 */

/**
 * Watchlist Routes Tests - Unmocked
 * Comprehensive tests for all watchlist route handlers
 */

import request from "supertest";
import mongoose from "mongoose";
import express from "express";
import watchlistRoutes from "../../../src/routes/watchlistRoutes";
import User from "../../../src/models/user/User";
import WatchlistItem from "../../../src/models/watch/WatchlistItem";
import {
  generateTestJWT,
  mockUsers,
  mockMovies,
} from "../../utils/test-fixtures";
import {
  initializeTestMongo,
  cleanupTestMongo,
  skipIfMongoUnavailable,
  MongoTestContext,
} from "../../utils/mongoConnect";

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

describe("Watchlist Routes - Unmocked Tests", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;
  let user1: any;
  let user2: any;
  let token1: string;
  let token2: string;
  let tmdbAvailable: boolean;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log("Skipping test suite - MongoDB unavailable");
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/", watchlistRoutes);

    // Check if TMDB is available
    tmdbAvailable = await isTmdbAvailable();
    if (!tmdbAvailable) {
      console.log(
        "TMDB service unavailable - TMDB enrichment tests will be skipped",
      );
    }
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    skipIfMongoUnavailable(mongoContext);
    await User.deleteMany({});
    await WatchlistItem.deleteMany({});

    user1 = await User.create(mockUsers.validUser);
    user2 = await User.create({
      email: "user2@example.com",
      name: "User Two",
      googleId: "google-user2",
    });

    token1 = generateTestJWT((user1 as any)._id.toString());
    token2 = generateTestJWT((user2 as any)._id.toString());
  });

  // ==================== GET / Tests ====================

  describe("GET /", () => {
    it("should sort watchlist by createdAt descending", async () => {
      const item1 = await WatchlistItem.create({
        userId: (user1 as any)._id,
        movieId: 550,
        title: "Fight Club",
        createdAt: new Date("2024-01-01"),
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const item2 = await WatchlistItem.create({
        userId: (user1 as any)._id,
        movieId: 680,
        title: "Pulp Fiction",
        createdAt: new Date("2024-01-02"),
      });

      const res = await request(app)
        .get("/")
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      // Most recent first
      expect(res.body.data[0].movieId).toBe(680);
      expect(res.body.data[1].movieId).toBe(550);
    });
  });

  // ==================== POST / Tests ====================

  describe("POST /", () => {
    describe("TMDB Enrichment", () => {
      it("should add movie with complete data (no enrichment needed)", async () => {
        const res = await request(app)
          .post("/")
          .set("Authorization", `Bearer ${token1}`)
          .send({
            movieId: 550,
            title: "Fight Club",
            posterPath: "/fight-club-poster.jpg",
            overview:
              "An insomniac office worker and a devil-may-care soap maker...",
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.movieId).toBe(550);
        expect(res.body.data.title).toBe("Fight Club");
        expect(res.body.data.posterPath).toBe("/fight-club-poster.jpg");
        expect(res.body.data.overview).toBe(
          "An insomniac office worker and a devil-may-care soap maker...",
        );

        // Verify it was saved to database
        const savedItem = await WatchlistItem.findOne({
          userId: user1._id,
          movieId: 550,
        });
        expect(savedItem).toBeDefined();
        expect((savedItem as any).title).toBe("Fight Club");
      });

      it("should handle TMDB enrichment when external service is available", async () => {
        if (!tmdbAvailable) {
          console.log("Skipping test - TMDB service unavailable");
          return;
        }

        const res = await request(app)
          .post("/")
          .set("Authorization", `Bearer ${token1}`)
          .send({
            movieId: 550,
            title: "Fight Club",
            // Missing posterPath and overview - should be enriched from TMDB
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.movieId).toBe(550);
        expect(res.body.data.title).toBe("Fight Club");

        // Should have enriched data from TMDB
        expect(res.body.data.posterPath).toBeDefined();
        expect(res.body.data.overview).toBeDefined();
      });

      it("should handle missing data gracefully when TMDB is unavailable", async () => {
        if (tmdbAvailable) {
          console.log(
            "Skipping test - TMDB is available, this tests the unavailable case",
          );
          return;
        }

        const res = await request(app)
          .post("/")
          .set("Authorization", `Bearer ${token1}`)
          .send({
            movieId: 550,
            title: "Fight Club",
            // Missing posterPath and overview, TMDB unavailable
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.movieId).toBe(550);
        expect(res.body.data.title).toBe("Fight Club");

        // Should still create the item even without enrichment
        const savedItem = await WatchlistItem.findOne({
          userId: user1._id,
          movieId: 550,
        });
        expect(savedItem).toBeDefined();
        expect((savedItem as any).title).toBe("Fight Club");
      });
    });

    describe("Validation", () => {
      const validationTests = [
        {
          name: "should reject missing movieId",
          request: { title: "Fight Club" },
        },
        {
          name: "should reject missing title",
          request: { movieId: 550 },
        },
      ];

      validationTests.forEach((test) => {
        it(test.name, async () => {
          const res = await request(app)
            .post("/")
            .set("Authorization", `Bearer ${token1}`)
            .send(test.request);

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);
          expect(res.body.message).toContain("movieId and title are required");
        });
      });
    });

    it("should reject duplicate movie", async () => {
      await WatchlistItem.create({
        userId: (user1 as any)._id,
        movieId: 550,
        title: "Fight Club",
      });

      const res = await request(app)
        .post("/")
        .set("Authorization", `Bearer ${token1}`)
        .send({
          movieId: 550,
          title: "Fight Club",
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("already in watchlist");
    });
  });

  // ==================== DELETE /:movieId Tests ====================

  describe("DELETE /:movieId", () => {
    beforeEach(async () => {
      await WatchlistItem.create([
        {
          userId: (user1 as any)._id,
          movieId: 550,
          title: "Fight Club",
        },
        {
          userId: (user1 as any)._id,
          movieId: 680,
          title: "Pulp Fiction",
        },
        {
          userId: (user2 as any)._id,
          movieId: 550,
          title: "Fight Club",
        },
      ]);
    });

    it("should return 404 when movie not in watchlist", async () => {
      const res = await request(app)
        .delete("/9999")
        .set("Authorization", `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("not found in watchlist");
    });

    it("should handle invalid movieId format gracefully", async () => {
      const res = await request(app)
        .delete("/invalid")
        .set("Authorization", `Bearer ${token1}`);

      // Invalid movieId format returns 400 Bad Request
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Invalid movie id");
    });

    it("should not affect other watchlist items", async () => {
      await request(app)
        .delete("/550")
        .set("Authorization", `Bearer ${token1}`);

      const remaining = await WatchlistItem.find({
        userId: (user1 as any)._id,
      });
      expect(remaining.length).toBe(1);
      expect(remaining[0].movieId).toBe(680);
    });
  });

  // ==================== Edge Cases and Error Handling ====================

  describe("Edge Cases", () => {});
});
