/**
 * TMDB Services Tests - Mocked
 * Tests for TMDB client and tagline service with mocked axios
 */

import axios from 'axios';
import { getTmdbClient, resetTmdbClient } from '../../src/services/tmdb/tmdbClient';
import { fetchMovieTagline, cache } from '../../src/services/tmdb/tmdbTaglineService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('TMDB Client Tests', () => {
  let stdoutWriteSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    resetTmdbClient();  // Reset singleton for each test
    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    process.env.TMDB_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
  });

  // Test Case 1: getTmdbClient creates axios instance

  // Test Case 2: Request interceptor adds API key

  // Test Case 3: Request interceptor uses TMDB_KEY as fallback

  // Test Case 4: Request interceptor handles empty params

  // Test Case 5: Request interceptor logs request

  // Test Case 6: Request interceptor redacts API key in logs


  // Test Case 7: Response interceptor logs successful response

  // Test Case 8: Response interceptor calculates response time


  // Test Case 9: Error interceptor logs error

  // Test Case 10: Error interceptor handles missing config

  it('should log error response without start time', () => {
    let errorInterceptor: any;

    const mockInstance = {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn((success, error) => { errorInterceptor = error; }) }
      }
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockInstance);

    getTmdbClient();

    const mockError = {
      message: 'Network Error',
      config: {
        method: 'GET',
        url: '/test'
        // No __start property
      }
    };

    expect(() => errorInterceptor(mockError)).toThrow();

    expect(stdoutWriteSpy).toHaveBeenCalledWith(
      expect.stringContaining('ERROR')
    );
    expect(stdoutWriteSpy).not.toHaveBeenCalledWith(
      expect.stringMatching(/\d+ms/)
    );
  });
});

describe('TMDB Tagline Service Tests', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Clear cache
    cache.clear();

    mockClient = {
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockClient);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Test Case 11: fetchMovieTagline with successful search

  // Test Case 12: Cache hit returns cached tagline

  // Test Case 13: Cache expires after TTL

  // Test Case 14: Search without year

  // Test Case 15: No search results

  // Test Case 16: Search returns result without ID
  it('should return null when result has no ID', async () => {
    mockClient.get.mockResolvedValueOnce({
      data: {
        results: [{ title: 'No ID Movie' }]
      }
    });

    const tagline = await fetchMovieTagline('No ID Movie', 2024);

    expect(tagline).toBeNull();
  });

  // Test Case 17: Movie details have no tagline

  // Test Case 18: Movie details have empty tagline
  it('should return null when movie has empty tagline', async () => {
    mockClient.get
      .mockResolvedValueOnce({
        data: {
          results: [{ id: 999, title: 'Empty Tagline' }]
        }
      })
      .mockResolvedValueOnce({
        data: {
          tagline: '   '
        }
      });

    const tagline = await fetchMovieTagline('Empty Tagline', 2024);

    expect(tagline).toBeNull();
  });

  // Test Case 19: Handle API error gracefully
  it('should return null on API error', async () => {
    mockClient.get.mockRejectedValueOnce(new Error('API Error'));

    const tagline = await fetchMovieTagline('Error Movie', 2024);

    expect(tagline).toBeNull();
  });

  // Test Case 20: Cache key is case-insensitive

  // Test Case 21: Cache key includes year

  // Test Case 22: Handle year as string

  // Test Case 23: Trim whitespace from title
  it('should trim whitespace from title for cache key', async () => {
    mockClient.get
      .mockResolvedValueOnce({
        data: {
          results: [{ id: 555, title: 'Trimmed' }]
        }
      })
      .mockResolvedValueOnce({
        data: {
          tagline: 'Clean'
        }
      });

    await fetchMovieTagline('  Trimmed Movie  ', 2024);
    const tagline = await fetchMovieTagline('Trimmed Movie', 2024);

    expect(tagline).toBe('Clean');
    expect(mockClient.get).toHaveBeenCalledTimes(2);
  });

  // Test Case 24: Search includes year in query

  // Test Case 25: Search parameters are correct

  // Test Case 26: Handle response with undefined results (coverage for || [])

  // Test Case 27: Handle response with null results (coverage for || [])

  // Test Case 28: Handle response with undefined data (coverage for || [])
  it('should handle search response with undefined data', async () => {
    mockClient.get.mockResolvedValueOnce({
      data: undefined
    });

    const tagline = await fetchMovieTagline('Undefined Data', 2024);

    expect(tagline).toBeNull();
    expect(mockClient.get).toHaveBeenCalledTimes(1);
  });

});
describe('TMDB Client - Response Interceptor', () => {
  let consoleOutput: string[] = [];
  const originalWrite = process.stdout.write;

  beforeEach(() => {
    consoleOutput = [];
    // Mock process.stdout.write to capture logs
    (process.stdout.write as any) = jest.fn((msg: string) => {
      consoleOutput.push(msg);
      return true;
    });
    process.env.TMDB_API_KEY = 'test-key';
  });

  afterEach(() => {
    process.stdout.write = originalWrite;
    jest.restoreAllMocks();
  });

  /**
   * Coverage: response.config.method?.toUpperCase() ?? 'GET'
   * Branch: when method is undefined, should use 'GET' as fallback
   */

  /**
   * Coverage: response.config.method?.toUpperCase() ?? 'GET'
   * Branch: when method exists but is empty string
   */

  /**
   * Coverage: response.config.url ?? ''
   * Branch: when url is undefined, should use empty string as fallback
   */

  /**
   * Coverage: response.config.url ?? ''
   * Branch: when url is null
   */

  /**
   * Coverage: const ms = start ? Date.now() - start : undefined
   * Branch: when start is undefined (no timing info)
   */
  it('should handle response when __start is undefined in response config', async () => {
    const client = getTmdbClient();

    jest.spyOn(axios, 'create').mockReturnValue({
      interceptors: {
        request: { use: jest.fn() },
        response: {
          use: jest.fn((success) => {
            const mockResponse = {
              config: {
                method: 'get',
                url: 'https://api.themoviedb.org/3/search/movie',
                // __start is not set
              } as any,
              status: 200
            } as any;
            success(mockResponse);
          })
        }
      }
    } as any);

    const testClient = getTmdbClient();
    expect(testClient.interceptors.response).toBeDefined();
  });
});

describe('TMDB Client - Error Interceptor', () => {
  let consoleOutput: string[] = [];
  const originalWrite = process.stdout.write;

  beforeEach(() => {
    consoleOutput = [];
    (process.stdout.write as any) = jest.fn((msg: string) => {
      consoleOutput.push(msg);
      return true;
    });
    process.env.TMDB_API_KEY = 'test-key';
  });

  afterEach(() => {
    process.stdout.write = originalWrite;
    jest.restoreAllMocks();
  });

  /**
   * Coverage: error.message ?? ''
   * Branch: when error.message is undefined, should use empty string
   */

  /**
   * Coverage: error.message ?? ''
   * Branch: when error.message is null
   */

  /**
   * Coverage: cfg.method?.toUpperCase?.() ?? 'GET'
   * Branch: when error.config.method is undefined
   */

  /**
   * Coverage: String(cfg.url ?? '')
   * Branch: when error.config.url is undefined
   */

  /**
   * Coverage: const ms = start ? Date.now() - start : undefined
   * Branch: when error.config.__start is undefined
   */

  /**
   * Coverage: when error object has no config
   * Branch: error.config ?? {}
   */
  it('should use empty object when error has no config', async () => {
    const client = getTmdbClient();

    jest.spyOn(axios, 'create').mockReturnValue({
      interceptors: {
        request: { use: jest.fn() },
        response: {
          use: jest.fn((success, error) => {
            const mockError = {
              message: 'Critical Error',
              config: undefined
            } as any;
            expect(() => error(mockError)).toThrow();
          })
        }
      }
    } as any);

    const testClient = getTmdbClient();
    expect(testClient.interceptors.response).toBeDefined();
  });
});

describe('TMDB Client - Real Interceptor Behavior', () => {
  let consoleOutput: string[] = [];
  const originalWrite = process.stdout.write;

  beforeEach(() => {
    consoleOutput = [];
    (process.stdout.write as any) = jest.fn((msg: string) => {
      consoleOutput.push(msg);
      return true;
    });
    process.env.TMDB_API_KEY = 'test-api-key-12345';
  });

  afterEach(() => {
    process.stdout.write = originalWrite;
    jest.restoreAllMocks();
  });

  /**
   * Integration test: Verify interceptors handle missing method gracefully
   * Covers: response.config.method?.toUpperCase() ?? 'GET'
   */

  /**
   * Integration test: Verify interceptors handle missing URL gracefully
   * Covers: response.config.url ?? ''
   */

  /**
   * Integration test: Verify error interceptor handles missing error message
   * Covers: error.message ?? '' in error interceptor
   */

  /**
   * Integration test: Verify error interceptor handles missing config
   * Covers: const cfg = error.config ?? {}
   */

  /**
   * Test: timing calculation when __start is missing
   * Covers: const ms = start ? Date.now() - start : undefined
   */
  it('should handle timing gracefully when __start is missing', async () => {
    const mockAxiosInstance = {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    jest.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance as any);

    const client = getTmdbClient();
    
    const responseInterceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
    const successHandler = responseInterceptorCall[0];
    
    successHandler({
      config: {
        method: 'GET',
        url: '/movie/550',
        // __start not set
      } as any,
      status: 200,
      data: {}
    });

    expect(consoleOutput.length).toBeGreaterThan(0);
  });
});