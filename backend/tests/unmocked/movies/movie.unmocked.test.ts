/**
 * @unmocked Integration tests for movie operations
 * Tests with real MongoDB database
 */

/**
 * Movie API Tests - Unmocked
 * Tests: GET /search, GET /ranked, POST /rank, POST /compare, POST /rerank/start, DELETE /ranked/:id
 */

import request from "supertest";
import mongoose from "mongoose";
import express from "express";
import movieRoutes from "../../../src/routes/movieRoutes";
import User from "../../../src/models/user/User";
import RankedMovie from "../../../src/models/movie/RankedMovie";
import {
  generateTestJWT,
  mockUsers,
  mockMovies,
} from "../../utils/test-fixtures";
import { initializeTestMongo, cleanupTestMongo, skipIfMongoUnavailable, MongoTestContext } from "../../utils/mongoConnect";

// Mock the TMDB client to avoid real API calls in tests
jest.mock("../../../src/services/tmdb/tmdbClient", () => ({
  getTmdbClient: jest.fn(() => ({
    get: jest.fn((url: string) => {
      if (url === "/search/movie") {
        return Promise.resolve({
          data: {
            results: [
              {
                id: 27205,
                title: "Inception",
                overview: "A thief who steals corporate secrets...",
                poster_path: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
                release_date: "2010-07-15",
                vote_average: 8.4,
              },
              {
                id: 155,
                title: "The Dark Knight",
                overview: "Batman raises the stakes...",
                poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
                release_date: "2008-07-16",
                vote_average: 8.5,
              },
            ],
          },
        });
      }
      return Promise.reject(new Error("Not found"));
    }),
  })),
}));

describe("Unmocked: GET /movies/search", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log('Skipping test suite - MongoDB unavailable');
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/", movieRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT(user._id.toString());
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  // Input: Valid query but unauthenticated
  // Expected status code: 401
  // Expected behavior: Request is rejected before API call
  // Expected output: Unauthorized error
  it("should reject unauthenticated search", async () => {
    const res = await request(app).get("/search").query({ query: "Inception" });

    expect(res.status).toStrictEqual(401);
  });
});

describe("Unmocked: GET /movies/ranked", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log('Skipping test suite - MongoDB unavailable');
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/", movieRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT(user._id.toString());
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    await RankedMovie.deleteMany({});
  });

  // Input: No authentication token
  // Expected status code: 401
  // Expected behavior: Request is rejected
  // Expected output: Unauthorized error
  it("should reject unauthenticated ranked movies request", async () => {
    const res = await request(app).get("/ranked");

    expect(res.status).toStrictEqual(401);
  });
});

describe("Unmocked: DELETE /movies/ranked/:id", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log('Skipping test suite - MongoDB unavailable');
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/", movieRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT(user._id.toString());
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    await RankedMovie.deleteMany({});
  });

  // Input: Invalid ObjectId format
  // Expected status code: 400
  // Expected behavior: Database is unchanged
  // Expected output: Bad request error
  it("should reject deletion with invalid ID format", async () => {
    const res = await request(app)
      .delete("/ranked/invalid-id")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toStrictEqual(400);
  });
});

describe("Unmocked: POST /movies/rank", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log('Skipping test suite - MongoDB unavailable');
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/", movieRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT(user._id.toString());
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    await RankedMovie.deleteMany({});
  });

  // Input: Missing title
  // Expected status code: 400
  // Expected behavior: Request is rejected
  // Expected output: Validation error
  it("should reject ranking without title", async () => {
    const res = await request(app)
      .post("/add")
      .set("Authorization", `Bearer ${token}`)
      .send({
        movieId: 278,
      });

    expect(res.status).toStrictEqual(400);
    expect(res.body.message).toMatch(/title|required/i);
  });
});
