/**
 * @unit Unit tests for async request handler wrapper
 */

/**
 * Async Handler Utility Tests
 * Tests for asyncHandler wrapper that catches async errors in Express routes
 */

import { asyncHandler } from "../../../src/utils/asyncHandler";
import { Request, Response, NextFunction } from "express";

describe("Unit: asyncHandler", () => {
  it("should call next with an error if the async function rejects", async () => {
    const errorMessage = "Test error";
    // asyncHandler must catch errors from async route handlers and pass to next()
    // This prevents unhandled promise rejections in Express
    const asyncFn = async (req: Request, res: Response, next: NextFunction) => {
      throw new Error(errorMessage);
    };

    const handler = asyncHandler(asyncFn);

    const req = {} as Request;
    const res = {} as Response;
    const next = jest.fn() as NextFunction;

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(new Error(errorMessage));
  });
});
