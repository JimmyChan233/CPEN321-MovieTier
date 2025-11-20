import mongoose from "mongoose";

/**
 * Global teardown for all tests
 * Cleans up the shared MongoMemoryServer instance
 */
const globalTeardown = async () => {
  try {
    // Get the server instance from global scope
    const mongoServer = (global as any).__MONGO_SERVER__;

    if (mongoServer) {
      try {
        await mongoose.disconnect();
      } catch (err) {
        console.warn("Error disconnecting mongoose:", (err as Error).message);
      }

      try {
        await mongoServer.stop();
        console.log("✓ MongoMemoryServer stopped");
      } catch (err) {
        console.warn("Error stopping MongoMemoryServer:", (err as Error).message);
      }
    }
  } catch (err) {
    console.error("Error in global teardown:", (err as Error).message);
  }
};

export default globalTeardown;
