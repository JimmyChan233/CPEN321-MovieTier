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
  it('should normalize all fields when present', () => {
    const data = {
      id: 1,
      title: 'Test Movie',
      overview: 'Test overview',
      poster_path: '/test.jpg',
      release_date: '2020-01-01',
      vote_average: 8.5
    };

    const result = normalizeMovieDetails(data);

    expect(result.id).toBe(1);
    expect(result.title).toBe('Test Movie');
    expect(result.overview).toBe('Test overview');
    expect(result.posterPath).toBe('/test.jpg');
    expect(result.releaseDate).toBe('2020-01-01');
    expect(result.voteAverage).toBe(8.5);
  });

  it('should set null when fields are missing', () => {
    const data = {
      id: 1,
      title: 'Movie'
    };

    const result = normalizeMovieDetails(data);

    expect(result.overview).toBeNull();
    expect(result.posterPath).toBeNull();
    expect(result.releaseDate).toBeNull();
    expect(result.voteAverage).toBeNull();
  });

  it('should set null when fields are falsy (empty string, 0, etc.)', () => {
    const data = {
      id: 1,
      title: 'Movie',
      overview: '',
      poster_path: null,
      release_date: '',
      vote_average: 0
    };

    const result = normalizeMovieDetails(data);

    expect(result.overview).toBeNull();
    expect(result.posterPath).toBeNull();
    expect(result.releaseDate).toBeNull();
    expect(result.voteAverage).toBeNull();
  });

  it('should handle undefined data object', () => {
    const result = normalizeMovieDetails(undefined);

    expect(result.id).toBeUndefined();
    expect(result.title).toBeUndefined();
    expect(result.overview).toBeNull();
    expect(result.posterPath).toBeNull();
  });
});

describe('TMDB Response Helpers - normalizeCastArray', () => {
  it('should extract first 5 cast members with names', () => {
    const castData = [
      { name: 'Actor 1' },
      { name: 'Actor 2' },
      { name: 'Actor 3' },
      { name: 'Actor 4' },
      { name: 'Actor 5' },
      { name: 'Actor 6' }
    ];

    const result = normalizeCastArray(castData);

    expect(result).toEqual(['Actor 1', 'Actor 2', 'Actor 3', 'Actor 4', 'Actor 5']);
  });

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

  it('should return empty array when castData is undefined', () => {
    const result = normalizeCastArray(undefined);
    expect(result).toEqual([]);
  });

  it('should return empty array when castData is not an array', () => {
    const result = normalizeCastArray(null as any);
    expect(result).toEqual([]);
  });

  it('should handle empty cast array', () => {
    const result = normalizeCastArray([]);
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

  it('should return first video when no trailer or teaser', () => {
    const videos = [
      { type: 'Clip', name: 'Clip 1' },
      { type: 'Clip', name: 'Clip 2' }
    ];

    const result = findBestTrailer(videos);

    expect(result?.name).toBe('Clip 1');
  });

  it('should return null when no videos available', () => {
    const result = findBestTrailer([]);
    expect(result).toBeNull();
  });
});

describe('TMDB Response Helpers - filterYoutubeVideos', () => {
  it('should filter to only YouTube videos', () => {
    const videos = [
      { site: 'YouTube', name: 'Video 1' },
      { site: 'Vimeo', name: 'Video 2' },
      { site: 'YouTube', name: 'Video 3' }
    ];

    const result = filterYoutubeVideos(videos);

    expect(result).toHaveLength(2);
    expect(result.every((v: any) => v.site === 'YouTube')).toBe(true);
  });

  it('should return empty array when no YouTube videos', () => {
    const videos = [
      { site: 'Vimeo', name: 'Video 1' },
      { site: 'DailyMotion', name: 'Video 2' }
    ];

    const result = filterYoutubeVideos(videos);

    expect(result).toEqual([]);
  });

  it('should return empty array when videos is not an array', () => {
    const result = filterYoutubeVideos(null as any);
    expect(result).toEqual([]);
  });

  it('should handle undefined site property', () => {
    const videos = [
      { name: 'Video 1' }, // No site
      { site: 'YouTube', name: 'Video 2' }
    ];

    const result = filterYoutubeVideos(videos);

    expect(result).toHaveLength(1);
    expect(result[0].site).toBe('YouTube');
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

  it('should add api_key to params from TMDB_API_KEY', () => {
    process.env.TMDB_API_KEY = 'test-api-key';

    const config: any = {
      method: 'GET',
      url: '/test',
      params: {}
    };

    const result = handleTmdbRequestIntercept(config);

    expect(result.params.api_key).toBe('test-api-key');
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

  it('should set __start timing property', () => {
    const config: any = {
      method: 'GET',
      url: '/test',
      params: {}
    };

    const result = handleTmdbRequestIntercept(config);

    expect(result.__start).toBeDefined();
    expect(typeof result.__start).toBe('number');
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

  it('should log response with timing', () => {
    const response: any = {
      status: 200,
      config: {
        method: 'GET',
        url: '/test',
        __start: Date.now() - 100
      }
    };

    const result = handleTmdbResponseSuccess(response);

    expect(result).toBe(response);
    expect(stdoutWriteSpy).toHaveBeenCalled();
    const output = stdoutWriteSpy.mock.calls[0][0];
    expect(output).toContain('200');
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

  it('should log error and throw', () => {
    const error: any = {
      message: 'Test error',
      config: {
        method: 'GET',
        url: '/test'
      }
    };

    expect(() => handleTmdbResponseError(error)).toThrow('Test error');
    expect(stdoutWriteSpy).toHaveBeenCalled();
  });

  it('should handle missing error config', () => {
    const error: any = {
      message: 'Test error'
      // No config
    };

    expect(() => handleTmdbResponseError(error)).toThrow();
    expect(stdoutWriteSpy).toHaveBeenCalled();
  });

  it('should use default method when config.method is undefined', () => {
    const error: any = {
      message: 'Test error',
      config: {
        url: '/test'
        // No method
      }
    };

    expect(() => handleTmdbResponseError(error)).toThrow();
    const output = stdoutWriteSpy.mock.calls[0][0];
    expect(output).toContain('GET');
  });
});
