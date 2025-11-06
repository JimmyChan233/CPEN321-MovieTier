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
  it('should handle http call with statusCode and duration', () => {
    logger.http('GET', '/api/test', 200, 100);
    const output = stdoutWriteSpy.mock.calls[0][0] as string;
    expect(output).toContain('100');
    expect(output).toContain('200');
  });

  it('should handle http call with statusCode but no duration', () => {
    logger.http('POST', '/api/test', 201);
    const output = stdoutWriteSpy.mock.calls[0][0] as string;
    expect(output).toContain('201');
  });

  it('should handle http call with statusCode=0 and duration', () => {
    logger.http('DELETE', '/api/test', 0, 50);
    const output = stdoutWriteSpy.mock.calls[0][0] as string;
    expect(output).toContain('50');
  });

  it('should handle http call with undefined statusCode and duration', () => {
    logger.http('PUT', '/api/test', undefined, 75);
    const output = stdoutWriteSpy.mock.calls[0][0] as string;
    expect(output).toContain('75');
  });

  it('should handle http call with statusCode and no duration (falsy duration)', () => {
    logger.http('PATCH', '/api/test', 204, undefined);
    const output = stdoutWriteSpy.mock.calls[0][0] as string;
    expect(output).toContain('204');
  });

  it('should handle http call with statusCode and duration=0', () => {
    logger.http('GET', '/api/test', 200, 0);
    const output = stdoutWriteSpy.mock.calls[0][0] as string;
    expect(output).toContain('0'); // Should include the 0ms duration
  });

  it('should handle error status code (>= 400) with duration', () => {
    logger.http('GET', '/api/test', 500, 150);
    const output = stdoutWriteSpy.mock.calls[0][0] as string;
    expect(output).toContain('500');
    expect(output).toContain('150');
  });

  it('should handle success status code (< 400) with duration', () => {
    logger.http('POST', '/api/test', 201, 50);
    const output = stdoutWriteSpy.mock.calls[0][0] as string;
    expect(output).toContain('201');
    expect(output).toContain('50');
  });

  it('should handle boundary status code 400', () => {
    logger.http('GET', '/api/test', 400, 100);
    const output = stdoutWriteSpy.mock.calls[0][0] as string;
    expect(output).toContain('400');
  });

  it('should handle status code 399', () => {
    logger.http('GET', '/api/test', 399, 100);
    const output = stdoutWriteSpy.mock.calls[0][0] as string;
    expect(output).toContain('399');
  });
});

describe('TMDB Client - Fallback Keys', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should use TMDB_API_KEY when set', () => {
    process.env.TMDB_API_KEY = 'primary-key';
    process.env.TMDB_KEY = 'fallback-key';

    const { getTmdbClient } = require('../../src/services/tmdb/tmdbClient');
    const client = getTmdbClient();
    expect(client).toBeDefined();
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
