/**
 * TMDB Services Tests - Mocked
 * Tests for TMDB client and tagline service with mocked axios
 */

import axios from 'axios';
import { getTmdbClient } from '../../src/services/tmdb/tmdbClient';
import { fetchMovieTagline } from '../../src/services/tmdb/tmdbTaglineService';

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
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    process.env.TMDB_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  // Test Case 1: getTmdbClient creates axios instance
  it('should create axios instance with correct baseURL', () => {
    const mockInstance = {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockInstance);

    getTmdbClient();

    expect(mockedAxios.create).toHaveBeenCalledWith({
      baseURL: 'https://api.themoviedb.org/3',
      timeout: 15000
    });
  });

  // Test Case 2: Request interceptor adds API key
  it('should add API key to request params', () => {
    const mockConfig: any = {
      params: { query: 'test' }
    };

    const mockInstance = {
      interceptors: {
        request: { use: jest.fn((interceptor) => interceptor(mockConfig)) },
        response: { use: jest.fn() }
      }
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockInstance);

    getTmdbClient();

    expect(mockConfig.params.api_key).toBe('test-api-key');
  });

  // Test Case 3: Request interceptor uses TMDB_KEY as fallback
  it('should use TMDB_KEY environment variable as fallback', () => {
    delete process.env.TMDB_API_KEY;
    process.env.TMDB_KEY = 'fallback-key';

    const mockConfig: any = {
      params: {}
    };

    const mockInstance = {
      interceptors: {
        request: { use: jest.fn((interceptor) => interceptor(mockConfig)) },
        response: { use: jest.fn() }
      }
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockInstance);

    getTmdbClient();

    expect(mockConfig.params.api_key).toBe('fallback-key');

    process.env.TMDB_API_KEY = 'test-api-key'; // Restore
  });

  // Test Case 4: Request interceptor handles empty params
  it('should handle request with no existing params', () => {
    const mockConfig: any = {
      method: 'GET',
      url: '/test'
    };

    const mockInstance = {
      interceptors: {
        request: { use: jest.fn((interceptor) => interceptor(mockConfig)) },
        response: { use: jest.fn() }
      }
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockInstance);

    getTmdbClient();

    expect(mockConfig.params).toBeDefined();
    expect(mockConfig.params.api_key).toBe('test-api-key');
  });

  // Test Case 5: Request interceptor logs request
  it('should log outgoing request', () => {
    const mockConfig: any = {
      method: 'GET',
      url: '/movie/123',
      params: { language: 'en-US' }
    };

    const mockInstance = {
      interceptors: {
        request: { use: jest.fn((interceptor) => interceptor(mockConfig)) },
        response: { use: jest.fn() }
      }
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockInstance);

    getTmdbClient();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('TMDB ➡️')
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('GET')
    );
  });

  // Test Case 6: Request interceptor redacts API key in logs
  it('should redact API key in request logs', () => {
    const mockConfig: any = {
      method: 'GET',
      url: '/test',
      params: { api_key: 'secret-key' }
    };

    const mockInstance = {
      interceptors: {
        request: { use: jest.fn((interceptor) => interceptor(mockConfig)) },
        response: { use: jest.fn() }
      }
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockInstance);

    getTmdbClient();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('***')
    );
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('secret-key')
    );
  });

  // Test Case 7: Response interceptor logs successful response
  it('should log successful response', () => {
    let responseInterceptor: any;

    const mockInstance = {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn((success) => { responseInterceptor = success; }) }
      }
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockInstance);

    getTmdbClient();

    const mockResponse = {
      config: {
        method: 'GET',
        url: '/movie/123',
        __start: Date.now() - 100
      },
      status: 200
    };

    responseInterceptor(mockResponse);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('TMDB ⬅️')
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('200')
    );
  });

  // Test Case 8: Response interceptor calculates response time
  it('should calculate and log response time', () => {
    let responseInterceptor: any;

    const mockInstance = {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn((success) => { responseInterceptor = success; }) }
      }
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockInstance);

    getTmdbClient();

    const mockResponse = {
      config: {
        method: 'GET',
        url: '/test',
        __start: Date.now() - 150
      },
      status: 200
    };

    responseInterceptor(mockResponse);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\d+ms/)
    );
  });

  // Test Case 9: Error interceptor logs error
  it('should log error response', () => {
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
        url: '/test',
        __start: Date.now() - 50
      }
    };

    expect(() => errorInterceptor(mockError)).toThrow();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('ERROR')
    );
  });

  // Test Case 10: Error interceptor handles missing config
  it('should handle error without config', () => {
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
      message: 'Network Error'
      // No config
    };

    expect(() => errorInterceptor(mockError)).toThrow();
    expect(consoleLogSpy).toHaveBeenCalled();
  });
});

describe('TMDB Tagline Service Tests', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Clear cache
    const cache = (require('../../src/services/tmdb/tmdbTaglineService') as any).cache;
    if (cache) cache.clear();

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
  it('should fetch tagline successfully', async () => {
    mockClient.get
      .mockResolvedValueOnce({
        data: {
          results: [{ id: 12345, title: 'Test Movie' }]
        }
      })
      .mockResolvedValueOnce({
        data: {
          tagline: 'An amazing movie'
        }
      });

    const tagline = await fetchMovieTagline('Test Movie', 2024);

    expect(tagline).toBe('An amazing movie');
    expect(mockClient.get).toHaveBeenCalledTimes(2);
  });

  // Test Case 12: Cache hit returns cached tagline
  it('should return cached tagline on cache hit', async () => {
    mockClient.get
      .mockResolvedValueOnce({
        data: {
          results: [{ id: 123, title: 'Cached Movie' }]
        }
      })
      .mockResolvedValueOnce({
        data: {
          tagline: 'Cached tagline'
        }
      });

    // First call - should hit API
    const tagline1 = await fetchMovieTagline('Cached Movie', 2024);

    // Second call - should hit cache
    const tagline2 = await fetchMovieTagline('Cached Movie', 2024);

    expect(tagline1).toBe('Cached tagline');
    expect(tagline2).toBe('Cached tagline');
    expect(mockClient.get).toHaveBeenCalledTimes(2); // Only called once
  });

  // Test Case 13: Cache expires after TTL
  it('should refetch after cache expires', async () => {
    mockClient.get
      .mockResolvedValueOnce({
        data: {
          results: [{ id: 123, title: 'Movie' }]
        }
      })
      .mockResolvedValueOnce({
        data: {
          tagline: 'Old tagline'
        }
      })
      .mockResolvedValueOnce({
        data: {
          results: [{ id: 123, title: 'Movie' }]
        }
      })
      .mockResolvedValueOnce({
        data: {
          tagline: 'New tagline'
        }
      });

    // First call
    await fetchMovieTagline('Movie', 2024);

    // Fast forward 25 hours (past TTL)
    jest.advanceTimersByTime(25 * 60 * 60 * 1000);

    // Second call - cache should be stale
    const tagline = await fetchMovieTagline('Movie', 2024);

    expect(tagline).toBe('New tagline');
  });

  // Test Case 14: Search without year
  it('should search without year parameter', async () => {
    mockClient.get
      .mockResolvedValueOnce({
        data: {
          results: [{ id: 456, title: 'No Year Movie' }]
        }
      })
      .mockResolvedValueOnce({
        data: {
          tagline: 'Timeless'
        }
      });

    const tagline = await fetchMovieTagline('No Year Movie');

    expect(tagline).toBe('Timeless');
    expect(mockClient.get).toHaveBeenCalledWith('/search/movie', expect.objectContaining({
      params: expect.objectContaining({
        query: 'No Year Movie'
      })
    }));
  });

  // Test Case 15: No search results
  it('should return null when no search results', async () => {
    mockClient.get.mockResolvedValueOnce({
      data: {
        results: []
      }
    });

    const tagline = await fetchMovieTagline('Nonexistent Movie', 2024);

    expect(tagline).toBeNull();
    expect(mockClient.get).toHaveBeenCalledTimes(1);
  });

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
  it('should return null when movie has no tagline', async () => {
    mockClient.get
      .mockResolvedValueOnce({
        data: {
          results: [{ id: 789, title: 'No Tagline Movie' }]
        }
      })
      .mockResolvedValueOnce({
        data: {
          tagline: null
        }
      });

    const tagline = await fetchMovieTagline('No Tagline Movie', 2024);

    expect(tagline).toBeNull();
  });

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
  it('should treat titles as case-insensitive for caching', async () => {
    mockClient.get
      .mockResolvedValueOnce({
        data: {
          results: [{ id: 111, title: 'Test' }]
        }
      })
      .mockResolvedValueOnce({
        data: {
          tagline: 'Cached'
        }
      });

    await fetchMovieTagline('Test Movie', 2024);
    const tagline = await fetchMovieTagline('TEST MOVIE', 2024);

    expect(tagline).toBe('Cached');
    expect(mockClient.get).toHaveBeenCalledTimes(2);
  });

  // Test Case 21: Cache key includes year
  it('should create different cache entries for same title with different years', async () => {
    mockClient.get
      .mockResolvedValueOnce({
        data: {
          results: [{ id: 222, title: 'Movie' }]
        }
      })
      .mockResolvedValueOnce({
        data: {
          tagline: '2020 version'
        }
      })
      .mockResolvedValueOnce({
        data: {
          results: [{ id: 333, title: 'Movie' }]
        }
      })
      .mockResolvedValueOnce({
        data: {
          tagline: '2021 version'
        }
      });

    const tagline1 = await fetchMovieTagline('Movie', 2020);
    const tagline2 = await fetchMovieTagline('Movie', 2021);

    expect(tagline1).toBe('2020 version');
    expect(tagline2).toBe('2021 version');
  });

  // Test Case 22: Handle year as string
  it('should handle year as string parameter', async () => {
    mockClient.get
      .mockResolvedValueOnce({
        data: {
          results: [{ id: 444, title: 'Movie' }]
        }
      })
      .mockResolvedValueOnce({
        data: {
          tagline: 'String year'
        }
      });

    const tagline = await fetchMovieTagline('Movie', '2024');

    expect(tagline).toBe('String year');
  });

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
  it('should include year in search query', async () => {
    mockClient.get
      .mockResolvedValueOnce({
        data: {
          results: [{ id: 666, title: 'Year Test' }]
        }
      })
      .mockResolvedValueOnce({
        data: {
          tagline: 'With year'
        }
      });

    await fetchMovieTagline('Year Test', 2024);

    expect(mockClient.get).toHaveBeenCalledWith('/search/movie', expect.objectContaining({
      params: expect.objectContaining({
        query: 'Year Test 2024'
      })
    }));
  });

  // Test Case 25: Search parameters are correct
  it('should send correct search parameters', async () => {
    mockClient.get
      .mockResolvedValueOnce({
        data: {
          results: [{ id: 777, title: 'Params Test' }]
        }
      })
      .mockResolvedValueOnce({
        data: {
          tagline: 'Params'
        }
      });

    await fetchMovieTagline('Params Test', 2024);

    expect(mockClient.get).toHaveBeenCalledWith('/search/movie', {
      params: {
        query: 'Params Test 2024',
        language: 'en-US',
        include_adult: false,
        page: 1
      }
    });
  });
});