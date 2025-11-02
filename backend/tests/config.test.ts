
import dotenv from 'dotenv';

// Mock dotenv to prevent loading .env file during tests
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('config', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    (dotenv.config as jest.Mock).mockClear();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('should use default values when no env variables are set', () => {
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.MONGODB_URI;
    delete process.env.JWT_SECRET;
    delete process.env.TMDB_BASE_URL;

    const configModule = require('../src/config').default;

    expect(configModule.port).toBe(3000);
    expect(configModule.nodeEnv).toBe('development');
    expect(configModule.mongodbUri).toBe('mongodb://localhost:27017/movietier');
    expect(configModule.jwtSecret).toBe('dev-secret-key-change-in-production');
    expect(configModule.tmdbBaseUrl).toBe('https://api.themoviedb.org/3');
  });

  it('should use env variables when they are set', () => {
    process.env.PORT = '4000';
    process.env.NODE_ENV = 'production';
    process.env.MONGODB_URI = 'mongodb://test';
    process.env.JWT_SECRET = 'test-secret';
    process.env.TMDB_API_KEY = 'test-api-key';
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.TMDB_BASE_URL = 'https://test.api';

    const configModule = require('../src/config').default;

    expect(configModule.port).toBe(4000);
    expect(configModule.nodeEnv).toBe('production');
    expect(configModule.mongodbUri).toBe('mongodb://test');
    expect(configModule.jwtSecret).toBe('test-secret');
    expect(configModule.tmdbApiKey).toBe('test-api-key');
    expect(configModule.googleClientId).toBe('test-client-id');
    expect(configModule.tmdbBaseUrl).toBe('https://test.api');
  });

  describe('validateSecrets in production', () => {
    beforeEach(() => {
        process.env.NODE_ENV = 'production';
    });

    it('should throw an error if JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;
      process.env.GOOGLE_CLIENT_ID = 'test';
      process.env.TMDB_API_KEY = 'test';
      expect(() => require('../src/config')).toThrow('Configuration validation failed: JWT_SECRET is not set in environment variables');
    });

    it('should throw an error if GOOGLE_CLIENT_ID is not set', () => {
      process.env.JWT_SECRET = 'test';
      delete process.env.GOOGLE_CLIENT_ID;
      process.env.TMDB_API_KEY = 'test';
      expect(() => require('../src/config')).toThrow('Configuration validation failed: GOOGLE_CLIENT_ID is not set in environment variables');
    });

    it('should throw an error if TMDB_API_KEY is not set', () => {
      process.env.JWT_SECRET = 'test';
      process.env.GOOGLE_CLIENT_ID = 'test';
      delete process.env.TMDB_API_KEY;
      expect(() => require('../src/config')).toThrow('Configuration validation failed: TMDB_API_KEY is not set in environment variables');
    });

    it('should throw a combined error if multiple secrets are missing', () => {
        delete process.env.JWT_SECRET;
        delete process.env.GOOGLE_CLIENT_ID;
        delete process.env.TMDB_API_KEY;
        expect(() => require('../src/config')).toThrow('Configuration validation failed: JWT_SECRET is not set in environment variables, GOOGLE_CLIENT_ID is not set in environment variables, TMDB_API_KEY is not set in environment variables');
    });
  });

  describe('warnings in development', () => {
    beforeEach(() => {
        process.env.NODE_ENV = 'development';
        console.warn = jest.fn();
    });

    it('should warn if JWT_SECRET is not set', () => {
        delete process.env.JWT_SECRET;
        require('../src/config');
        expect(console.warn).toHaveBeenCalledWith('Warning: JWT_SECRET not set. Using development default (NOT SECURE for production)');
    });

    it('should not warn if JWT_SECRET is set', () => {
        process.env.JWT_SECRET = 'a-secret';
        require('../src/config');
        expect(console.warn).not.toHaveBeenCalled();
    });
  });
});
