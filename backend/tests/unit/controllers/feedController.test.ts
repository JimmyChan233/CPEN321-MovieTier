/**
 * @unit Unit tests for feed controller functions
 * Direct testing of controller functions with mock request/response objects
 */

import { Response } from "express";
import { AuthRequest } from "../../../src/types/middleware.types";
import { streamFeed } from "../../../src/controllers/feed/feedController";
import { sseService } from "../../../src/services/sse/sseService";

// Mock the SSE service
jest.mock("../../../src/services/sse/sseService", () => ({
  sseService: {
    addClient: jest.fn(),
    removeClient: jest.fn(),
  },
}));

describe("Unit: Feed Controller - streamFeed", () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockSseService: jest.Mocked<typeof sseService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock request object
    mockReq = {
      userId: undefined, // Simulate missing userId
      on: jest.fn(),
    };

    // Create mock response object
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      flushHeaders: jest.fn().mockReturnThis(),
      write: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
    };

    mockSseService = sseService as jest.Mocked<typeof sseService>;
  });

  it("should return 401 when userId is missing", async () => {
    // Call the controller function directly
    await streamFeed(mockReq as any, mockRes as any);

    // Verify the response
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Unauthorized",
    });

    // Verify SSE service was not called
    expect(mockSseService.addClient).not.toHaveBeenCalled();
    expect(mockSseService.removeClient).not.toHaveBeenCalled();
  });

  it("should set up SSE connection when userId is present", async () => {
    // Set up request with userId
    mockReq.userId = "test-user-id";

    // Mock the req.on method to simulate close event
    const closeCallback = jest.fn();
    (mockReq.on as jest.Mock).mockImplementation(
      (event: string, callback: (...args: any[]) => any) => {
        if (event === "close") {
          closeCallback.mockImplementation(callback);
        }
      },
    );

    // Call the controller function
    await streamFeed(mockReq as any, mockRes as any);

    // Verify SSE headers were set
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "text/event-stream",
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith("Cache-Control", "no-cache");
    expect(mockRes.setHeader).toHaveBeenCalledWith("Connection", "keep-alive");
    expect(mockRes.flushHeaders).toHaveBeenCalled();
    expect(mockRes.write).toHaveBeenCalledWith(
      `event: connected\n` + `data: {"ok":true}\n\n`,
    );

    // Verify SSE service was called
    expect(mockSseService.addClient).toHaveBeenCalledWith(
      "test-user-id",
      mockRes,
    );
    expect(mockReq.on).toHaveBeenCalledWith("close", expect.any(Function));
  });

  it("should handle errors gracefully", async () => {
    // Make setHeader throw an error
    mockReq.userId = "test-user-id";
    (mockRes.setHeader as jest.Mock).mockImplementation(() => {
      throw new Error("Header error");
    });

    // Call the controller function
    await streamFeed(mockReq as any, mockRes as any);

    // Verify response was ended
    expect(mockRes.end).toHaveBeenCalled();
  });

  it("should remove client on request close", async () => {
    // Set up request with userId
    mockReq.userId = "test-user-id";

    let closeCallback: Function;
    (mockReq.on as jest.Mock).mockImplementation(
      (event: string, callback: Function) => {
        if (event === "close") {
          closeCallback = callback;
        }
      },
    );

    // Call the controller function
    await streamFeed(mockReq as any, mockRes as any);

    // Simulate close event
    if (closeCallback!) {
      closeCallback();
    }

    // Verify SSE service was called to remove client
    expect(mockSseService.removeClient).toHaveBeenCalledWith(
      "test-user-id",
      mockRes,
    );
  });
});
