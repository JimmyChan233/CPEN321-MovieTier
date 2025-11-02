
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import path from 'path';

const globalTeardown = async () => {
  const tempDir = path.join(__dirname, '.tmp');
  const instancePath = path.join(tempDir, 'mongo-server-instance');

  try {
    const mongoServerJson = fs.readFileSync(instancePath, 'utf8');
    const mongoServer = MongoMemoryServer.fromJSON(mongoServerJson);
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error('Error stopping MongoDB memory server:', error);
  } finally {
    // Clean up the temporary file and directory
    if (fs.existsSync(instancePath)) {
      fs.unlinkSync(instancePath);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }
  }
};

export default globalTeardown;
