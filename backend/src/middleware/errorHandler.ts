import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

// Error handler requires exactly 4 params (err, req, res, next) for Express to recognize it as error handler
// The _next parameter is intentionally unused but required by Express middleware signature
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
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
