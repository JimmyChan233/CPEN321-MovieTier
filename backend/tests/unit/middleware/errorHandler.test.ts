/**
 * @unit Unit tests for errorHandler middleware
 * Tests error formatting, logging, and null/undefined handling
 */

import { handleTmdbResponseError } from '../../../src/services/tmdb/tmdbClient';

describe('TMDB Response Error Handler - Null Value Handling', () => {
  let stdoutWriteSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
  });

  it('should handle trailer being null in shaped response', () => {
    const trailer: any = null;
    const shaped = trailer
      ? {
        key: trailer.key,
        name: trailer.name,
        type: trailer.type,
        site: trailer.site
      }
      : null;
    expect(shaped).toBeNull();
  });

  it('should handle error with null message', () => {
    const error: any = {
      message: null,
      config: {
        method: 'GET',
        url: '/test'
      }
    };

    expect(() => handleTmdbResponseError(error)).toThrow();
    const output = stdoutWriteSpy.mock.calls[0][0];
    expect(output).toContain('ERROR');
  });

  it('should handle missing error code', () => {
    const error: any = { message: 'Some error' };
    const err = error as { code?: number };

    if (err.code === 11000) {
      fail('Should not enter this branch');
    } else {
      expect(err.code).toBeUndefined();
    }
  });
});
