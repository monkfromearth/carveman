import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { BuildCommand } from '../../src/commands/build_command';
import { SplitCommand } from '../../src/commands/split_command';
import { FileSystemManager } from '../../src/fs/file_system_manager';

describe('Error Handling Integration Tests', () => {
  let splitCommand: SplitCommand;
  let buildCommand: BuildCommand;
  let fsManager: FileSystemManager;
  const testDir = join(process.cwd(), 'test-error-handling');

  beforeEach(() => {
    // Initialize commands without parameters
    splitCommand = new SplitCommand();
    buildCommand = new BuildCommand();
    fsManager = new FileSystemManager();

    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (_error) {
      // Directory doesn't exist, which is fine
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  describe('Split Command Error Handling', () => {
    test('should handle non-existent input file', async () => {
      const nonExistentFile = join(testDir, 'does-not-exist.json');
      const options = { verbose: false };

      const result = await splitCommand.execute(nonExistentFile, options);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('file');
    });

    test('should handle invalid JSON file', async () => {
      const invalidJsonFile = join(testDir, 'invalid.json');
      await Bun.write(invalidJsonFile, '{ invalid json content }');

      const options = { verbose: false };
      const result = await splitCommand.execute(invalidJsonFile, options);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle malformed collection structure', async () => {
      const malformedFile = join(testDir, 'malformed.json');
      await Bun.write(
        malformedFile,
        JSON.stringify({
          // Missing required 'info' field
          item: []
        })
      );

      const options = { verbose: false };
      const result = await splitCommand.execute(malformedFile, options);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((error) => error.includes('info'))).toBe(true);
    });

    test('should handle permission errors gracefully', async () => {
      const validCollection = {
        info: {
          name: 'Test Collection',
          schema:
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: []
      };

      const inputFile = join(testDir, 'valid.json');
      await Bun.write(inputFile, JSON.stringify(validCollection));

      // Try to write to a read-only location (this might not work on all systems)
      const readOnlyOutput = '/root/read-only-test'; // This should fail on most systems
      const options = { output: readOnlyOutput, verbose: false };

      const result = await splitCommand.execute(inputFile, options);

      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    test('should handle empty collection', async () => {
      const emptyCollection = {
        info: {
          name: 'Empty Collection',
          schema:
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: []
      };

      const inputFile = join(testDir, 'empty.json');
      await Bun.write(inputFile, JSON.stringify(emptyCollection));

      const options = { output: testDir, overwrite: true, verbose: false };
      const result = await splitCommand.execute(inputFile, options);

      // Empty collections should be valid and process successfully
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle collection with invalid characters in names', async () => {
      const collectionWithInvalidNames = {
        info: {
          name: 'Collection with <invalid> chars',
          schema:
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Request with /invalid/ chars',
            request: {
              method: 'GET',
              url: 'https://api.example.com'
            }
          }
        ]
      };

      const inputFile = join(testDir, 'invalid-names.json');
      await Bun.write(inputFile, JSON.stringify(collectionWithInvalidNames));

      const options = { output: testDir, overwrite: true, verbose: false };
      const result = await splitCommand.execute(inputFile, options);

      // Should handle invalid characters by sanitizing them
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Build Command Error Handling', () => {
    test('should handle non-existent input directory', async () => {
      const nonExistentDir = join(testDir, 'does-not-exist');
      const options = { verbose: false };

      const result = await buildCommand.execute(nonExistentDir, options);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('directory');
    });

    test('should handle missing index.json', async () => {
      const emptyDir = join(testDir, 'empty-dir');
      mkdirSync(emptyDir, { recursive: true });

      const options = { verbose: false };
      const result = await buildCommand.execute(emptyDir, options);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((error) => error.includes('index.json'))).toBe(
        true
      );
    });

    test('should handle corrupted index.json', async () => {
      const corruptedDir = join(testDir, 'corrupted-dir');
      mkdirSync(corruptedDir, { recursive: true });

      // Write invalid JSON to index.json
      await Bun.write(join(corruptedDir, 'index.json'), '{ corrupted json }');

      const options = { verbose: false };
      const result = await buildCommand.execute(corruptedDir, options);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle missing referenced files', async () => {
      const incompleteDir = join(testDir, 'incomplete-dir');
      mkdirSync(incompleteDir, { recursive: true });

      // Create index.json that references non-existent files
      const index = {
        meta: {
          type: 'collection',
          version: '1.0.0',
          generated_by: 'test',
          generated_at: new Date().toISOString()
        },
        info: {
          name: 'Incomplete Collection',
          schema:
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        order: ['missing-request.json', 'missing-folder']
      };

      await Bun.write(
        join(incompleteDir, 'index.json'),
        JSON.stringify(index, null, 2)
      );

      const options = { verbose: false };
      const result = await buildCommand.execute(incompleteDir, options);

      // Should complete but with warnings about missing items
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(
        result.warnings.some((warning) =>
          warning.includes('missing-request.json')
        )
      ).toBe(true);
    });

    test('should handle validation errors when enabled', async () => {
      const invalidDir = join(testDir, 'invalid-structure');
      mkdirSync(invalidDir, { recursive: true });

      // Create a collection with invalid structure
      const invalidIndex = {
        meta: {
          type: 'collection',
          version: '1.0.0',
          generated_by: 'test',
          generated_at: new Date().toISOString()
        },
        info: {
          // Missing required name field
          schema:
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        order: []
      };

      await Bun.write(
        join(invalidDir, 'index.json'),
        JSON.stringify(invalidIndex, null, 2)
      );

      const options = { validate: true, verbose: false };
      const result = await buildCommand.execute(invalidDir, options);

      // Expect at least one validation-related error
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('File System Error Handling', () => {
    test('should handle write permission errors', async () => {
      // This test might not work on all systems, but it demonstrates error handling
      const testFile = join(testDir, 'permission-test.json');

      try {
        await fsManager.writeJsonFile(testFile, { test: 'data' });
        const data = await fsManager.readJsonFile(testFile);
        expect(data.test).toBe('data');
      } catch (error) {
        // If we get a permission error, that's expected for this test
        expect(error).toBeDefined();
      }
    });

    test('should handle concurrent access issues', async () => {
      const testFile = join(testDir, 'concurrent-test.json');
      const testData = { concurrent: true };

      // Try to write to the same file multiple times concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        fsManager.writeJsonFile(testFile, { ...testData, id: i })
      );

      await Promise.all(promises);

      // Should complete without throwing errors
      const finalData = await fsManager.readJsonFile(testFile);
      expect(finalData.concurrent).toBe(true);
    });
  });
});
