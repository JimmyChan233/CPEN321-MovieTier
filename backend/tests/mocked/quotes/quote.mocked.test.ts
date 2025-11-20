/**
 * @mocked Mocked tests for quote feature
 * Tests with mocked TMDB service and real MongoDB database
 */

/**
 * Quote API Tests - Mocked
 * Tests: GET /quotes with mocked TMDB service
 */

import request from "supertest";
import mongoose from "mongoose";
import express from "express";
import movieRoutes from "../../../src/routes/movieRoutes";
import User from "../../../src/models/user/User";
import { generateTestJWT, mockUsers } from "../../utils/test-fixtures";
import {
  initializeTestMongo,
  cleanupTestMongo,
  skipIfMongoUnavailable,
  MongoTestContext,
} from "../../utils/mongoConnect";

describe("Mocked: GET /quotes", () => {
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
    app.use("/api/movies", movieRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT(user._id.toString());
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  // Input: Valid query parameter (movie title)
  // Expected status code: 200
  // Expected behavior: Fetch quote from TMDB or local catalog
  // Expected output: Quote object or fallback quote
  it("should return quote for movie", async () => {
    const res = await request(app)
      .get("/api/movies/quote")
      .set("Authorization", `Bearer ${token}`)
      .query({ title: "Inception" });

    expect(res.status).toStrictEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data).toBe("string");
  });

  // Input: Missing title query parameter
  // Expected status code: 400
  // Expected behavior: Request rejected
  // Expected output: Validation error
  it("should reject quote request without title", async () => {
    const res = await request(app)
      .get("/api/movies/quote")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toStrictEqual(400);
  });
});
