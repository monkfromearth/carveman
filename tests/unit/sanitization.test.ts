import { describe, test, expect } from "bun:test";
import { 
  toSnakeCase, 
  sanitizeFileName, 
  sanitizeFolderName, 
  isValidFileName 
} from "../../src/utils/sanitization";

describe("Sanitization Utils", () => {
  describe("toSnakeCase", () => {
    test("should convert camelCase to snake_case", () => {
      expect(toSnakeCase("camelCase")).toBe("camel_case");
      expect(toSnakeCase("myVariableName")).toBe("my_variable_name");
      expect(toSnakeCase("XMLHttpRequest")).toBe("xml_http_request");
    });

    test("should convert PascalCase to snake_case", () => {
      expect(toSnakeCase("PascalCase")).toBe("pascal_case");
      expect(toSnakeCase("MyClassName")).toBe("my_class_name");
      expect(toSnakeCase("HTTPSConnection")).toBe("https_connection");
    });

    test("should handle spaces and special characters", () => {
      expect(toSnakeCase("Hello World")).toBe("hello_world");
      expect(toSnakeCase("API v1.0")).toBe("api_v1_0");
      expect(toSnakeCase("User-Profile")).toBe("user_profile");
      expect(toSnakeCase("test@example.com")).toBe("test_example_com");
    });

    test("should handle numbers correctly", () => {
      expect(toSnakeCase("version2")).toBe("version2");
      expect(toSnakeCase("API2Response")).toBe("api2_response");
      expect(toSnakeCase("test123ABC")).toBe("test123_abc");
    });

    test("should handle already snake_case strings", () => {
      expect(toSnakeCase("already_snake_case")).toBe("already_snake_case");
      expect(toSnakeCase("test_with_numbers_123")).toBe("test_with_numbers_123");
    });

    test("should handle edge cases", () => {
      expect(toSnakeCase("")).toBe("");
      expect(toSnakeCase("a")).toBe("a");
      expect(toSnakeCase("A")).toBe("a");
      expect(toSnakeCase("123")).toBe("123");
    });

    test("should handle multiple consecutive uppercase letters", () => {
      expect(toSnakeCase("XMLParser")).toBe("xml_parser");
      expect(toSnakeCase("HTTPSRequest")).toBe("https_request");
      expect(toSnakeCase("JSONToXML")).toBe("json_to_xml");
    });

    test("should handle unicode characters", () => {
      expect(toSnakeCase("café")).toBe("café");
      expect(toSnakeCase("naïve")).toBe("naïve");
      expect(toSnakeCase("résumé")).toBe("résumé");
    });
  });

  describe("sanitizeFileName", () => {
    test("should sanitize basic file names", () => {
      expect(sanitizeFileName("My File.txt")).toBe("my_file.txt");
      expect(sanitizeFileName("User Profile")).toBe("user_profile");
      expect(sanitizeFileName("API Response")).toBe("api_response");
    });

    test("should remove invalid file system characters", () => {
      expect(sanitizeFileName("file<name>")).toBe("file_name_");
      expect(sanitizeFileName("file:name")).toBe("file_name");
      expect(sanitizeFileName("file|name")).toBe("file_name");
      expect(sanitizeFileName("file?name")).toBe("file_name");
      expect(sanitizeFileName("file*name")).toBe("file_name");
    });

    test("should handle Windows reserved names", () => {
      expect(sanitizeFileName("CON")).toBe("con_");
      expect(sanitizeFileName("PRN")).toBe("prn_");
      expect(sanitizeFileName("AUX")).toBe("aux_");
      expect(sanitizeFileName("NUL")).toBe("nul_");
      expect(sanitizeFileName("COM1")).toBe("com1_");
      expect(sanitizeFileName("LPT1")).toBe("lpt1_");
    });

    test("should preserve file extensions", () => {
      expect(sanitizeFileName("My File.json")).toBe("my_file.json");
      expect(sanitizeFileName("Complex.File.Name.txt")).toBe("complex_file_name.txt");
      expect(sanitizeFileName("file.tar.gz")).toBe("file.tar.gz");
    });

    test("should handle files without extensions", () => {
      expect(sanitizeFileName("README")).toBe("readme");
      expect(sanitizeFileName("My Document")).toBe("my_document");
    });

    test("should handle edge cases", () => {
      expect(sanitizeFileName("")).toBe("untitled");
      expect(sanitizeFileName("   ")).toBe("untitled");
      expect(sanitizeFileName("...")).toBe("untitled");
      expect(sanitizeFileName(".hidden")).toBe("hidden");
    });

    test("should limit length", () => {
      const longName = "a".repeat(300) + ".txt";
      const sanitized = sanitizeFileName(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
      expect(sanitized.endsWith(".txt")).toBe(true);
    });
  });

  describe("sanitizeFolderName", () => {
    test("should sanitize basic folder names", () => {
      expect(sanitizeFolderName("My Folder")).toBe("my_folder");
      expect(sanitizeFolderName("API v1")).toBe("api_v1");
      expect(sanitizeFolderName("User-Data")).toBe("user_data");
    });

    test("should remove invalid characters", () => {
      expect(sanitizeFolderName("folder<name>")).toBe("folder_name_");
      expect(sanitizeFolderName("folder:name")).toBe("folder_name");
      expect(sanitizeFolderName("folder/name")).toBe("folder_name");
    });

    test("should handle Windows reserved names", () => {
      expect(sanitizeFolderName("CON")).toBe("con_");
      expect(sanitizeFolderName("PRN")).toBe("prn_");
      expect(sanitizeFolderName("AUX")).toBe("aux_");
    });

    test("should handle edge cases", () => {
      expect(sanitizeFolderName("")).toBe("untitled");
      expect(sanitizeFolderName("   ")).toBe("untitled");
      expect(sanitizeFolderName("...")).toBe("untitled");
    });

    test("should limit length", () => {
      const longName = "a".repeat(300);
      const sanitized = sanitizeFolderName(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
    });
  });

  describe("isValidFileName", () => {
    test("should validate correct file names", () => {
      expect(isValidFileName("valid_file.txt")).toBe(true);
      expect(isValidFileName("my_document.json")).toBe(true);
      expect(isValidFileName("readme")).toBe(true);
      expect(isValidFileName("file123.txt")).toBe(true);
    });

    test("should reject invalid file names", () => {
      expect(isValidFileName("")).toBe(false);
      expect(isValidFileName("   ")).toBe(false);
      expect(isValidFileName("file<name>")).toBe(false);
      expect(isValidFileName("file:name")).toBe(false);
      expect(isValidFileName("file|name")).toBe(false);
    });

    test("should reject Windows reserved names", () => {
      expect(isValidFileName("CON")).toBe(false);
      expect(isValidFileName("PRN")).toBe(false);
      expect(isValidFileName("AUX")).toBe(false);
      expect(isValidFileName("NUL")).toBe(false);
    });

    test("should reject names that are too long", () => {
      const longName = "a".repeat(300);
      expect(isValidFileName(longName)).toBe(false);
    });

    test("should handle case sensitivity", () => {
      expect(isValidFileName("con")).toBe(false);
      expect(isValidFileName("Con")).toBe(false);
      expect(isValidFileName("CON")).toBe(false);
    });
  });
}); 