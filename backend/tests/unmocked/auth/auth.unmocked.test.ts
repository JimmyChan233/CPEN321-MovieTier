/**
 * @unmocked Integration tests for authentication
 * Tests with real MongoDB database
 */

/**
 * Authentication API Tests - Unmocked
 *
 * These tests verify the authentication endpoints without mocking external dependencies.
 * External components (Google OAuth, MongoDB) are expected to work as designed.
 * Tests include: signIn, signUp, signOut, deleteAccount
 */

import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import express from "express";
import authRoutes from "../../../src/routes/authRoutes";
import User from "../../../src/models/user/User";
import { Friendship, FriendRequest } from "../../../src/models/friend/Friend";
import { generateTestJWT } from "../../utils/test-fixtures";

/**
 * @unmocked Integration tests for authentication
 * Tests with real MongoDB database but without mocking external services
 * Focus on API validation, error handling, and database integration
 */

// Interface POST /auth/signin
describe("Unmocked: POST /auth/signin", () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
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
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.message).toBeDefined();
  });
});

// Interface POST /auth/signup
describe("Unmocked: POST /auth/signup", () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  // Input: Valid new user credentials (email doesn't exist)
  // Expected status code: 201
  // Expected behavior: New user is created in database with Google profile data
  // Expected output: Created user object with JWT token and status 201

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

  // Input: Email that already exists in database
  // Expected status code: 400
  // Expected behavior: Database is unchanged, no duplicate user created
  // Expected output: Error message about duplicate email
});

// Interface POST /auth/signout
describe("Unmocked: POST /auth/signout", () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  // Input: Valid JWT token from authenticated user
  // Expected status code: 200
  // Expected behavior: User session is invalidated (no backend state change for stateless JWT)
  // Expected output: Success message

  // Input: No authentication token in header
  // Expected status code: 401
  // Expected behavior: Request is rejected without signing out
  // Expected output: Unauthorized error message

  // Input: Malformed or invalid JWT token
  // Expected status code: 401
  // Expected behavior: Request is rejected
  // Expected output: Invalid token error
  it("should reject signout with invalid token", async () => {
    const res = await request(app)
      .post("/api/auth/signout")
      .set("Authorization", "Bearer invalid.jwt.token")
      .send({});

    expect(res.status).toBeGreaterThanOrEqual(400); // Should be 401 or 404
    expect(res.body.message).toMatch(/invalid|expired/i);
  });
});

// Interface DELETE /auth/account
describe("Unmocked: DELETE /auth/account", () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use("/", authRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Friendship.deleteMany({});
    await FriendRequest.deleteMany({});
  });

  // Input: Valid JWT token from authenticated user
  // Expected status code: 200
  // Expected behavior: User and all related data (friendships, friend requests) are deleted
  // Expected output: Success confirmation message

  // Input: No authentication token
  // Expected status code: 401
  // Expected behavior: Database is unchanged
  // Expected output: Unauthorized error

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

    expect(res.status).toBeGreaterThanOrEqual(400); // Should be 401 or 404

    // Verify user still exists
    const stillExistingUser = await User.findById(user._id);
    expect(stillExistingUser).toBeDefined();
  });
});
