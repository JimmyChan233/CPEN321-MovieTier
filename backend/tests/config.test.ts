
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



  describe('validateSecrets in production', () => {
    beforeEach(() => {
        process.env.NODE_ENV = 'production';
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

  });
});
