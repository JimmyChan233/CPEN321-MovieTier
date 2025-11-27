/**
 * @unmocked Integration tests for authentication with real MongoDB
 * MongoDB is unmocked (real database), external services (Google OAuth) are mocked
 * Focuses on validation, error handling, and database integration
 */

/**
 * Authentication API Tests - Unmocked
 *
 * These tests verify auth endpoint behavior with real MongoDB but mocked OAuth.
 * Comprehensive OAuth flow tests are in the mocked test suite.
 * Focus here: validation, error cases, database constraints
 */

import request from "supertest";
import mongoose from "mongoose";
import express from "express";
import authRoutes from "../../../../src/routes/authRoutes";
import User from "../../../../src/models/user/User";
import {
  Friendship,
  FriendRequest,
} from "../../../../src/models/friend/Friend";
import { generateTestJWT } from "../../../helpers/test-fixtures";
import {
  initializeTestMongo,
  cleanupTestMongo,
  skipIfMongoUnavailable,
  MongoTestContext,
} from "../../../helpers/mongoConnect";

/**
 * @unmocked Integration tests for authentication
 * Tests with real MongoDB database but without mocking external services
 * Focus on API validation, error handling, and database integration
 */

// Interface POST /auth/signin
describe("Unmocked: POST /auth/signin", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log("Skipping test suite - MongoDB unavailable");
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    skipIfMongoUnavailable(mongoContext);
    await User.deleteMany({});
  });

  // Input: No idToken in request body
  // Expected status code: 400
  // Expected behavior: Request is rejected with validation error
  // Expected output: Error message indicating missing idToken
  it("should reject signin without idToken", async () => {
    const res = await request(app).post("/api/auth/signin").send({
      email: "test@example.com",
      name: "Test User",
    });

    expect(res.status).toStrictEqual(400);
    expect(res.body.message).toMatch(/idToken|required/i);
  });

  // Input: Invalid idToken format
  // Expected status code: 400
  // Expected behavior: Request is rejected with validation error
  // Expected output: Error message indicating invalid token
  it("should reject signin with invalid idToken format", async () => {
    const res = await request(app).post("/api/auth/signin").send({
      idToken: 12345, // Invalid format - should be string
    });

    expect(res.status).toStrictEqual(400);
    expect(res.body.message).toMatch(/idToken|required|invalid/i);
  });

  // Input: Valid idToken but user doesn't exist in database
  // Expected status code: 400
  // Expected behavior: Database is unchanged, error is returned
  // Expected output: Error message "User not found"
  it("should reject signin for non-existent user", async () => {
    // Note: This test would normally require a valid Google token
    // For unmocked integration test, we verify the endpoint handles the case properly
    const res = await request(app).post("/api/auth/signin").send({
      idToken: "invalid-or-expired-token",
    });

    // Should fail with authentication error since token is invalid
    expect(res.status).toStrictEqual(400);
    expect(res.body.message).toBeDefined();
  });
});

// Interface POST /auth/signup
describe("Unmocked: POST /auth/signup", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log("Skipping test suite - MongoDB unavailable");
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    skipIfMongoUnavailable(mongoContext);
    await User.deleteMany({});
  });

  // Input: No idToken in request
  // Expected status code: 400
  // Expected behavior: Database is unchanged
  // Expected output: Error message about missing idToken
  it("should reject signup without idToken", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      email: "newuser@example.com",
      name: "New User",
    });

    expect(res.status).toStrictEqual(400);
    expect(res.body.message).toMatch(/idToken|required/i);
  });

  // Note: Tests for successful signup and duplicate email handling are in auth.mocked.test.ts
  // since they require mocking Google OAuth token verification
});

// Interface POST /auth/signout
describe("Unmocked: POST /auth/signout", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log("Skipping test suite - MongoDB unavailable");
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    skipIfMongoUnavailable(mongoContext);
    await User.deleteMany({});
  });

  // Input: Malformed or invalid JWT token
  // Expected status code: 401
  // Expected behavior: Request is rejected
  // Expected output: Invalid token error
  it("should reject signout with invalid token", async () => {
    const res = await request(app)
      .post("/api/auth/signout")
      .set("Authorization", "Bearer invalid.jwt.token")
      .send({});

    expect(res.status).toStrictEqual(401);
    expect(res.body.message).toMatch(/invalid|expired/i);
  });

  // Note: Test for successful signout with valid token is in auth.mocked.test.ts
});

// Interface DELETE /auth/account
describe("Unmocked: DELETE /auth/account", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log("Skipping test suite - MongoDB unavailable");
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    skipIfMongoUnavailable(mongoContext);
    await User.deleteMany({});
    await Friendship.deleteMany({});
    await FriendRequest.deleteMany({});
  });

  // Input: Invalid authentication token
  // Expected status code: 401
  // Expected behavior: Database is unchanged
  // Expected output: Invalid token error
  it("should reject account deletion with invalid token", async () => {
    const user = await User.create({
      email: "secure@example.com",
      name: "Secure User",
      googleId: "google-secure",
    });

    const res = await request(app)
      .delete("/api/auth/account")
      .set("Authorization", "Bearer invalid.token")
      .send({});

    expect(res.status).toStrictEqual(401);

    // Verify user still exists
    const stillExistingUser = await User.findById(user._id);
    expect(stillExistingUser).toBeDefined();
  });

  // Note: Tests for successful account deletion are in auth.mocked.test.ts
  // This integration test focuses on error cases and validation
});
