import { describe, expect, test } from 'bun:test';
import {
  createSafeDirectoryName,
  generateUniqueName,
  isValidFileName,
  sanitizeFileName,
  sanitizeName,
  sanitizeOriginalName,
  sanitizeOriginalFileName,
  truncateName
} from '../../src/utils/sanitization';

describe('Sanitization Utils', () => {
  describe('sanitizeName', () => {
    test('should convert various formats to snake_case', () => {
      expect(sanitizeName('camelCase')).toBe('camelcase');
      expect(sanitizeName('PascalCase')).toBe('pascalcase');
      expect(sanitizeName('XMLHttpRequest')).toBe('xmlhttprequest');
    });

    test('should handle spaces and special characters', () => {
      expect(sanitizeName('Hello World')).toBe('hello_world');
      expect(sanitizeName('API v1.0')).toBe('api_v10');
      expect(sanitizeName('User-Profile')).toBe('user_profile');
      expect(sanitizeName('test@example.com')).toBe('testexamplecom');
    });

    test('should handle numbers correctly', () => {
      expect(sanitizeName('version2')).toBe('version2');
      expect(sanitizeName('API2Response')).toBe('api2response');
      expect(sanitizeName('test123ABC')).toBe('test123abc');
    });

    test('should handle already clean strings', () => {
      expect(sanitizeName('already_clean')).toBe('already_clean');
      expect(sanitizeName('test_with_numbers_123')).toBe(
        'test_with_numbers_123'
      );
    });

    test('should handle edge cases', () => {
      expect(sanitizeName('')).toBe('unnamed');
      expect(sanitizeName('a')).toBe('a');
      expect(sanitizeName('A')).toBe('a');
      expect(sanitizeName('123')).toBe('_123');
    });

    test('should handle multiple consecutive special characters', () => {
      expect(sanitizeName('test---name')).toBe('test_name');
      expect(sanitizeName('test___name')).toBe('test_name');
      expect(sanitizeName('test   name')).toBe('test_name');
    });

    test('should remove leading/trailing underscores', () => {
      expect(sanitizeName('_test_')).toBe('test');
      expect(sanitizeName('__test__')).toBe('test');
    });
  });

  describe('sanitizeFileName', () => {
    test('should sanitize basic file names', () => {
      expect(sanitizeFileName('My File')).toBe('my_file.json');
      expect(sanitizeFileName('User Profile')).toBe('user_profile.json');
      expect(sanitizeFileName('API Response')).toBe('api_response.json');
    });

    test('should remove invalid file system characters', () => {
      expect(sanitizeFileName('file<name>')).toBe('filename.json');
      expect(sanitizeFileName('file:name')).toBe('filename.json');
      expect(sanitizeFileName('file|name')).toBe('filename.json');
      expect(sanitizeFileName('file?name')).toBe('filename.json');
      expect(sanitizeFileName('file*name')).toBe('filename.json');
    });

    test('should handle custom extensions', () => {
      expect(sanitizeFileName('My File', '.txt')).toBe('my_file.txt');
      expect(sanitizeFileName('Complex File Name', '.md')).toBe(
        'complex_file_name.md'
      );
    });

    test('should handle files without extensions', () => {
      expect(sanitizeFileName('README', '')).toBe('readme');
      expect(sanitizeFileName('My Document', '')).toBe('my_document');
    });

    test('should handle edge cases', () => {
      expect(sanitizeFileName('')).toBe('unnamed.json');
      expect(sanitizeFileName('   ')).toBe('unnamed.json');
      expect(sanitizeFileName('...')).toBe('unnamed.json');
    });
  });

  describe('createSafeDirectoryName', () => {
    test('should create safe directory names', () => {
      expect(createSafeDirectoryName('My Collection')).toBe('my_collection');
      expect(createSafeDirectoryName('API v1')).toBe('api_v1');
      expect(createSafeDirectoryName('User-Data')).toBe('user_data');
    });

    test('should remove invalid characters', () => {
      expect(createSafeDirectoryName('folder<name>')).toBe('foldername');
      expect(createSafeDirectoryName('folder:name')).toBe('foldername');
      expect(createSafeDirectoryName('folder/name')).toBe('foldername');
    });

    test('should handle edge cases', () => {
      expect(createSafeDirectoryName('')).toBe('unnamed');
      expect(createSafeDirectoryName('   ')).toBe('unnamed');
      expect(createSafeDirectoryName('...')).toBe('unnamed');
    });
  });

  describe('isValidFileName', () => {
    test('should validate correct file names', () => {
      expect(isValidFileName('valid_file.txt')).toBe(true);
      expect(isValidFileName('my_document.json')).toBe(true);
      expect(isValidFileName('readme')).toBe(true);
      expect(isValidFileName('file123.txt')).toBe(true);
    });

    test('should reject invalid file names', () => {
      expect(isValidFileName('')).toBe(false);
      expect(isValidFileName('   ')).toBe(false);
      expect(isValidFileName('file<name>')).toBe(false);
      expect(isValidFileName('file:name')).toBe(false);
      expect(isValidFileName('file|name')).toBe(false);
    });

    test('should reject Windows reserved names', () => {
      expect(isValidFileName('CON')).toBe(false);
      expect(isValidFileName('PRN')).toBe(false);
      expect(isValidFileName('AUX')).toBe(false);
      expect(isValidFileName('NUL')).toBe(false);
    });

    test('should reject names that are too long', () => {
      const longName = 'a'.repeat(300);
      expect(isValidFileName(longName)).toBe(false);
    });

    test('should handle case sensitivity', () => {
      expect(isValidFileName('con')).toBe(false);
      expect(isValidFileName('Con')).toBe(false);
      expect(isValidFileName('CON')).toBe(false);
    });
  });

  describe('sanitizeOriginalName', () => {
    test('should preserve spaces and casing', () => {
      expect(sanitizeOriginalName('Create Single')).toBe('Create Single');
      expect(sanitizeOriginalName('Platform v1')).toBe('Platform v1');
    });

    test('should remove invalid characters', () => {
      expect(sanitizeOriginalName('File<Name>')).toBe('FileName');
    });

    test('should prefix names starting with digits', () => {
      expect(sanitizeOriginalName('123abc')).toBe('_123abc');
    });
  });

  describe('sanitizeOriginalFileName', () => {
    test('should append .json extension by default', () => {
      expect(sanitizeOriginalFileName('Create Single')).toBe(
        'Create Single.json'
      );
    });

    test('should support custom extensions', () => {
      expect(sanitizeOriginalFileName('Platform v1', '.txt')).toBe(
        'Platform v1.txt'
      );
    });
  });

  describe('generateUniqueName', () => {
    test('should return original name if unique', () => {
      const existingNames = new Set(['other_name', 'another_name']);
      expect(generateUniqueName('unique_name', existingNames)).toBe(
        'unique_name'
      );
    });

    test('should append counter for duplicate names', () => {
      const existingNames = new Set([
        'test_name',
        'test_name_1',
        'test_name_2'
      ]);
      expect(generateUniqueName('test_name', existingNames)).toBe(
        'test_name_3'
      );
    });

    test('should handle empty existing names set', () => {
      const existingNames = new Set<string>();
      expect(generateUniqueName('test_name', existingNames)).toBe('test_name');
    });
  });

  describe('truncateName', () => {
    test('should not truncate short names', () => {
      expect(truncateName('short_name')).toBe('short_name');
      expect(truncateName('medium_length_name')).toBe('medium_length_name');
    });

    test('should truncate long names', () => {
      const longName = 'a'.repeat(300);
      const truncated = truncateName(longName, 100);
      expect(truncated.length).toBeLessThanOrEqual(100);
    });

    test('should truncate at word boundary when possible', () => {
      const longName =
        'very_long_name_that_should_be_truncated_at_underscore_boundary';
      const truncated = truncateName(longName, 30);
      expect(truncated.length).toBeLessThanOrEqual(30);
      // Should end at an underscore if possible
      expect(truncated.endsWith('_')).toBe(false);
    });

    test('should handle custom max length', () => {
      const name = 'a'.repeat(100);
      const truncated = truncateName(name, 50);
      expect(truncated.length).toBeLessThanOrEqual(50);
    });
  });
});
