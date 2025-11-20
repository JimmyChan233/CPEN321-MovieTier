/**
 * @unit Unit tests for responseHandler utility
 */

/**
 * Response Handler Utility Tests
 * Tests for sendSuccess and sendError utility functions
 */

import { Response } from "express";
import {
  sendSuccess,
  sendError,
  ErrorMessages,
  HttpStatus,
} from "../../../src/utils/responseHandler";

describe("Unit: responseHandler", () => {
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    // Mock Express response chaining: res.status(200).json(data)
    jsonMock = jest.fn().mockReturnValue({});
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    res = {
      status: statusMock,
    };
  });

  describe("sendSuccess", () => {
    it("should send success response with data", () => {
      const data = { id: 1, name: "test" };
      sendSuccess(res as Response, data);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data,
      });
    });

    it("should send success response with custom status code", () => {
      const data = { id: 1 };
      sendSuccess(res as Response, data, 201);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data,
      });
    });

    it("should send success response with metadata fields", () => {
      const data = { rank: 1 };
      const metadata = { status: "added", fallback: false };
      sendSuccess(res as Response, data, 200, metadata);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        status: "added",
        fallback: false,
        data,
      });
    });

    it("should merge multiple metadata fields with data", () => {
      const data = { value: "test" };
      const metadata = { status: "compare", extra: "field" };
      sendSuccess(res as Response, data, 200, metadata);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        status: "compare",
        extra: "field",
        data,
      });
    });

    it("should handle null data", () => {
      sendSuccess(res as Response, null);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: null,
      });
    });

    it("should handle metadata with null value", () => {
      const data = { id: 1 };
      const metadata = { message: null as any };
      sendSuccess(res as Response, data, 200, metadata);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: null,
        data,
      });
    });
  });

  describe("sendError", () => {
    it("should send error response with message", () => {
      sendError(res as Response, "Test error");

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Test error",
      });
    });

    it("should send error response with custom status code", () => {
      sendError(res as Response, "Not found", 404);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Not found",
      });
    });

    it("should send error response with 400 status", () => {
      sendError(res as Response, "Bad request", HttpStatus.BAD_REQUEST);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Bad request",
      });
    });
  });

  describe("ErrorMessages", () => {
    it("should have all required error messages", () => {
      expect(ErrorMessages.UNAUTHORIZED).toBeDefined();
      expect(ErrorMessages.INVALID_INPUT).toBeDefined();
      expect(ErrorMessages.NOT_FOUND).toBeDefined();
      expect(ErrorMessages.CONFLICT).toBeDefined();
      expect(ErrorMessages.INTERNAL_ERROR).toBeDefined();
      expect(ErrorMessages.FAILED_GET_FEED).toBe("Unable to load feed");
    });

    it("should be immutable (readonly)", () => {
      const messages = { ...ErrorMessages };
      expect(messages.UNAUTHORIZED).toEqual(ErrorMessages.UNAUTHORIZED);
    });
  });

  describe("HttpStatus", () => {
    it("should have all required status codes", () => {
      expect(HttpStatus.OK).toBe(200);
      expect(HttpStatus.CREATED).toBe(201);
      expect(HttpStatus.BAD_REQUEST).toBe(400);
      expect(HttpStatus.UNAUTHORIZED).toBe(401);
      expect(HttpStatus.FORBIDDEN).toBe(403);
      expect(HttpStatus.NOT_FOUND).toBe(404);
      expect(HttpStatus.CONFLICT).toBe(409);
      expect(HttpStatus.TOO_MANY_REQUESTS).toBe(429);
      expect(HttpStatus.INTERNAL_SERVER_ERROR).toBe(500);
    });
  });
});
