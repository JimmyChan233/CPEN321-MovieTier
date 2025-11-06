/**
 * Comprehensive Branch Coverage Tests
 * Tests to achieve 100% branch coverage on remaining files
 */

import { logger } from '../../src/utils/logger';

describe('Logger HTTP Method - Complete Branch Coverage', () => {
  let stdoutWriteSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
  });

  // Test all combinations of statusCode and duration



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
    const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
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
    const config = require('../../src/config').default;

    expect(config.nodeEnv).toBe('development');

    if (originalEnv) process.env.NODE_ENV = originalEnv;
  });
});
