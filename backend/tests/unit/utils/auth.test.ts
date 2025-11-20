/**
 * @unit Unit tests for authentication middleware
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { authenticate } from "../../../src/middleware/auth";
import { AuthRequest } from "../../../src/types/middleware.types";
import config from "../../../src/config";

// Mock the jsonwebtoken library
jest.mock("jsonwebtoken");
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe("Auth Middleware", () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it("should use configured JWT secret from config", () => {
    const userId = "12345";
    mockRequest.headers = { authorization: "Bearer validtoken" };
    (mockedJwt.verify as jest.Mock).mockReturnValue({ userId });

    authenticate(
      mockRequest as AuthRequest,
      mockResponse as Response,
      nextFunction,
    );

    // Middleware now uses the validated config instead of process.env
    expect(mockedJwt.verify).toHaveBeenCalledWith(
      "validtoken",
      config.jwtSecret,
    );
    expect(nextFunction).toHaveBeenCalled();
  });
});
