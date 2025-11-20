import { Response } from "express";

/**
 * Unified response handler to reduce duplication
 * Provides consistent JSON response structure across all controllers
 */

/**
 * Send a success response
 * Supports optional metadata fields that will be merged into the top level
 * Example: sendSuccess(res, movie, 200, { status: "added" })
 * Returns: { success: true, status: "added", data: movie }
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  metadata?: Record<string, unknown>,
): Response => {
  const response: Record<string, unknown> = { success: true };
  if (metadata) {
    Object.assign(response, metadata);
  }
  response.data = data;
  return res.status(statusCode).json(response);
};

/**
 * Send an error response
 */
export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
): Response => {
  return res.status(statusCode).json({ success: false, message });
};

/**
 * Common error messages (reduces string duplication)
 */
export const ErrorMessages = {
  UNAUTHORIZED: "Unauthorized",
  INVALID_INPUT: "Invalid input",
  NOT_FOUND: "Not found",
  CONFLICT: "Resource already exists",
  INTERNAL_ERROR: "An error occurred. Please try again",
  INVALID_EMAIL: "Invalid email format",
  EMAIL_REQUIRED: "Email is required",
  USER_NOT_FOUND: "User not found",
  ALREADY_FRIENDS: "Already friends with this user",
  CANNOT_SELF_REQUEST: "Cannot send a friend request to yourself",
  REQUEST_ALREADY_SENT: "Friend request already sent",
  FRIEND_REQUEST_PENDING: "A request from this user is already pending. Please accept it.",
  TOO_MANY_REQUESTS: "Too many requests. Please try again later.",
  FAILED_GET_FRIENDS: "Failed to get friends",
  FAILED_GET_REQUESTS: "Failed to get requests",
  FAILED_GET_OUTGOING: "Failed to get outgoing requests",
  FAILED_SEND_REQUEST: "Unable to send friend request. Please try again",
  FAILED_RESPOND_REQUEST: "Unable to respond to friend request",
  FAILED_REMOVE_FRIEND: "Failed to remove friend",
  FAILED_GET_FEED: "Unable to load feed",
  FAILED_LIKE: "Failed to like activity",
  FAILED_UNLIKE: "Failed to unlike activity",
  FAILED_COMMENT: "Failed to add comment",
  FAILED_DELETE_COMMENT: "Failed to delete comment",
  FAILED_RANK_MOVIE: "Unable to add movie to ranking",
  FAILED_COMPARE: "Unable to compare movies",
  FAILED_GET_RANKED: "Failed to get ranked movies",
  FAILED_DELETE_RANKED: "Failed to delete ranked movie",
  FAILED_SEARCH: "Failed to search movies",
  FAILED_GET_WATCHLIST: "Failed to get watchlist",
  FAILED_ADD_WATCHLIST: "Failed to add to watchlist",
  FAILED_REMOVE_WATCHLIST: "Failed to remove from watchlist",
  FAILED_GET_RECOMMENDATIONS: "Failed to get recommendations",
  FAILED_PROFILE_UPDATE: "Failed to update profile",
} as const;

/**
 * HTTP status codes enum for clarity
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
}

export default {
  sendSuccess,
  sendError,
  ErrorMessages,
  HttpStatus,
};
