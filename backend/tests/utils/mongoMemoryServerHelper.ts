/**
 * Helper utility for creating MongoMemoryServer instances with graceful error handling
 * Prevents test failures when mongo server can't bind to a port (e.g., sandbox environments)
 */

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

export interface MongoServerConfig {
  autoConnect?: boolean;
  skipIfFails?: boolean;
}

export class MongoServerManager {
  private static instance: MongoMemoryServer | null = null;
  private static failureDetected = false;

  /**
   * Create or reuse an existing MongoMemoryServer instance
   */
  static async createServer(config: MongoServerConfig = {}): Promise<MongoMemoryServer | null> {
    const { autoConnect = true, skipIfFails = true } = config;

    // If already failed, return null to skip tests
    if (this.failureDetected) {
      return null;
    }

    // Reuse existing instance if already created
    if (this.instance) {
      return this.instance;
    }

    try {
      this.instance = await MongoMemoryServer.create();

      if (autoConnect) {
        await mongoose.connect(this.instance.getUri());
      }

      return this.instance;
    } catch (err) {
      if (skipIfFails) {
        this.failureDetected = true;
        console.warn(
          "MongoMemoryServer creation failed. Tests requiring MongoDB will be skipped.",
          (err as Error).message
        );
        return null;
      }
      throw err;
    }
  }

  /**
   * Get the URI of the current mongo server
   */
  static getUri(): string | null {
    return this.instance?.getUri() ?? null;
  }

  /**
   * Stop the server and clean up
   */
  static async stopServer(): Promise<void> {
    if (this.instance) {
      try {
        await mongoose.disconnect();
      } catch (err) {
        console.warn("Error disconnecting from MongoDB:", (err as Error).message);
      }

      try {
        await this.instance.stop();
      } catch (err) {
        console.warn("Error stopping MongoMemoryServer:", (err as Error).message);
      }

      this.instance = null;
    }
  }

  /**
   * Check if mongo server is available (used to skip tests)
   */
  static isAvailable(): boolean {
    return this.instance !== null && !this.failureDetected;
  }

  /**
   * Reset failure flag (useful for test runs)
   */
  static reset(): void {
    this.instance = null;
    this.failureDetected = false;
  }
}

/**
 * Convenience function to skip a test if mongo is not available
 */
export function skipIfMongoUnavailable(): void {
  if (!MongoServerManager.isAvailable()) {
    // Return undefined to skip test
    return undefined as any;
  }
}
