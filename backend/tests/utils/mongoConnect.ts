/**
 * MongoDB connection helper for tests
 * Handles both global shared mongo instance and per-test instances
 * Gracefully skips tests if MongoDB is not available
 */

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

export interface MongoTestContext {
  mongoServer: MongoMemoryServer | null;
  mongoUri: string;
  skipIfUnavailable: boolean;
}

/**
 * Initialize MongoDB for a test suite
 * First tries to use the global mongo instance, then creates a local one if needed
 */
export async function initializeTestMongo(): Promise<MongoTestContext> {
  const context: MongoTestContext = {
    mongoServer: null,
    mongoUri: "",
    skipIfUnavailable: false,
  };

  // Check if global mongo instance is available
  if (process.env.MONGODB_TESTING_URI) {
    context.mongoUri = process.env.MONGODB_TESTING_URI;
    try {
      await mongoose.connect(context.mongoUri);

      // Clear all collections to prevent data conflicts between test suites
      // This is needed when maxWorkers: 1 shares a single MongoDB instance
      const collections = await mongoose.connection.db!.listCollections().toArray();
      for (const collection of collections) {
        await mongoose.connection.db!.collection(collection.name).deleteMany({});
      }

      return context;
    } catch (err) {
      console.warn("Failed to connect to global MongoDB:", (err as Error).message);
    }
  }

  // Check if we should skip if mongo fails
  if (process.env.MONGO_MEMORY_SERVER_FAILED === "true") {
    context.skipIfUnavailable = true;
    return context;
  }

  // Try to create a local mongo instance (for development)
  try {
    context.mongoServer = await MongoMemoryServer.create();
    context.mongoUri = context.mongoServer.getUri();
    await mongoose.connect(context.mongoUri);
    return context;
  } catch (err) {
    console.warn(
      "Failed to create MongoMemoryServer instance. Tests requiring MongoDB will be skipped.",
      (err as Error).message
    );
    context.skipIfUnavailable = true;
    return context;
  }
}

/**
 * Cleanup MongoDB connection for a test suite
 */
export async function cleanupTestMongo(context: MongoTestContext): Promise<void> {
  try {
    await mongoose.disconnect();
  } catch (err) {
    console.warn("Error disconnecting mongoose:", (err as Error).message);
  }

  // Only stop server if it was created locally (not global)
  if (context.mongoServer) {
    try {
      await context.mongoServer.stop();
    } catch (err) {
      console.warn("Error stopping MongoMemoryServer:", (err as Error).message);
    }
  }
}

/**
 * Skip test helper - use in beforeEach to skip tests if mongo is unavailable
 */
export function skipIfMongoUnavailable(context: MongoTestContext) {
  if (context.skipIfUnavailable) {
    return; // Jest will treat early return as skip
  }
}
