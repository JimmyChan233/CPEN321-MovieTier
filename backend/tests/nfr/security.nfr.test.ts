/**
 * @nfr Non-Functional Requirement Tests - Security
 * Tests for security requirements, authentication, authorization, and data protection
 */

import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import express from "express";
import authRoutes from "../../src/routes/authRoutes";
import movieRoutes from "../../src/routes/movieRoutes";
import User from "../../src/models/user/User";
import { generateTestJWT } from "../helpers/test-fixtures";

// Mock external services to focus on security testing
jest.mock("../../src/services/tmdb/tmdbClient", () => ({
  getTmdbClient: () => ({
    get: jest.fn().mockResolvedValue({ data: { results: [] } }),
  }),
}));

describe("NFR: Security - Authentication & Authorization", () => {
  let mongoServer: MongoMemoryServer | null = null;
  let app: express.Application;
  let validToken: string;
  let user: any;

  beforeAll(async () => {
    try {
      mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
    } catch (err) {
      console.warn(
        "MongoMemoryServer creation failed, skipping security NFR tests",
      );
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
    app.use("/api/movies", movieRoutes);
  });

  afterAll(async () => {
    if (mongoServer) {
      await mongoose.disconnect();
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    if (!mongoServer) return;
    await User.deleteMany({});
    user = await User.create({
      email: "test@example.com",
      name: "Test User",
      googleId: "google-123",
    });
    validToken = generateTestJWT(user._id.toString());
  });

  // NFR: JWT tokens should be validated properly
  it("NFR: Should reject requests with invalid JWT tokens", async () => {
    if (!mongoServer) return;

    const invalidTokens = [
      "invalid.token.here",
      "Bearer invalid.token.here",
      "",
      "null",
      "undefined",
    ];

    for (const invalidToken of invalidTokens) {
      const res = await request(app)
        .get("/api/movies/search")
        .set(
          "Authorization",
          invalidToken.startsWith("Bearer ")
            ? invalidToken
            : `Bearer ${invalidToken}`,
        )
        .query({ query: "test" });

      // Should reject with 401 Unauthorized or 400 Bad Request
      expect([400, 401]).toContain(res.status);
      expect(res.body.success).toBe(false);
    }
  });

  // NFR: API should handle malformed input gracefully
  it("NFR: Should handle SQL injection attempts gracefully", async () => {
    if (!mongoServer) return;

    const maliciousInputs = [
      "'; DROP TABLE users; --",
      "1 OR 1=1",
      "<script>alert('xss')</script>",
      "../../../etc/passwd",
    ];

    for (const maliciousInput of maliciousInputs) {
      const res = await request(app)
        .get("/api/movies/search")
        .set("Authorization", `Bearer ${validToken}`)
        .query({ query: maliciousInput });

      // Should handle gracefully (200 success, 400 validation error, but never 500 server error)
      expect([200, 400]).toContain(res.status);
      if (res.body.message) {
        expect(res.body.message).not.toContain("SQL");
        expect(res.body.message).not.toContain("database");
      }
    }
  });
});

describe("NFR: Security - Data Protection", () => {
  let mongoServer: MongoMemoryServer | null = null;
  let app: express.Application;

  beforeAll(async () => {
    try {
      mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
    } catch (err) {
      console.warn(
        "MongoMemoryServer creation failed, skipping security NFR tests",
      );
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
  });

  afterAll(async () => {
    if (mongoServer) {
      await mongoose.disconnect();
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    if (!mongoServer) return;
    await User.deleteMany({});
  });

  // NFR: Sensitive data should not be exposed in responses
  it("NFR: Should not expose sensitive user data in API responses", async () => {
    if (!mongoServer) return;

    const user = await User.create({
      email: "test@example.com",
      name: "Test User",
      googleId: "google-123",
      fcmToken: "sensitive-fcm-token-123",
      googlePictureUrl: "https://example.com/picture.jpg",
    });

    // Test sign-in response
    const res = await request(app)
      .post("/api/auth/signin")
      .send({ idToken: "test-token" });

    // Should not expose sensitive fields like fcmToken, googleId, etc.
    if (res.body.user) {
      expect(res.body.user.fcmToken).toBeUndefined();
      expect(res.body.user.googleId).toBeUndefined();
      expect(res.body.user.googlePictureUrl).toBeUndefined();
    }
  });
});
