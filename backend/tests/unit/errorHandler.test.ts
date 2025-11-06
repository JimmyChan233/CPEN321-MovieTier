import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../src/middleware/errorHandler';
import { logger } from '../../src/utils/logger';

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('errorHandler middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock response methods
    jsonMock = jest.fn().mockReturnValue(undefined);
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRes = {
      status: statusMock,
    };

    mockReq = {
      method: 'GET',
      originalUrl: '/api/test',
    };

    mockNext = jest.fn();
  });

  describe('Basic error handling', () => {
    it('should log error with correct details', () => {
      const error = new Error('Test error');
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Unhandled API error', expect.objectContaining({
        method: 'GET',
        url: '/api/test',
      }));
    });
  });

  describe('Stack trace handling', () => {
    it('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Development error');
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const response = jsonMock.mock.calls[0][0];
      expect(response.error).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should NOT include stack trace in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Production error');
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const response = jsonMock.mock.calls[0][0];
      expect(response.error).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Different error types', () => {
    it('should handle error with empty message', () => {
      const error = new Error('');
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalled();
    });
  });

  describe('Response format', () => {
    it('should return success: false in response', () => {
      const error = new Error('Test error');
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const response = jsonMock.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.message).toBeDefined();
    });
  });

  describe('Edge cases', () => {


    it('should handle multiple errors in sequence', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      errorHandler(error1, mockReq as Request, mockRes as Response, mockNext);
      errorHandler(error2, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledTimes(2);
      expect(statusMock).toHaveBeenCalledTimes(2);
      expect(jsonMock).toHaveBeenCalledTimes(2);
    });
  });
});
