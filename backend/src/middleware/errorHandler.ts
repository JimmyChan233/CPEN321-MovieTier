import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

/**
 * Handle API errors and send error response
 * Reusable utility function for error handling
 */
const handleApiError = (
  err: Error,
  req: Request,
  res: Response,
): void => {
  logger.error("Unhandled API error", {
    method: req.method,
    url: req.originalUrl,
    error: err.message,
  });

  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

/**
 * Express error handler middleware factory
 * Creates a middleware function with the required 4-parameter signature
 * Separates the reusable error handling logic from Express framework requirements
 */
export const createErrorHandler = () => {
  // Express requires exactly 4 parameters to recognize this as an error handler
  // The _next parameter is required by Express but unused in error handlers
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (err: Error, req: Request, res: Response, _next: NextFunction) => {
    handleApiError(err, req, res);
  };
};

export const errorHandler = createErrorHandler();
