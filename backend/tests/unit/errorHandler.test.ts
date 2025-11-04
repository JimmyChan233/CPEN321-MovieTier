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
    it('should return 500 status code', () => {
      const error = new Error('Test error');
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it('should return error message in response', () => {
      const error = new Error('Database connection failed');
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Database connection failed',
        })
      );
    });

    it('should log error with request details', () => {
      const error = new Error('Test error');
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Unhandled API error',
        expect.objectContaining({
          method: 'GET',
          url: '/api/test',
          error: 'Test error',
        })
      );
    });

    it('should use default message when error message is empty', () => {
      const error = new Error('');
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error',
        })
      );
    });
  });

  describe('Stack trace handling', () => {
    it('should include stack trace in development mode', () => {
      const oldEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Dev error');
      const errorStack = error.stack;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: errorStack,
        })
      );

      process.env.NODE_ENV = oldEnv;
    });

    it('should exclude stack trace in production mode', () => {
      const oldEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Prod error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: undefined,
        })
      );

      process.env.NODE_ENV = oldEnv;
    });

    it('should exclude stack trace when NODE_ENV is not set', () => {
      const oldEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      const error = new Error('No env error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: undefined,
        })
      );

      process.env.NODE_ENV = oldEnv;
    });
  });

  describe('Different error types', () => {
    it('should handle different HTTP methods', () => {
      const error = new Error('POST error');

      mockReq.method = 'POST';
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Unhandled API error',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle different URL paths', () => {
      const error = new Error('Friends endpoint error');

      mockReq.originalUrl = '/api/friends/request';
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Unhandled API error',
        expect.objectContaining({
          url: '/api/friends/request',
        })
      );
    });

    it('should handle errors with complex messages', () => {
      const error = new Error('MongoDB error: duplicate key on index user_email_1');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'MongoDB error: duplicate key on index user_email_1',
        })
      );
    });
  });

  describe('Response format', () => {
    it('should always return success: false', () => {
      const error = new Error('Any error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('should return correct JSON structure', () => {
      const oldEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Structural error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs).toHaveProperty('success', false);
      expect(callArgs).toHaveProperty('message', 'Structural error');
      expect(callArgs).toHaveProperty('error');

      process.env.NODE_ENV = oldEnv;
    });
  });

  describe('Edge cases', () => {
    it('should handle error with null message', () => {
      const error = new Error();
      error.message = '';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error',
        })
      );
    });

    it('should handle missing request URL', () => {
      const error = new Error('Missing URL error');

      mockReq.originalUrl = undefined;
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Unhandled API error',
        expect.objectContaining({
          url: undefined,
        })
      );
    });

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
