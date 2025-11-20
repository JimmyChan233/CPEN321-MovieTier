/**
 * Validation utilities to reduce duplication across controllers
 * Consolidates common validation patterns
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MONGO_ID_REGEX = /^[0-9a-f]{24}$/i;

/**
 * Validate email format
 */
export const isValidEmail = (email: unknown): email is string => {
  return typeof email === "string" && EMAIL_REGEX.test(email);
};

/**
 * Validate MongoDB ObjectId format
 */
export const isValidMongoId = (id: unknown): id is string => {
  return typeof id === "string" && MONGO_ID_REGEX.test(id);
};

/**
 * Validate string input (non-empty)
 */
export const isValidString = (
  value: unknown,
  minLength = 1,
): value is string => {
  return typeof value === "string" && value.trim().length >= minLength;
};

/**
 * Validate number input
 */
export const isValidNumber = (value: unknown): value is number => {
  return typeof value === "number" && !isNaN(value);
};

/**
 * Validate boolean input
 */
export const isValidBoolean = (value: unknown): value is boolean => {
  return typeof value === "boolean";
};

/**
 * Validate search query (min 2 chars)
 */
export const isValidSearchQuery = (query: unknown): query is string => {
  return isValidString(query, 2);
};

/**
 * Extract and validate userId from request (common pattern)
 */
export const validateUserId = (userId: unknown): userId is string => {
  return typeof userId === "string" && userId.length > 0;
};

export default {
  isValidEmail,
  isValidMongoId,
  isValidString,
  isValidNumber,
  isValidBoolean,
  isValidSearchQuery,
  validateUserId,
};
