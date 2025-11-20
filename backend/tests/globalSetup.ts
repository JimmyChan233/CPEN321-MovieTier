import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

const globalSetup = async () => {
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Store the server instance and URI in a temporary file
  const tempDir = path.join(__dirname, ".tmp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  fs.writeFileSync(
    path.join(tempDir, "mongo-server-instance"),
    JSON.stringify(mongoServer),
  );

  // Set the global variable for the test environment
  (global as any).__MONGO_URI__ = mongoUri;
  process.env.MONGO_URI_FOR_TESTS = mongoUri;
};

export default globalSetup;
