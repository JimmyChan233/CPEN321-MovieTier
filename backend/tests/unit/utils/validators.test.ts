/**
 * @unit Unit tests for validators utility
 */

/**
 * Validators Utility Tests
 * Tests for email, MongoDB ID, string, number, boolean, and search query validation functions
 */

import {
  isValidEmail,
  isValidMongoId,
  isValidString,
  isValidNumber,
  isValidBoolean,
  isValidSearchQuery,
  validateUserId,
} from "../../../src/utils/validators";

describe("Unit: validators", () => {
  describe("isValidEmail", () => {
    it("should return true for valid email", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name+tag@example.co.uk")).toBe(true);
    });

    it("should return false for invalid email", () => {
      expect(isValidEmail("invalid")).toBe(false);
      expect(isValidEmail("invalid@")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail(123)).toBe(false);
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
    });
  });

  describe("isValidMongoId", () => {
    it("should return true for valid MongoDB ObjectId", () => {
      expect(isValidMongoId("507f1f77bcf86cd799439011")).toBe(true);
      expect(isValidMongoId("507F1F77BCF86CD799439011")).toBe(true);
    });

    it("should return false for invalid MongoDB ObjectId", () => {
      expect(isValidMongoId("507f1f77bcf86cd79943901")).toBe(false); // too short
      expect(isValidMongoId("507f1f77bcf86cd7994390111")).toBe(false); // too long
      expect(isValidMongoId("invalid-id")).toBe(false);
      expect(isValidMongoId(123)).toBe(false);
      expect(isValidMongoId(null)).toBe(false);
    });
  });

  describe("isValidString", () => {
    it("should return true for valid string", () => {
      expect(isValidString("test")).toBe(true);
      expect(isValidString("test", 1)).toBe(true);
      expect(isValidString("test", 4)).toBe(true);
    });

    it("should return false for invalid string", () => {
      expect(isValidString("")).toBe(false);
      expect(isValidString("   ")).toBe(false);
      expect(isValidString("ab", 3)).toBe(false);
      expect(isValidString(123)).toBe(false);
      expect(isValidString(null)).toBe(false);
      expect(isValidString(undefined)).toBe(false);
    });
  });

  describe("isValidNumber", () => {
    it("should return true for valid number", () => {
      expect(isValidNumber(123)).toBe(true);
      expect(isValidNumber(0)).toBe(true);
      expect(isValidNumber(-5)).toBe(true);
      expect(isValidNumber(3.14)).toBe(true);
    });

    it("should return false for invalid number", () => {
      expect(isValidNumber(NaN)).toBe(false);
      expect(isValidNumber("123")).toBe(false);
      expect(isValidNumber(null)).toBe(false);
      expect(isValidNumber(undefined)).toBe(false);
    });
  });

  describe("isValidBoolean", () => {
    it("should return true for valid boolean", () => {
      expect(isValidBoolean(true)).toBe(true);
      expect(isValidBoolean(false)).toBe(true);
    });

    it("should return false for invalid boolean", () => {
      expect(isValidBoolean(1)).toBe(false);
      expect(isValidBoolean(0)).toBe(false);
      expect(isValidBoolean("true")).toBe(false);
      expect(isValidBoolean(null)).toBe(false);
      expect(isValidBoolean(undefined)).toBe(false);
    });
  });

  describe("isValidSearchQuery", () => {
    it("should return true for valid search query", () => {
      expect(isValidSearchQuery("ab")).toBe(true);
      expect(isValidSearchQuery("search query")).toBe(true);
      expect(isValidSearchQuery("abc def ghi")).toBe(true);
    });

    it("should return false for invalid search query", () => {
      expect(isValidSearchQuery("a")).toBe(false);
      expect(isValidSearchQuery("")).toBe(false);
      expect(isValidSearchQuery(123)).toBe(false);
      expect(isValidSearchQuery(null)).toBe(false);
    });
  });

  describe("validateUserId", () => {
    it("should return true for valid userId", () => {
      expect(validateUserId("507f1f77bcf86cd799439011")).toBe(true);
      expect(validateUserId("user123")).toBe(true);
    });

    it("should return false for invalid userId", () => {
      expect(validateUserId("")).toBe(false);
      expect(validateUserId(123)).toBe(false);
      expect(validateUserId(null)).toBe(false);
      expect(validateUserId(undefined)).toBe(false);
    });
  });
});
