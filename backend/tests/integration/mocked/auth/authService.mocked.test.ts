/**
 * @mocked Mocked tests for authentication API
 * Tests with mocked external services (TMDB, SSE, FCM) and real MongoDB
 */

/**
 * Auth Service Tests - Mocked
 * Comprehensive tests for AuthService with mocked dependencies
 */

import mongoose from "mongoose";
import jwt from "jsonwebtoken";

// Mock google-auth-library BEFORE importing anything else
const mockVerifyIdToken = jest.fn();
jest.mock("google-auth-library", () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken,
    })),
  };
});

// Mock logger
jest.mock("../../../../src/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import after mocking
import { AuthService } from "../../../../src/services/auth/authService";
import User from "../../../../src/models/user/User";
import {
  initializeTestMongo,
  cleanupTestMongo,
  skipIfMongoUnavailable,
  MongoTestContext,
} from "../../../utils/mongoConnect";

describe("Mocked: AuthService", () => {
  let mongoContext: MongoTestContext;
  let authService: AuthService;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log("Skipping test suite - MongoDB unavailable");
      return;
    }

    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.JWT_SECRET = "test-jwt-secret";
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    skipIfMongoUnavailable(mongoContext);
    await User.deleteMany({});
    authService = new AuthService();
    jest.clearAllMocks();
  });

  // signIn with non-existent user
  it("should throw error when user not found", async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: "nonexistent@example.com",
        name: "New User",
        sub: "google-999",
      }),
    });

    await expect(authService.signIn("token")).rejects.toThrow(
      "User not found. Please sign up first.",
    );
  });

  // signUp with new user
  it("should create new user successfully", async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: "newuser@example.com",
        name: "New User",
        sub: "google-new",
        picture: "https://example.com/new.jpg",
      }),
    });

    const result = await authService.signUp("token");

    expect(result.user.email).toBe("newuser@example.com");
    expect(result.user.name).toBe("New User");
    expect(result.user.googleId).toBe("google-new");
    expect(result.user.profileImageUrl).toBe("https://example.com/new.jpg");
    expect(result.user.googlePictureUrl).toBe("https://example.com/new.jpg");
    expect(result.token).toBeDefined();

    // Verify user was saved to database
    const savedUser = await User.findOne({ email: "newuser@example.com" });
    expect(savedUser).toBeDefined();
  });

  // signUp with existing user
  it("should throw error when user already exists", async () => {
    await User.create({
      email: "existing@example.com",
      name: "Existing",
      googleId: "google-existing",
    });

    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: "existing@example.com",
        name: "Existing",
        sub: "google-existing",
      }),
    });

    await expect(authService.signUp("token")).rejects.toThrow(
      "User already exists. Please sign in.",
    );
  });

  // Multiple signIns for same user
  it("should handle multiple signin attempts for same user", async () => {
    await User.create({
      email: "multi@example.com",
      name: "Multi User",
      googleId: "google-multi",
    });

    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: "multi@example.com",
        name: "Multi User",
        sub: "google-multi",
      }),
    });

    const result1 = await authService.signIn("token1");

    // Add small delay to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const result2 = await authService.signIn("token2");

    // Should generate different tokens (due to different iat)
    expect(result1.token).not.toBe(result2.token);

    // But same user
    expect(result1.user.email).toBe(result2.user.email);
  });

  // verifyGoogleToken with undefined payload fields
  it("should handle undefined fields in payload gracefully", async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: undefined,
        name: "Test User",
        sub: "google-123",
      }),
    });

    await expect(authService.verifyGoogleToken("token")).rejects.toThrow(
      "Invalid Google token",
    );
  });

  // verifyGoogleToken uses email as fallback when name is missing
  it("should use email as fallback when payload.name is missing", async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: "test@example.com",
        sub: "google-123",
        // name is intentionally missing/undefined
      }),
    });

    const result = await authService.verifyGoogleToken("token");

    expect(result.email).toBe("test@example.com");
    expect(result.name).toBe("test@example.com"); // Should use email as fallback
    expect(result.googleId).toBe("google-123");
  });

  // generateToken uses default secret when JWT_SECRET not set
  it("should use default secret when JWT_SECRET is not set", () => {
    const originalSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    const authServiceWithoutSecret = new AuthService();
    const token = authServiceWithoutSecret.generateToken("user-123");

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    // Restore original
    if (originalSecret) {
      process.env.JWT_SECRET = originalSecret;
    }
  });
});
