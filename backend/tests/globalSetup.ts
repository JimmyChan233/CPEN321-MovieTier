import { MongoMemoryServer } from "mongodb-memory-server";
import path from "path";
import fs from "fs";

/**
 * Global setup for all tests
 * Creates a shared MongoMemoryServer instance that all tests will use
 */
const globalSetup = async () => {
  try {
    // Create MongoMemoryServer instance with retry logic
    let mongoServer: MongoMemoryServer | null = null;
    let retries = 3;

    while (retries > 0 && !mongoServer) {
      try {
        mongoServer = await MongoMemoryServer.create();
        break;
      } catch (err) {
        retries--;
        if (retries === 0) {
          console.warn(
            "Failed to create MongoMemoryServer after 3 retries. Tests will skip MongoDB-dependent tests.",
          );
          process.env.MONGO_MEMORY_SERVER_FAILED = "true";
          return;
        }
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (mongoServer) {
      const mongoUri = mongoServer.getUri();

      // Store MongoDB URI in environment variable for all tests
      process.env.MONGODB_TESTING_URI = mongoUri;
      (global as any).__MONGO_URI__ = mongoUri;
      (global as any).__MONGO_SERVER__ = mongoServer;

      console.log(`✓ MongoMemoryServer started on ${mongoUri}`);
    }
  } catch (err) {
    console.error("Failed to setup MongoDB:", (err as Error).message);
    process.env.MONGO_MEMORY_SERVER_FAILED = "true";
  }
};

export default globalSetup;
