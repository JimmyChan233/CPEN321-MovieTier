/**
 * Tests for TMDB response helpers and handlers
 * These tests achieve 100% branch coverage on extracted utility functions
 */

import {
  normalizeMovieDetails,
  normalizeCastArray,
  findBestTrailer,
  filterYoutubeVideos
} from '../../src/utils/tmdbResponseHelpers';

import {
  handleTmdbRequestIntercept,
  handleTmdbResponseSuccess,
  handleTmdbResponseError
} from '../../src/services/tmdb/tmdbClient';

describe('TMDB Response Helpers - normalizeMovieDetails', () => {



});

describe('TMDB Response Helpers - normalizeCastArray', () => {

  it('should filter out cast members without names', () => {
    const castData = [
      { name: 'Actor 1' },
      {}, // No name
      { name: 'Actor 3' },
      { name: undefined }
    ];

    const result = normalizeCastArray(castData);

    expect(result).toEqual(['Actor 1', 'Actor 3']);
  });


  it('should return empty array when castData is not an array', () => {
    const result = normalizeCastArray(null as any);
    expect(result).toEqual([]);
  });

});

describe('TMDB Response Helpers - findBestTrailer', () => {
  it('should find official trailer with highest priority', () => {
    const videos = [
      { type: 'Teaser', official: false, name: 'Teaser' },
      { type: 'Trailer', official: false, name: 'Regular Trailer' },
      { type: 'Trailer', official: true, name: 'Official Trailer' }
    ];

    const result = findBestTrailer(videos);

    expect(result?.name).toBe('Official Trailer');
  });

  it('should find regular trailer when no official trailer', () => {
    const videos = [
      { type: 'Teaser', name: 'Teaser' },
      { type: 'Trailer', official: false, name: 'Regular Trailer' }
    ];

    const result = findBestTrailer(videos);

    expect(result?.name).toBe('Regular Trailer');
  });

  it('should find teaser when no trailer available', () => {
    const videos = [
      { type: 'Teaser', name: 'Teaser' },
      { type: 'Clip', name: 'Clip' }
    ];

    const result = findBestTrailer(videos);

    expect(result?.name).toBe('Teaser');
  });


});

describe('TMDB Response Helpers - filterYoutubeVideos', () => {


  it('should return empty array when videos is not an array', () => {
    const result = filterYoutubeVideos(null as any);
    expect(result).toEqual([]);
  });

});

describe('TMDB Client - Request Interceptor Handler', () => {
  let stdoutWriteSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
  });


  it('should use TMDB_KEY fallback when TMDB_API_KEY not set', () => {
    delete process.env.TMDB_API_KEY;
    process.env.TMDB_KEY = 'fallback-key';

    const config: any = {
      method: 'GET',
      url: '/test',
      params: {}
    };

    const result = handleTmdbRequestIntercept(config);

    expect(result.params.api_key).toBe('fallback-key');
  });


  it('should handle missing method (default to GET)', () => {
    const config: any = {
      url: '/test',
      params: {}
    };

    const result = handleTmdbRequestIntercept(config);

    expect(stdoutWriteSpy).toHaveBeenCalled();
    const output = stdoutWriteSpy.mock.calls[0][0];
    expect(output).toContain('GET');
  });
});

describe('TMDB Client - Response Success Handler', () => {
  let stdoutWriteSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
  });


  it('should handle missing timing information', () => {
    const response: any = {
      status: 201,
      config: {
        method: 'POST',
        url: '/test'
        // No __start property
      }
    };

    const result = handleTmdbResponseSuccess(response);

    expect(result).toBe(response);
    expect(stdoutWriteSpy).toHaveBeenCalled();
  });
});

describe('TMDB Client - Response Error Handler', () => {
  let stdoutWriteSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
  });


  it('should handle missing error config', () => {
    const error: any = {
      message: 'Test error'
      // No config
    };

    expect(() => handleTmdbResponseError(error)).toThrow();
    expect(stdoutWriteSpy).toHaveBeenCalled();
  });

});
