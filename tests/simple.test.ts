import { describe, test, expect } from "bun:test";
import { sanitizeName, sanitizeFileName } from "../src/utils/sanitization";

describe("Simple Functionality Tests", () => {
  describe("Sanitization", () => {
    test("should sanitize basic names", () => {
      expect(sanitizeName("Hello World")).toBe("hello_world");
      expect(sanitizeName("API v1.0")).toBe("api_v10");
      expect(sanitizeName("User-Profile")).toBe("user_profile");
    });

    test("should sanitize file names", () => {
      expect(sanitizeFileName("My File")).toBe("my_file.json");
      expect(sanitizeFileName("API Response", ".txt")).toBe("api_response.txt");
    });

    test("should handle edge cases", () => {
      expect(sanitizeName("")).toBe("unnamed");
      expect(sanitizeName("   ")).toBe("unnamed");
      expect(sanitizeName("123")).toBe("_123");
    });
  });

  describe("Basic validation", () => {
    test("should pass basic assertions", () => {
      expect(1 + 1).toBe(2);
      expect("hello").toContain("ell");
      expect([1, 2, 3]).toHaveLength(3);
    });
  });
}); 