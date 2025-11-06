import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, AuthRequest } from '../src/middleware/auth';

// Mock the jsonwebtoken library
jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Middleware', () => {
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




  it('should use default secret if JWT_SECRET is not in environment', () => {
    const originalSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    const userId = '12345';
    mockRequest.headers = { authorization: 'Bearer validtoken' };
    (mockedJwt.verify as jest.Mock).mockReturnValue({ userId });

    authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockedJwt.verify).toHaveBeenCalledWith('validtoken', 'default_secret');
    expect(nextFunction).toHaveBeenCalled();

    process.env.JWT_SECRET = originalSecret; // Restore for other tests
  });
});