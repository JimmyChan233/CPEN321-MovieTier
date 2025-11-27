/**
 * @unit Unit tests for logger utility
 */

/**
 * Logger Utility Tests
 * Unit tests for custom logger utility
 */

import { logger } from "../../../src/utils/logger";

describe("Logger Utility", () => {
  let stdoutWriteSpy: jest.SpyInstance;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    stdoutWriteSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  describe("info", () => {
    it("should log info message with INFO prefix", () => {
      logger.info("Test info message");

      expect(stdoutWriteSpy).toHaveBeenCalled();
      const call = stdoutWriteSpy.mock.calls[0][0];
      expect(call).toContain("INFO");
      expect(call).toContain("Test info message");
    });

    it("should handle info with multiple arguments", () => {
      logger.info("User action", { userId: 123, action: "login" });

      const call = stdoutWriteSpy.mock.calls[0][0];
      expect(call).toContain("User action");
      expect(call).toContain("userId");
    });
  });

  describe("success", () => {
    it("should log success message with SUCCESS prefix", () => {
      logger.success("Operation completed");

      expect(stdoutWriteSpy).toHaveBeenCalled();
      const call = stdoutWriteSpy.mock.calls[0][0];
      expect(call).toContain("SUCCESS");
      expect(call).toContain("Operation completed");
    });

    it("should handle success with additional context", () => {
      logger.success("User registered", { userId: 456 });

      const call = stdoutWriteSpy.mock.calls[0][0];
      expect(call).toContain("User registered");
    });
  });

  describe("warn", () => {
    it("should log warning message with WARN prefix", () => {
      logger.warn("Potential issue detected");

      expect(stdoutWriteSpy).toHaveBeenCalled();
      const call = stdoutWriteSpy.mock.calls[0][0];
      expect(call).toContain("WARN");
      expect(call).toContain("Potential issue detected");
    });

    it("should handle warn with data object", () => {
      logger.warn("API rate limit approaching", { remaining: 10 });

      const call = stdoutWriteSpy.mock.calls[0][0];
      expect(call).toContain("API rate limit");
    });
  });

  describe("error", () => {
    it("should log error message with ERROR prefix", () => {
      logger.error("Critical error occurred");

      expect(stdoutWriteSpy).toHaveBeenCalled();
      const call = stdoutWriteSpy.mock.calls[0][0];
      expect(call).toContain("ERROR");
      expect(call).toContain("Critical error occurred");
    });

    it("should handle error with exception details", () => {
      const error = new Error("Test error");
      logger.error("Exception", error);

      const call = stdoutWriteSpy.mock.calls[0][0];
      expect(call).toContain("ERROR");
    });
  });

  describe("debug", () => {
    it("should log debug with detailed data in development", () => {
      process.env.NODE_ENV = "development";

      logger.debug("State dump", {
        user: { id: 1, name: "Test" },
        session: { active: true },
      });

      expect(stdoutWriteSpy).toHaveBeenCalledTimes(1);
      const call = stdoutWriteSpy.mock.calls[0][0];
      expect(call).toContain("DEBUG");
      expect(call).toContain("State dump");
    });
  });

  describe("http", () => {
    it("should use red color for status >= 400", () => {
      logger.http("GET", "/api/error", 404);

      const call = stdoutWriteSpy.mock.calls[0][0];
      expect(call).toContain("404");
      expect(stdoutWriteSpy).toHaveBeenCalled();
    });
  });

  describe("Timestamp formatting", () => {
    it("should include timestamp in every log message", () => {
      logger.info("Test message");

      const call = stdoutWriteSpy.mock.calls[0][0];
      // Timestamp format: YYYY-MM-DD HH:MM:SS
      expect(call).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  describe("Argument formatting", () => {
    it("should handle null and undefined arguments", () => {
      logger.info("Message", null, undefined);

      const call = stdoutWriteSpy.mock.calls[0][0];
      expect(call).toContain("null");
      expect(call).toContain("undefined");
    });
  });

  describe("Integration scenarios", () => {
    it("should handle rapid successive log calls", () => {
      logger.info("First message");
      logger.warn("Second message");
      logger.error("Third message");

      expect(stdoutWriteSpy).toHaveBeenCalledTimes(3);
    });

    it("should maintain correct format across different log types", () => {
      const messages = ["info", "success", "warn", "error"];
      const logMethods: Record<string, (msg: string) => void> = {
        info: (msg) => logger.info(msg),
        success: (msg) => logger.success(msg),
        warn: (msg) => logger.warn(msg),
        error: (msg) => logger.error(msg),
      };

      messages.forEach((method) => {
        stdoutWriteSpy.mockClear();
        logMethods[method](`Test ${method}`);
        expect(stdoutWriteSpy).toHaveBeenCalled();
      });
    });
  });
});
