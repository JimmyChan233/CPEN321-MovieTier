/**
 * @mocked Mocked tests for authentication API
 * Tests with mocked external services (Google OAuth, JWT) and real MongoDB
 */

/**
 * Authentication API Tests - Mocked
 *
 * These tests verify error handling and edge cases using mocks for external dependencies
 * (Google OAuth, JWT library, database errors). Tests include: signIn, signUp, signOut, deleteAccount
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
import { AuthService } from "../../../../src/services/auth/authService";
import { generateTestJWT } from "../../../helpers/test-fixtures";
import {
  initializeTestMongo,
  cleanupTestMongo,
  skipIfMongoUnavailable,
  MongoTestContext,
} from "../../../helpers/mongoConnect";

// Mock the Google OAuth verification with different tokens for different scenarios
const mockTokenMap: Record<
  string,
  { email: string; name: string; googleId: string; picture?: string }
> = {
  "mock-valid-token": {
    email: "test@example.com",
    name: "Test User",
    googleId: "google-123",
    picture: "https://example.com/image.jpg",
  },
  "mock-nonexistent-token": {
    email: "nonexistent@example.com",
    name: "New User",
    googleId: "google-999",
    picture: undefined,
  },
  "mock-new-user-token": {
    email: "newuser@example.com",
    name: "New User",
    googleId: "google-new-123",
    picture: "https://example.com/new.jpg",
  },
  "mock-existing-user-token": {
    email: "existing@example.com",
    name: "Different User",
    googleId: "google-different",
    picture: undefined,
  },
};

jest
  .spyOn(AuthService.prototype, "verifyGoogleToken")
  .mockImplementation(async (idToken: string) => {
    const mockData = mockTokenMap[idToken];
    if (mockData) {
      return mockData;
    }
    throw new Error("Invalid Google token");
  });

// Interface POST /auth/signin
describe("Mocked: POST /auth/signin", () => {
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    skipIfMongoUnavailable(mongoContext);
    await User.deleteMany({});
  });

  it("should successfully sign in existing user with valid token", async () => {
    // Create user in database first
    await User.create({
      email: "test@example.com",
      name: "Test User",
      googleId: "google-123",
    });

    const res = await request(app)
      .post("/api/auth/signin")
      .send({ idToken: "mock-valid-token" });

    expect(res.status).toStrictEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe("test@example.com");
    expect(res.body.user.name).toBe("Test User");
    expect(res.body.token).toBeDefined();
  });

  it("should reject signin for non-existent user", async () => {
    const res = await request(app)
      .post("/api/auth/signin")
      .send({ idToken: "mock-nonexistent-token" });

    expect(res.status).toStrictEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/User not found/);
  });

  it("should reject signin with invalid token", async () => {
    const res = await request(app)
      .post("/api/auth/signin")
      .send({ idToken: "invalid-token" });

    expect(res.status).toStrictEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid Google token/);
  });

  it("should reject signin without idToken", async () => {
    const res = await request(app).post("/api/auth/signin").send({
      email: "test@example.com",
      name: "Test User",
    });

    expect(res.status).toStrictEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/idToken|required/i);
  });

  it("should handle signin error without message property", async () => {
    jest
      .spyOn(AuthService.prototype, "verifyGoogleToken")
      .mockRejectedValueOnce({});

    const res = await request(app).post("/api/auth/signin").send({
      idToken: "mock-valid-token",
    });

    expect(res.status).toStrictEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Unable to sign in. Please try again");
  });
});

// Interface POST /auth/signup
describe("Mocked: POST /auth/signup", () => {
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    skipIfMongoUnavailable(mongoContext);
    await User.deleteMany({});
  });

  it("should successfully sign up new user with valid token", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ idToken: "mock-new-user-token" });

    expect(res.status).toStrictEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe("newuser@example.com");
    expect(res.body.user.name).toBe("New User");
    expect(res.body.token).toBeDefined();

    // Verify user was saved to database
    const savedUser = await User.findOne({ email: "newuser@example.com" });
    expect(savedUser).toBeDefined();
    expect(savedUser?.googleId).toBe("google-new-123");
  });

  it("should reject signup for existing user", async () => {
    // Create user first
    await User.create({
      email: "existing@example.com",
      name: "Existing User",
      googleId: "google-existing",
    });

    const res = await request(app)
      .post("/api/auth/signup")
      .send({ idToken: "mock-existing-user-token" });

    expect(res.status).toStrictEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/User already exists/);
  });

  it("should reject signup without idToken", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      email: "newuser@example.com",
      name: "New User",
    });

    expect(res.status).toStrictEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/idToken|required/i);
  });
});

// Interface POST /auth/signout
describe("Mocked: POST /auth/signout", () => {
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
    app.use("/api/auth", authRoutes);
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    skipIfMongoUnavailable(mongoContext);
    await User.deleteMany({});
    user = await User.create({
      email: "test@example.com",
      name: "Test User",
      googleId: "google-123",
    });
    token = generateTestJWT(user._id.toString());
  });

  it("should successfully sign out with valid token", async () => {
    const res = await request(app)
      .post("/api/auth/signout")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toStrictEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Signed out successfully/i);
  });

  it("should reject signout with invalid token", async () => {
    const res = await request(app)
      .post("/api/auth/signout")
      .set("Authorization", "Bearer invalid.token.here")
      .send({});

    expect(res.status).toStrictEqual(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid|expired/i);
  });

  it("should reject signout without token", async () => {
    const res = await request(app).post("/api/auth/signout").send({});

    expect(res.status).toStrictEqual(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/No authentication token/i);
  });
});

// Interface DELETE /auth/account
describe("Mocked: DELETE /auth/account", () => {
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
    app.use("/api/auth", authRoutes);
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    skipIfMongoUnavailable(mongoContext);
    await User.deleteMany({});
    await Friendship.deleteMany({});
    await FriendRequest.deleteMany({});

    user = await User.create({
      email: "test@example.com",
      name: "Test User",
      googleId: "google-123",
    });
    token = generateTestJWT(user._id.toString());
  });

  it("should successfully delete account with valid token", async () => {
    const res = await request(app)
      .delete("/api/auth/account")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toStrictEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Account deleted successfully/i);

    // Verify user was deleted from database
    const deletedUser = await User.findById(user._id);
    expect(deletedUser).toBeNull();
  });

  it("should reject account deletion with invalid token", async () => {
    const res = await request(app)
      .delete("/api/auth/account")
      .set("Authorization", "Bearer invalid.token.here")
      .send({});

    expect(res.status).toStrictEqual(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid|expired/i);

    // Verify user still exists
    const stillExistingUser = await User.findById(user._id);
    expect(stillExistingUser).toBeDefined();
  });

  it("should reject account deletion without token", async () => {
    const res = await request(app).delete("/api/auth/account").send({});

    expect(res.status).toStrictEqual(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/No authentication token/i);
  });
});

// Service-level mocked tests (mocking AuthService methods)
describe("Mocked: POST /auth/signup (service level)", () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should successfully sign up with valid credentials", async () => {
    const mockUser = {
      _id: "new-user-123",
      email: "newuser@example.com",
      name: "New User",
      profileImageUrl: "https://example.com/newpic.jpg",
    };

    jest.spyOn(AuthService.prototype, "signUp").mockResolvedValueOnce({
      user: mockUser as any,
      token: "mock-jwt-token-signup",
    });

    const res = await request(app).post("/api/auth/signup").send({
      idToken: "valid-google-token",
    });

    expect(res.status).toStrictEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.token).toBe("mock-jwt-token-signup");
    expect(res.body.user.email).toBe("newuser@example.com");
  });

  it("should handle errors without a message property during sign-up", async () => {
    jest.spyOn(AuthService.prototype, "signUp").mockRejectedValueOnce({});

    const res = await request(app).post("/api/auth/signup").send({
      idToken: "valid-google-token",
    });

    expect(res.status).toStrictEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Unable to sign up. Please try again");
  });
});

// Service-level mocked tests (mocking token validation)
describe("Mocked: POST /auth/signout (service level)", () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should reject signout with expired token", async () => {
    const expiredToken = generateTestJWT("user-id");
    jest
      .useFakeTimers()
      .setSystemTime(new Date().getTime() + 31 * 24 * 60 * 60 * 1000);

    const res = await request(app)
      .post("/api/auth/signout")
      .set("Authorization", `Bearer ${expiredToken}`)
      .send({});

    jest.useRealTimers();
    expect(res.status).toStrictEqual(401);
  });
});

// Service-level mocked tests (mocking account deletion)
describe("Mocked: DELETE /auth/account (service level)", () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should reject deletion when userId is not set on request", async () => {
    // Import the controller directly
    const {
      deleteAccount,
    } = require("../../../../src/controllers/auth/authController");

    const mockReq = {
      userId: undefined, // Explicitly undefined
    } as any;

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any;

    await deleteAccount(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Unauthorized",
    });
  });

  it("should handle errors without a message property during account deletion", async () => {
    jest.spyOn(User, "findByIdAndDelete").mockRejectedValueOnce({});

    const res = await request(app)
      .delete("/api/auth/account")
      .set("Authorization", `Bearer ${generateTestJWT("test-user-id")}`)
      .send({});

    expect(res.status).toStrictEqual(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Unable to delete account. Please try again");
  });
});
