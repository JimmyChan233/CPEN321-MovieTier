/**
 * @mocked Mocked tests for external services
 * Tests with mocked external services (TMDB, SSE, FCM) and real MongoDB
 */

/**
 * SSE Authentication Edge Case Tests
 * Tests the defensive userId validation in SSE stream handlers
 */

// Mock the authenticate middleware BEFORE importing routes
jest.mock("../../../src/middleware/auth", () => {
  const original = jest.requireActual("../../src/middleware/auth");
  return {
    ...original,
    // Export a mockable authenticate function
    authenticate: jest.fn((req: any, res: any, next: any) => {
      // Default: set userId (will be overridden in specific tests)
      req.userId = "default-user-id";
      next();
    }),
    AuthRequest: original.AuthRequest,
  };
});

// Mock SSE service
jest.mock("../../../src/services/sse/sseService", () => ({
  sseService: {
    addClient: jest.fn(),
    removeClient: jest.fn(),
    send: jest.fn(),
  },
}));

// Mock notification service
jest.mock("../../../src/services/notification.service", () => ({
  __esModule: true,
  default: {
    sendLikeNotification: jest.fn(),
    sendCommentNotification: jest.fn(),
    sendFriendRequestNotification: jest.fn(),
    sendFriendRequestAcceptedNotification: jest.fn(),
  },
}));

import request from "supertest";
import express from "express";

describe("SSE Stream - userId Validation Edge Cases", () => {
  let app: express.Application;
  let authenticate: jest.Mock;

  beforeEach(() => {
    // Get the mocked authenticate function
    authenticate = require("../../../src/middleware/auth")
      .authenticate as jest.Mock;

    // Reset to default behavior
    authenticate.mockImplementation((req: any, res: any, next: any) => {
      req.userId = "default-user-id";
      next();
    });

    // Create fresh app for each test
    app = express();
    app.use(express.json());
  });

  describe("Feed Routes - SSE /stream", () => {
    it("should return 401 when userId is undefined (lines 256-257)", async () => {
      // Mock authenticate to NOT set userId (edge case)
      authenticate.mockImplementation((req: any, res: any, next: any) => {
        req.userId = undefined;
        next();
      });

      // Import routes AFTER mocking
      const feedRoutes = require("../../../src/routes/feedRoutes").default;
      app.use("/api/feed", feedRoutes);

      const res = await request(app).get("/api/feed/stream");

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });
  });

  describe("Friend Routes - SSE /stream", () => {
    it("should return 401 when userId is undefined (lines 320-321)", async () => {
      // Mock authenticate to NOT set userId (edge case)
      authenticate.mockImplementation((req: any, res: any, next: any) => {
        req.userId = undefined;
        next();
      });

      // Import routes AFTER mocking
      const friendRoutes = require("../../../src/routes/friendRoutes").default;
      app.use("/api/friends", friendRoutes);

      const res = await request(app).get("/api/friends/stream");

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });
  });
});
