/**
 * @mocked Mocked tests for watchlist API
 * Tests with mocked external services (TMDB, SSE, FCM) and real MongoDB
 */

/**
 * Watchlist Routes Tests - Mocked
 * Tests for error handling and edge cases in watchlist routes
 */

import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import express from "express";
import watchlistRoutes from "../../../src/routes/watchlistRoutes";
import User from "../../../src/models/user/User";
import WatchlistItem from "../../../src/models/watch/WatchlistItem";
import { generateTestJWT, mockUsers } from "../../utils/test-fixtures";

// Mock TMDB client
const mockTmdbGet = jest.fn();
jest.mock("../../../src/services/tmdb/tmdbClient", () => ({
  getTmdbClient: () => ({
    get: mockTmdbGet,
  }),
}));

describe("Watchlist Routes - Mocked Tests", () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use("/api/watchlist", watchlistRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await WatchlistItem.deleteMany({});

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT((user as any)._id.toString());

    jest.clearAllMocks();
  });

  // ==================== POST / (Add to Watchlist) Tests ====================

  describe("POST /", () => {
    it("should not override provided overview with TMDB data", async () => {
      mockTmdbGet.mockResolvedValueOnce({
        data: {
          poster_path: "/tmdb-poster.jpg",
          overview: "TMDB overview",
        },
      });

      const res = await request(app)
        .post("/api/watchlist")
        .set("Authorization", `Bearer ${token}`)
        .send({
          movieId: 550,
          title: "Fight Club",
          overview: "Provided overview",
          // posterPath not provided - WILL be enriched
        });

      expect(res.status).toBe(201);
      expect(res.body.data.overview).toBe("Provided overview");
      expect(res.body.data.posterPath).toBe("/tmdb-poster.jpg");
    });
  });
});
