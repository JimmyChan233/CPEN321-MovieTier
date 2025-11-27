/**
 * @unit Unit tests for configuration module
 */

/**
 * Configuration Module Tests
 * Tests for environment configuration loading and defaults
 */

import dotenv from "dotenv";

// Mock dotenv to prevent loading .env file during tests
jest.mock("dotenv", () => ({
  config: jest.fn(),
}));

describe("Unit: config", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    // jest.resetModules() forces fresh require() of config, picking up new process.env values
    jest.resetModules();
    process.env = { ...OLD_ENV };
    (dotenv.config as jest.Mock).mockClear();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe("validateSecrets in production", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    it("should throw a combined error if multiple secrets are missing", () => {
      delete process.env.JWT_SECRET;
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.TMDB_API_KEY;
      expect(() => require("../../../src/config")).toThrow(
        "Configuration validation failed: JWT_SECRET is not set in environment variables, GOOGLE_CLIENT_ID is not set in environment variables, TMDB_API_KEY is not set in environment variables",
      );
    });
  });

  describe("warnings in development", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
      console.warn = jest.fn();
    });

    it("should warn if JWT_SECRET is not set", () => {
      delete process.env.JWT_SECRET;
      require("../../../src/config");
      expect(console.warn).toHaveBeenCalledWith(
        "Warning: JWT_SECRET not set. Using development default (NOT SECURE for production)",
      );
    });
  });

  describe("environment variable overrides", () => {
    it("should override PORT if provided", () => {
      process.env.PORT = "4000";
      process.env.NODE_ENV = "development";
      process.env.JWT_SECRET = "test-secret";
      const config = require("../../../src/config").default;
      expect(config.port).toBe(4000);
    });

    it("should override NODE_ENV if provided", () => {
      process.env.NODE_ENV = "test";
      process.env.JWT_SECRET = "test-secret";
      const config = require("../../../src/config").default;
      expect(config.nodeEnv).toBe("test");
    });

    it("should override MONGODB_URI if provided", () => {
      process.env.MONGODB_URI = "mongodb://custom-host:27017/customdb";
      process.env.NODE_ENV = "development";
      process.env.JWT_SECRET = "test-secret";
      const config = require("../../../src/config").default;
      expect(config.mongodbUri).toBe("mongodb://custom-host:27017/customdb");
    });

    it("should override TMDB_BASE_URL if provided", () => {
      process.env.TMDB_BASE_URL = "https://custom-tmdb.api/v3";
      process.env.NODE_ENV = "development";
      process.env.JWT_SECRET = "test-secret";
      const config = require("../../../src/config").default;
      expect(config.tmdbBaseUrl).toBe("https://custom-tmdb.api/v3");
    });
  });
});
