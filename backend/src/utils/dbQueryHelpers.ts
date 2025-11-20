/**
 * Database query helpers to reduce duplication
 * Consolidates common query patterns across controllers
 */

import mongoose from "mongoose";

/**
 * Safely convert string to MongoDB ObjectId
 */
export const toObjectId = (id: string): mongoose.Types.ObjectId => {
  return new mongoose.Types.ObjectId(id);
};

/**
 * Generic try-catch wrapper for async operations
 * Reduces repetitive try-catch blocks
 */
export const safeExecute = async <T>(
  operation: () => Promise<T>,
  fallback: T,
): Promise<T> => {
  try {
    return await operation();
  } catch {
    return fallback;
  }
};

/**
 * Safely try an operation without returning a fallback
 * Used when we just want to ignore errors silently
 */
export const safeIgnore = async (operation: () => Promise<void>): Promise<void> => {
  try {
    await operation();
  } catch {
    // Silently ignore errors
  }
};

/**
 * Transform array of database objects with populate relationships
 * Common pattern in friend requests, comments, etc.
 */
export const transformWithPopulate = <T, R>(
  items: T[],
  transformer: (item: T) => R,
): R[] => {
  return items.map(transformer);
};

/**
 * Build MongoDB field selection string
 * Used for populate() to limit returned fields
 */
export const buildFieldSelection = (fields: string[]): string => {
  return fields.join(" ");
};

export default {
  toObjectId,
  safeExecute,
  safeIgnore,
  transformWithPopulate,
  buildFieldSelection,
};
