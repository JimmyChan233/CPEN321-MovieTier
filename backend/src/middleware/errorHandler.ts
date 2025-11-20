import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

// Error handler requires exactly 4 params (err, req, res, next) for Express to recognize it as error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
