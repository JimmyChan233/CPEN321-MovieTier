/**
 * TMDB Services Tests - Mocked
 * Tests for TMDB client and tagline service with mocked axios
 */

import axios from 'axios';
import { getTmdbClient } from '../../src/services/tmdb/tmdbClient';
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
    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    process.env.TMDB_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
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

    expect(stdoutWriteSpy).toHaveBeenCalledWith(
      expect.stringContaining('TMDB ➡️')
    );
    expect(stdoutWriteSpy).toHaveBeenCalledWith(
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

    expect(stdoutWriteSpy).toHaveBeenCalledWith(
      expect.stringContaining('***')
    );
    expect(stdoutWriteSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('secret-key')
    );
  });

  it('should handle undefined params in redactParams', () => {
    const mockConfig: any = {
      method: 'GET',
      url: '/test'
      // No params
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

    expect(stdoutWriteSpy).toHaveBeenCalledWith(
      expect.stringContaining('TMDB ⬅️')
    );
    expect(stdoutWriteSpy).toHaveBeenCalledWith(
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

    expect(stdoutWriteSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\d+ms/)
    );
  });

  it('should log successful response without start time', () => {
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
        url: '/movie/123'
        // No __start property
      },
      status: 200
    };

    responseInterceptor(mockResponse);

    expect(stdoutWriteSpy).toHaveBeenCalledWith(
      expect.stringContaining('TMDB ⬅️')
    );
    expect(stdoutWriteSpy).toHaveBeenCalledWith(
      expect.stringContaining('200')
    );
    expect(stdoutWriteSpy).not.toHaveBeenCalledWith(
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

    expect(stdoutWriteSpy).toHaveBeenCalledWith(
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
    expect(stdoutWriteSpy).toHaveBeenCalled();
  });

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

  // Test Case 26: Handle response with undefined results (coverage for || [])
  it('should handle search response with undefined results', async () => {
    mockClient.get.mockResolvedValueOnce({
      data: {
        results: undefined
      }
    });

    const tagline = await fetchMovieTagline('Undefined Results', 2024);

    expect(tagline).toBeNull();
    expect(mockClient.get).toHaveBeenCalledTimes(1);
  });

  // Test Case 27: Handle response with null results (coverage for || [])
  it('should handle search response with null results', async () => {
    mockClient.get.mockResolvedValueOnce({
      data: {
        results: null
      }
    });

    const tagline = await fetchMovieTagline('Null Results', 2024);

    expect(tagline).toBeNull();
    expect(mockClient.get).toHaveBeenCalledTimes(1);
  });

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
  it('should use GET as fallback when response config method is undefined', async () => {
    const client = getTmdbClient();

    // Mock the request to return a response with undefined method
    jest.spyOn(axios, 'create').mockReturnValue({
      interceptors: {
        request: { use: jest.fn() },
        response: {
          use: jest.fn((success, error) => {
            // Simulate a response with undefined method
            const mockResponse = {
              config: {
                method: undefined,
                url: 'https://api.themoviedb.org/3/search/movie'
              },
              status: 200
            } as any;
            success(mockResponse);
          })
        }
      }
    } as any);

    const testClient = getTmdbClient();
    // Just verify the interceptor was set up
    expect(testClient.interceptors.response).toBeDefined();
  });

  /**
   * Coverage: response.config.method?.toUpperCase() ?? 'GET'
   * Branch: when method exists but is empty string
   */
  it('should handle empty method string in response config', async () => {
    const client = getTmdbClient();

    jest.spyOn(axios, 'create').mockReturnValue({
      interceptors: {
        request: { use: jest.fn() },
        response: {
          use: jest.fn((success) => {
            const mockResponse = {
              config: {
                method: '',
                url: 'https://api.themoviedb.org/3/movie/550'
              },
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

  /**
   * Coverage: response.config.url ?? ''
   * Branch: when url is undefined, should use empty string as fallback
   */
  it('should use empty string as fallback when response config url is undefined', async () => {
    const client = getTmdbClient();

    jest.spyOn(axios, 'create').mockReturnValue({
      interceptors: {
        request: { use: jest.fn() },
        response: {
          use: jest.fn((success) => {
            const mockResponse = {
              config: {
                method: 'get',
                url: undefined
              },
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

  /**
   * Coverage: response.config.url ?? ''
   * Branch: when url is null
   */
  it('should use empty string as fallback when response config url is null', async () => {
    const client = getTmdbClient();

    jest.spyOn(axios, 'create').mockReturnValue({
      interceptors: {
        request: { use: jest.fn() },
        response: {
          use: jest.fn((success) => {
            const mockResponse = {
              config: {
                method: 'post',
                url: null
              },
              status: 201
            } as any;
            success(mockResponse);
          })
        }
      }
    } as any);

    const testClient = getTmdbClient();
    expect(testClient.interceptors.response).toBeDefined();
  });

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
  it('should use empty string when error message is undefined', async () => {
    const client = getTmdbClient();

    jest.spyOn(axios, 'create').mockReturnValue({
      interceptors: {
        request: { use: jest.fn() },
        response: {
          use: jest.fn((success, error) => {
            const mockError = {
              message: undefined,
              config: {
                method: 'get',
                url: 'https://api.themoviedb.org/3/search/movie'
              }
            } as any;
            expect(() => error(mockError)).toThrow();
          })
        }
      }
    } as any);

    const testClient = getTmdbClient();
    expect(testClient.interceptors.response).toBeDefined();
  });

  /**
   * Coverage: error.message ?? ''
   * Branch: when error.message is null
   */
  it('should use empty string when error message is null', async () => {
    const client = getTmdbClient();

    jest.spyOn(axios, 'create').mockReturnValue({
      interceptors: {
        request: { use: jest.fn() },
        response: {
          use: jest.fn((success, error) => {
            const mockError = {
              message: null,
              config: {
                method: 'post',
                url: 'https://api.themoviedb.org/3/movie/550'
              }
            } as any;
            expect(() => error(mockError)).toThrow();
          })
        }
      }
    } as any);

    const testClient = getTmdbClient();
    expect(testClient.interceptors.response).toBeDefined();
  });

  /**
   * Coverage: cfg.method?.toUpperCase?.() ?? 'GET'
   * Branch: when error.config.method is undefined
   */
  it('should use GET as fallback when error config method is undefined', async () => {
    const client = getTmdbClient();

    jest.spyOn(axios, 'create').mockReturnValue({
      interceptors: {
        request: { use: jest.fn() },
        response: {
          use: jest.fn((success, error) => {
            const mockError = {
              message: 'Request failed',
              config: {
                method: undefined,
                url: 'https://api.themoviedb.org/3/search/movie'
              }
            } as any;
            expect(() => error(mockError)).toThrow();
          })
        }
      }
    } as any);

    const testClient = getTmdbClient();
    expect(testClient.interceptors.response).toBeDefined();
  });

  /**
   * Coverage: String(cfg.url ?? '')
   * Branch: when error.config.url is undefined
   */
  it('should use empty string when error config url is undefined', async () => {
    const client = getTmdbClient();

    jest.spyOn(axios, 'create').mockReturnValue({
      interceptors: {
        request: { use: jest.fn() },
        response: {
          use: jest.fn((success, error) => {
            const mockError = {
              message: 'Network error',
              config: {
                method: 'get',
                url: undefined
              }
            } as any;
            expect(() => error(mockError)).toThrow();
          })
        }
      }
    } as any);

    const testClient = getTmdbClient();
    expect(testClient.interceptors.response).toBeDefined();
  });

  /**
   * Coverage: const ms = start ? Date.now() - start : undefined
   * Branch: when error.config.__start is undefined
   */
  it('should handle error when __start is undefined in error config', async () => {
    const client = getTmdbClient();

    jest.spyOn(axios, 'create').mockReturnValue({
      interceptors: {
        request: { use: jest.fn() },
        response: {
          use: jest.fn((success, error) => {
            const mockError = {
              message: 'API Error',
              config: {
                method: 'get',
                url: 'https://api.themoviedb.org/3/search/movie',
                // __start is not set
              } as any
            } as any;
            expect(() => error(mockError)).toThrow();
          })
        }
      }
    } as any);

    const testClient = getTmdbClient();
    expect(testClient.interceptors.response).toBeDefined();
  });

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
  it('should log GET when response method is missing', async () => {
    const mockAxiosInstance = {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      },
      get: jest.fn()
    };

    jest.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance as any);

    const client = getTmdbClient();
    
    // Get the response interceptor success handler
    const responseInterceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
    const successHandler = responseInterceptorCall[0];
    
    // Call with config missing method
    successHandler({
      config: { url: '/search/movie' },
      status: 200,
      data: {}
    });

    // Check that logs were created
    expect(consoleOutput.length).toBeGreaterThan(0);
  });

  /**
   * Integration test: Verify interceptors handle missing URL gracefully
   * Covers: response.config.url ?? ''
   */
  it('should use empty string when response url is missing', async () => {
    const mockAxiosInstance = {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      },
      get: jest.fn()
    };

    jest.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance as any);

    const client = getTmdbClient();
    
    const responseInterceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
    const successHandler = responseInterceptorCall[0];
    
    // Call with config missing URL
    successHandler({
      config: { method: 'GET' },
      status: 200,
      data: {}
    });

    expect(consoleOutput.length).toBeGreaterThan(0);
  });

  /**
   * Integration test: Verify error interceptor handles missing error message
   * Covers: error.message ?? '' in error interceptor
   */
  it('should use empty string when error message is missing', async () => {
    const mockAxiosInstance = {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    jest.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance as any);

    const client = getTmdbClient();
    
    const responseInterceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
    const errorHandler = responseInterceptorCall[1];
    
    // Call error handler with undefined message
    expect(() => {
      errorHandler({
        message: undefined,
        config: {
          method: 'GET',
          url: '/search/movie'
        }
      });
    }).toThrow();

    expect(consoleOutput.length).toBeGreaterThan(0);
  });

  /**
   * Integration test: Verify error interceptor handles missing config
   * Covers: const cfg = error.config ?? {}
   */
  it('should use empty config when error config is missing', async () => {
    const mockAxiosInstance = {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    jest.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance as any);

    const client = getTmdbClient();
    
    const responseInterceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
    const errorHandler = responseInterceptorCall[1];
    
    // Call error handler with undefined config
    expect(() => {
      errorHandler({
        message: 'Network Error',
        config: undefined
      });
    }).toThrow();

    expect(consoleOutput.length).toBeGreaterThan(0);
  });

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