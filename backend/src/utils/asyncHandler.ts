import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps async route handlers to properly catch promise rejections
 * and pass them to Express error handling middleware.
 * 
 * This prevents "Promise returned in function argument where a void return was expected"
 * ESLint errors and ensures proper error handling for async routes.
 * 
 * @param fn - Async route handler function
 * @returns Express RequestHandler that properly handles promise rejections
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch((err: unknown) => next(err));
  };
};
