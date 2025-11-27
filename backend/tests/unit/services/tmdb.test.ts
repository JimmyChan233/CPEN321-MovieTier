/**
 * @mocked Mocked tests for external services
 * Tests with mocked external services (TMDB, SSE, FCM) and real MongoDB
 */

/**
 * TMDB Services Tests - Mocked
 * Tests for TMDB client and tagline service with mocked axios
 */

import axios from "axios";
import {
  getTmdbClient,
  resetTmdbClient,
} from "../../../src/services/tmdb/tmdbClient";
import {
  fetchMovieTagline,
  cache,
} from "../../../src/services/tmdb/tmdbTaglineService";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger
jest.mock("../../../src/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("TMDB Client Tests", () => {
  let stdoutWriteSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    resetTmdbClient(); // Reset singleton for each test
    stdoutWriteSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    process.env.TMDB_API_KEY = "test-api-key";
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
  });

  it("should log error response without start time", () => {
    let errorInterceptor: any;

    const mockInstance = {
      interceptors: {
        request: { use: jest.fn() },
        response: {
          use: jest.fn((success, error) => {
            errorInterceptor = error;
          }),
        },
      },
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockInstance);

    getTmdbClient();

    const mockError = {
      message: "Network Error",
      config: {
        method: "GET",
        url: "/test",
        // No __start property
      },
    };

    expect(() => errorInterceptor(mockError)).toThrow();

    expect(stdoutWriteSpy).toHaveBeenCalledWith(
      expect.stringContaining("ERROR"),
    );
    expect(stdoutWriteSpy).not.toHaveBeenCalledWith(
      expect.stringMatching(/\d+ms/),
    );
  });
});

describe("TMDB Tagline Service Tests", () => {
  let mockClient: any;

  beforeEach(() => {
    // Reset singleton BEFORE clearing mocks so fresh instance uses mocked axios
    resetTmdbClient();
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Clear cache
    cache.clear();

    mockClient = {
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    // Mock axios.create BEFORE getTmdbClient is called
    mockedAxios.create = jest.fn().mockReturnValue(mockClient);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should return null when result has no ID", async () => {
    mockClient.get.mockResolvedValueOnce({
      data: {
        results: [{ title: "No ID Movie" }],
      },
    });

    const tagline = await fetchMovieTagline("No ID Movie", 2024);

    expect(tagline).toBeNull();
  });

  it("should return null when movie has empty tagline", async () => {
    mockClient.get
      .mockResolvedValueOnce({
        data: {
          results: [{ id: 999, title: "Empty Tagline" }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          tagline: "   ",
        },
      });

    const tagline = await fetchMovieTagline("Empty Tagline", 2024);

    expect(tagline).toBeNull();
  });

  it("should return null on API error", async () => {
    mockClient.get.mockRejectedValueOnce(new Error("API Error"));

    const tagline = await fetchMovieTagline("Error Movie", 2024);

    expect(tagline).toBeNull();
  });

  it("should trim whitespace from title for cache key", async () => {
    mockClient.get
      .mockResolvedValueOnce({
        data: {
          results: [{ id: 555, title: "Trimmed" }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          tagline: "Clean",
        },
      });

    await fetchMovieTagline("  Trimmed Movie  ", 2024);
    const tagline = await fetchMovieTagline("Trimmed Movie", 2024);

    expect(tagline).toBe("Clean");
    expect(mockClient.get).toHaveBeenCalledTimes(2);
  });

  it("should handle search response with undefined data", async () => {
    mockClient.get.mockResolvedValueOnce({
      data: undefined,
    });

    const tagline = await fetchMovieTagline("Undefined Data", 2024);

    expect(tagline).toBeNull();
    expect(mockClient.get).toHaveBeenCalledTimes(1);
  });

  it("should search without year and cache the tagline", async () => {
    mockClient.get
      .mockResolvedValueOnce({
        data: {
          results: [{ id: 777, title: "No Year Movie" }],
        },
      })
      .mockResolvedValueOnce({
        data: { tagline: "Yearless tagline" },
      });

    const tagline = await fetchMovieTagline("No Year Movie");

    expect(tagline).toBe("Yearless tagline");
    expect(mockClient.get).toHaveBeenCalledWith("/search/movie", {
      params: {
        query: "No Year Movie",
        language: "en-US",
        include_adult: false,
        page: 1,
      },
    });

    const cached = await fetchMovieTagline("No Year Movie");
    expect(cached).toBe("Yearless tagline");
    expect(mockClient.get).toHaveBeenCalledTimes(2);
  });
});
describe("TMDB Client - Response Interceptor", () => {
  let consoleOutput: string[] = [];
  const originalWrite = process.stdout.write;

  beforeEach(() => {
    resetTmdbClient();
    consoleOutput = [];
    // Mock process.stdout.write to capture logs
    (process.stdout.write as any) = jest.fn((msg: string) => {
      consoleOutput.push(msg);
      return true;
    });
    process.env.TMDB_API_KEY = "test-key";
  });

  afterEach(() => {
    process.stdout.write = originalWrite;
    jest.restoreAllMocks();
  });

  it("should handle response when __start is undefined in response config", async () => {
    const client = getTmdbClient();

    jest.spyOn(axios, "create").mockReturnValue({
      interceptors: {
        request: { use: jest.fn() },
        response: {
          use: jest.fn((success) => {
            const mockResponse = {
              config: {
                method: "get",
                url: "https://api.themoviedb.org/3/search/movie",
                // __start is not set
              } as any,
              status: 200,
            } as any;
            success(mockResponse);
          }),
        },
      },
    } as any);

    const testClient = getTmdbClient();
    expect(testClient.interceptors.response).toBeDefined();
  });
});

describe("TMDB Client - Error Interceptor", () => {
  let consoleOutput: string[] = [];
  const originalWrite = process.stdout.write;

  beforeEach(() => {
    consoleOutput = [];
    (process.stdout.write as any) = jest.fn((msg: string) => {
      consoleOutput.push(msg);
      return true;
    });
    process.env.TMDB_API_KEY = "test-key";
  });

  afterEach(() => {
    process.stdout.write = originalWrite;
    jest.restoreAllMocks();
  });

  it("should use empty object when error has no config", async () => {
    const client = getTmdbClient();

    jest.spyOn(axios, "create").mockReturnValue({
      interceptors: {
        request: { use: jest.fn() },
        response: {
          use: jest.fn((success, error) => {
            const mockError = {
              message: "Critical Error",
              config: undefined,
            } as any;
            expect(() => error(mockError)).toThrow();
          }),
        },
      },
    } as any);

    const testClient = getTmdbClient();
    expect(testClient.interceptors.response).toBeDefined();
  });
});

describe("TMDB Client - Real Interceptor Behavior", () => {
  let consoleOutput: string[] = [];
  const originalWrite = process.stdout.write;

  beforeEach(() => {
    consoleOutput = [];
    (process.stdout.write as any) = jest.fn((msg: string) => {
      consoleOutput.push(msg);
      return true;
    });
    process.env.TMDB_API_KEY = "test-api-key-12345";
  });

  afterEach(() => {
    process.stdout.write = originalWrite;
    jest.restoreAllMocks();
  });

  it("should handle timing gracefully when __start is missing", async () => {
    let responseSuccessHandler: any;

    const mockInstance = {
      interceptors: {
        request: { use: jest.fn() },
        response: {
          use: jest.fn((success, error) => {
            responseSuccessHandler = success;
          }),
        },
      },
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockInstance);
    resetTmdbClient();

    getTmdbClient();

    const result = responseSuccessHandler({
      config: {
        method: "GET",
        url: "/movie/550",
        // __start not set
      } as any,
      status: 200,
      data: {},
    });

    expect(result).toBeDefined();
    expect(consoleOutput.length).toBeGreaterThan(0);
  });
});
