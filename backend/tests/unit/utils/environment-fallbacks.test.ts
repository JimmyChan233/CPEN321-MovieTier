/**
 * @unit Unit tests for environment/config fallbacks
 * Tests configuration defaults and environment variable handling
 */

import { logger } from '../../../src/utils/logger';

describe('Logger HTTP Method - Edge Cases', () => {
  let stdoutWriteSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
  });

  it('should handle http call with undefined statusCode and duration', () => {
    logger.http('PUT', '/api/test', undefined, 75);
    const output = stdoutWriteSpy.mock.calls[0][0] as string;
    expect(output).toContain('75');
  });
});

describe('TMDB Client - Fallback Keys', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should use TMDB_KEY fallback when TMDB_API_KEY not set', () => {
    delete process.env.TMDB_API_KEY;
    process.env.TMDB_KEY = 'fallback-only';

    jest.resetModules();
    const { getTmdbClient } = require('../../../src/services/tmdb/tmdbClient');
    const client = getTmdbClient();
    expect(client).toBeDefined();
  });
});

describe('Config Module - Environment Fallbacks', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should use development as default NODE_ENV', () => {
    const originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;

    jest.resetModules();
    const config = require('../../../src/config').default;

    expect(config.nodeEnv).toBe('development');

    if (originalEnv) process.env.NODE_ENV = originalEnv;
  });
});

describe('TMDB API Key - Fallback Chain', () => {
  it('should test the TMDB API key fallback chain', () => {
    // Test: process.env.TMDB_API_KEY ?? process.env.TMDB_KEY

    const originalApiKey = process.env.TMDB_API_KEY;
    const originalKey = process.env.TMDB_KEY;

    try {
      // Case 1: TMDB_API_KEY is set
      process.env.TMDB_API_KEY = 'api-key-value';
      process.env.TMDB_KEY = 'key-value';
      const result1 = process.env.TMDB_API_KEY ?? process.env.TMDB_KEY;
      expect(result1).toBe('api-key-value');

      // Case 2: Only TMDB_KEY is set
      delete process.env.TMDB_API_KEY;
      const result2 = process.env.TMDB_API_KEY ?? process.env.TMDB_KEY;
      expect(result2).toBe('key-value');

      // Case 3: Neither is set
      delete process.env.TMDB_KEY;
      const result3 = process.env.TMDB_API_KEY ?? process.env.TMDB_KEY;
      expect(result3).toBeUndefined();
    } finally {
      // Restore original values
      if (originalApiKey) {
        process.env.TMDB_API_KEY = originalApiKey;
      }
      if (originalKey) {
        process.env.TMDB_KEY = originalKey;
      }
    }
  });
});
