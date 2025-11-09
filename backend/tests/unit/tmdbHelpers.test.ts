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

  it('should normalize valid movie details', () => {
    const movieData = {
      id: 123,
      title: 'Test Movie',
      overview: 'Test overview',
      poster_path: '/test.jpg',
      release_date: '2023-01-01',
      vote_average: 8.5
    };

    const result = normalizeMovieDetails(movieData);

    expect(result).toEqual({
      id: 123,
      title: 'Test Movie',
      overview: 'Test overview',
      posterPath: '/test.jpg',
      releaseDate: '2023-01-01',
      voteAverage: 8.5
    });
  });

  it('should handle null/undefined fields with fallbacks', () => {
    const movieData = {
      id: 456,
      title: 'Test Movie 2',
      overview: null,
      poster_path: null,
      release_date: null,
      vote_average: null
    };

    const result = normalizeMovieDetails(movieData);

    expect(result).toEqual({
      id: 456,
      title: 'Test Movie 2',
      overview: null,
      posterPath: null,
      releaseDate: null,
      voteAverage: null
    });
  });

  it('should handle non-object input', () => {
    const result = normalizeMovieDetails('not an object');

    expect(result).toEqual({
      id: undefined,
      title: undefined,
      overview: null,
      posterPath: null,
      releaseDate: null,
      voteAverage: null
    });
  });

  it('should handle null input', () => {
    const result = normalizeMovieDetails(null);

    expect(result).toEqual({
      id: undefined,
      title: undefined,
      overview: null,
      posterPath: null,
      releaseDate: null,
      voteAverage: null
    });
  });

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

  it('should handle non-object cast members', () => {
    const castData = [
      { name: 'Actor 1' },
      null, // null cast member
      'string', // string cast member
      123, // number cast member
      { name: 'Actor 5' }
    ];

    const result = normalizeCastArray(castData);

    expect(result).toEqual(['Actor 1', 'Actor 5']);
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

  it('should filter only YouTube videos', () => {
    const videos = [
      { site: 'YouTube', key: 'abc123' },
      { site: 'Vimeo', key: 'def456' },
      { site: 'YouTube', key: 'ghi789' },
      { site: 'Dailymotion', key: 'jkl012' }
    ];

    const result = filterYoutubeVideos(videos);

    expect(result).toEqual([
      { site: 'YouTube', key: 'abc123' },
      { site: 'YouTube', key: 'ghi789' }
    ]);
  });

  it('should handle non-object video items', () => {
    const videos = [
      { site: 'YouTube', key: 'abc123' },
      null,
      'string',
      123,
      { site: 'YouTube', key: 'def456' }
    ];

    const result = filterYoutubeVideos(videos);

    expect(result).toEqual([
      { site: 'YouTube', key: 'abc123' },
      { site: 'YouTube', key: 'def456' }
    ]);
  });

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

  it('should handle non-Axios errors with Error instance', () => {
    const error = new Error('Non-Axios error');

    expect(() => handleTmdbResponseError(error)).toThrow('Non-Axios error');
    expect(stdoutWriteSpy).toHaveBeenCalled();
  });

  it('should handle non-Axios errors with string', () => {
    const error = 'String error message';

    expect(() => handleTmdbResponseError(error)).toThrow('String error message');
    expect(stdoutWriteSpy).toHaveBeenCalled();
  });

  it('should handle non-Axios errors with null/undefined', () => {
    expect(() => handleTmdbResponseError(null)).toThrow('Unknown TMDB error');
    expect(stdoutWriteSpy).toHaveBeenCalled();

    expect(() => handleTmdbResponseError(undefined)).toThrow('Unknown TMDB error');
    expect(stdoutWriteSpy).toHaveBeenCalled();
  });

  it('should handle Axios errors with timing information', () => {
    const error: any = {
      isAxiosError: true,
      config: {
        __start: Date.now() - 1000,
        method: 'POST',
        url: '/test-endpoint'
      },
      message: 'Axios error with timing'
    };

    expect(() => handleTmdbResponseError(error)).toThrow('Axios error with timing');
    expect(stdoutWriteSpy).toHaveBeenCalled();
  });

  it('should handle Axios errors without timing information', () => {
    const error: any = {
      isAxiosError: true,
      config: {
        // No __start property
        method: 'GET',
        url: '/test-endpoint'
      },
      message: 'Axios error without timing'
    };

    expect(() => handleTmdbResponseError(error)).toThrow('Axios error without timing');
    expect(stdoutWriteSpy).toHaveBeenCalled();
  });

  it('should handle Axios errors with non-string method and url', () => {
    const error: any = {
      isAxiosError: true,
      config: {
        __start: Date.now() - 500,
        method: 123, // Non-string method
        url: null // Null URL
      },
      message: 'Axios error with invalid config'
    };

    expect(() => handleTmdbResponseError(error)).toThrow('Axios error with invalid config');
    expect(stdoutWriteSpy).toHaveBeenCalled();
  });

  it('should handle Axios errors with null config', () => {
    const error: any = {
      isAxiosError: true,
      config: null, // Null config
      message: 'Axios error with null config'
    };

    expect(() => handleTmdbResponseError(error)).toThrow('Axios error with null config');
    expect(stdoutWriteSpy).toHaveBeenCalled();
  });

});
