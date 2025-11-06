/**
 * Final Branch Coverage Tests
 * Targeting the last 5.4% of uncovered branches
 */

import { logger } from '../../src/utils/logger';

describe('Final Branch Coverage', () => {
  let stdoutWriteSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
  });

  describe('Config NODE_ENV fallback', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    it('should use production when NODE_ENV is set to production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const config = require('../../src/config').default;
      expect(config.nodeEnv).toBe('production');
      if (originalEnv) process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Logger - Additional HTTP Scenarios', () => {
    it('should handle http with very large status code', () => {
      logger.http('GET', '/test', 599, 999);
      const output = stdoutWriteSpy.mock.calls[0][0] as string;
      expect(output).toContain('599');
      expect(output).toContain('999');
    });

    it('should handle http with 1ms duration', () => {
      logger.http('GET', '/test', 200, 1);
      const output = stdoutWriteSpy.mock.calls[0][0] as string;
      expect(output).toContain('1');
    });

    it('should handle http with high status code 503', () => {
      logger.http('GET', '/test', 503, 500);
      const output = stdoutWriteSpy.mock.calls[0][0] as string;
      expect(output).toContain('503');
    });
  });

  describe('TMDB Client - Fallback Coverage', () => {
    it('should use both TMDB_API_KEY and TMDB_KEY fallbacks', () => {
      const originalApiKey = process.env.TMDB_API_KEY;
      const originalKey = process.env.TMDB_KEY;

      process.env.TMDB_API_KEY = 'primary';
      process.env.TMDB_KEY = 'fallback';

      jest.resetModules();
      const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
      const client = getTmdbClient();
      expect(client).toBeDefined();

      if (originalApiKey) process.env.TMDB_API_KEY = originalApiKey;
      if (originalKey) process.env.TMDB_KEY = originalKey;
    });

    it('should create client even when both keys are missing', () => {
      const originalApiKey = process.env.TMDB_API_KEY;
      const originalKey = process.env.TMDB_KEY;

      delete process.env.TMDB_API_KEY;
      delete process.env.TMDB_KEY;

      jest.resetModules();
      const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
      const client = getTmdbClient();
      expect(client).toBeDefined();

      if (originalApiKey) process.env.TMDB_API_KEY = originalApiKey;
      if (originalKey) process.env.TMDB_KEY = originalKey;
    });
  });
});
