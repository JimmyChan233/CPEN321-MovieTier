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



  });

  describe('Stack trace handling', () => {


  });

  describe('Different error types', () => {


  });

  describe('Response format', () => {

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
