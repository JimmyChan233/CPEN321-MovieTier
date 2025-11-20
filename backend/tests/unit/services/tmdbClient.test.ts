/**
 * Unit tests for TMDB client interceptors
 */

import {
  handleTmdbRequestIntercept,
  handleTmdbResponseSuccess,
  handleTmdbResponseError,
} from "../../../src/services/tmdb/tmdbClient";
import { InternalAxiosRequestConfig, AxiosResponse } from "axios";

describe("TMDB Client Interceptors", () => {
  const originalEnv = process.env.TMDB_API_KEY;

  beforeEach(() => {
    process.env.TMDB_API_KEY = "test-api-key";
    jest.spyOn(global.console, "log").mockImplementation();
  });

  afterEach(() => {
    process.env.TMDB_API_KEY = originalEnv;
    jest.restoreAllMocks();
  });

  describe("handleTmdbRequestIntercept", () => {
    it("should add API key to params when params exist", () => {
      const config = {
        method: "GET",
        url: "/movie/550",
        params: { language: "en-US" },
      } as InternalAxiosRequestConfig;

      const result = handleTmdbRequestIntercept(config);

      expect(result.params).toEqual({
        language: "en-US",
        api_key: "test-api-key",
      });
    });

    it("should add API key to params when params are undefined", () => {
      const config = {
        method: "GET",
        url: "/movie/550",
        params: undefined,
      } as InternalAxiosRequestConfig;

      const result = handleTmdbRequestIntercept(config);

      expect(result.params).toEqual({
        api_key: "test-api-key",
      });
    });

    it("should set __start timestamp", () => {
      const config = {
        method: "GET",
        url: "/movie/550",
        params: {},
      } as InternalAxiosRequestConfig;

      const result = handleTmdbRequestIntercept(config);

      expect((result as any).__start).toBeDefined();
      expect(typeof (result as any).__start).toBe("number");
    });

    it("should handle non-string method", () => {
      const config = {
        method: undefined,
        url: "/movie/550",
        params: {},
      } as any;

      const result = handleTmdbRequestIntercept(config);

      expect(result.params.api_key).toBe("test-api-key");
    });

    it("should handle non-string URL", () => {
      const config = {
        method: "GET",
        url: undefined,
        params: {},
      } as any;

      const result = handleTmdbRequestIntercept(config);

      expect(result.params.api_key).toBe("test-api-key");
    });
  });

  describe("handleTmdbResponseSuccess", () => {
    it("should log successful response with timing", () => {
      const now = Date.now();
      const config = {
        method: "get",
        url: "/movie/550",
        params: {},
      } as any;

      const response = {
        status: 200,
        config,
        data: {},
      } as AxiosResponse;

      (response.config as any).__start = now;

      const result = handleTmdbResponseSuccess(response);

      expect(result).toEqual(response);
    });

    it("should handle response without timing", () => {
      const config = {
        method: "GET",
        url: "/movie/550",
        params: {},
      } as any;

      const response = {
        status: 200,
        config,
        data: {},
      } as AxiosResponse;

      const result = handleTmdbResponseSuccess(response);

      expect(result).toEqual(response);
    });

    it("should handle non-string method and URL", () => {
      const config = {
        method: undefined,
        url: undefined,
        params: {},
      } as any;

      const response = {
        status: 200,
        config,
        data: {},
      } as AxiosResponse;

      const result = handleTmdbResponseSuccess(response);

      expect(result).toEqual(response);
    });
  });

  describe("handleTmdbResponseError", () => {
    it("should throw and log axios error", () => {
      const error = new Error("Network error");
      (error as any).config = { method: "GET", url: "/movie/550" };
      (error as any).isAxiosError = true;

      const axiosError = {
        isAxiosError: true,
        message: "Network error",
        config: { method: "GET", url: "/movie/550" },
      } as any;

      expect(() => {
        handleTmdbResponseError(axiosError);
      }).toThrow();
    });

    it("should handle axios error with timing", () => {
      const now = Date.now();
      const axiosError = {
        isAxiosError: true,
        message: "API Error",
        config: {
          method: "GET",
          url: "/movie/550",
          __start: now,
        },
      } as any;

      expect(() => {
        handleTmdbResponseError(axiosError);
      }).toThrow();
    });

    it("should handle non-axios error that is an Error instance", () => {
      const error = new Error("Custom error message");

      expect(() => {
        handleTmdbResponseError(error);
      }).toThrow("Custom error message");
    });

    it("should handle non-Error, non-axios error", () => {
      const error = "String error";

      expect(() => {
        handleTmdbResponseError(error);
      }).toThrow("String error");
    });

    it("should handle null/undefined error", () => {
      expect(() => {
        handleTmdbResponseError(null);
      }).toThrow("Unknown TMDB error");

      expect(() => {
        handleTmdbResponseError(undefined);
      }).toThrow("Unknown TMDB error");
    });

    it("should handle axios error with undefined config", () => {
      const axiosError = {
        isAxiosError: true,
        message: "API Error",
        config: undefined,
      } as any;

      expect(() => {
        handleTmdbResponseError(axiosError);
      }).toThrow();
    });
  });
});
