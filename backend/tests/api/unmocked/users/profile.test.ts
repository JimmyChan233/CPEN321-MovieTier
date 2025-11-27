/**
 * @unmocked Integration tests for user profile and routes
 * Tests with real MongoDB database
 */

/**
 * User Profile API Tests - Unmocked
 * Tests: PUT /users/profile, POST /users/fcm-token, GET /users/profile
 */

import request from "supertest";
import mongoose from "mongoose";
import express from "express";
import userRoutes from "../../../../src/routes/userRoutes";
import User from "../../../../src/models/user/User";
import { generateTestJWT, mockUsers } from "../../../helpers/test-fixtures";
import {
  initializeTestMongo,
  cleanupTestMongo,
  skipIfMongoUnavailable,
  MongoTestContext,
} from "../../../helpers/mongoConnect";

describe("Unmocked: PUT /users/profile", () => {
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
    app.use("/", userRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT((user as any)._id.toString());
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  // Input: Invalid JWT token
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it("should reject invalid token", async () => {
    const res = await request(app)
      .put("/profile")
      .set("Authorization", "Bearer invalid.token.here")
      .send({ name: "New Name" });

    expect(res.status).toStrictEqual(401);
  });
});

describe("Unmocked: POST /users/fcm-token", () => {
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
    app.use("/", userRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT((user as any)._id.toString());
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  // Input: Missing token
  // Expected status code: 400
  // Expected behavior: Validation error
  // Expected output: Error message
  it("should reject missing FCM token", async () => {
    const res = await request(app)
      .post("/fcm-token")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toStrictEqual(400);
  });
});

describe("Unmocked: GET /users/profile/:userId", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;
  let user: any;
  let otherUser: any;
  let token: string;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log("Skipping test suite - MongoDB unavailable");
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/", userRoutes);

    user = await User.create(mockUsers.validUser);
    otherUser = await User.create({
      ...mockUsers.validUser,
      email: "other@example.com",
      googleId: "google-other-123",
    });
    token = generateTestJWT((user as any)._id.toString());
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  // Input: No authentication
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it("should reject unauthenticated profile request", async () => {
    const res = await request(app).get(`/${otherUser._id}`);

    expect(res.status).toStrictEqual(401);
  });
});
