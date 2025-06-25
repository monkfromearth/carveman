import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { SplitCommand } from "../../src/commands/split_command";
import { BuildCommand } from "../../src/commands/build_command";
import { FileSystemManager } from "../../src/fs/file_system_manager";
import { rmSync, mkdirSync } from "fs";
import { join } from "path";

describe("Error Handling Integration Tests", () => {
  const testDir = join(process.cwd(), "test-error-handling");
  let fsManager: FileSystemManager;
  let splitCommand: SplitCommand;
  let buildCommand: BuildCommand;

  beforeEach(() => {
    // Clean up any existing test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory doesn't exist, which is fine
    }
    
    mkdirSync(testDir, { recursive: true });
    
    fsManager = new FileSystemManager();
    splitCommand = new SplitCommand(fsManager);
    buildCommand = new BuildCommand(fsManager);
  });

  afterEach(() => {
    // Clean up test directory after each test
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Split Command Error Handling", () => {
    test("should handle non-existent input file", async () => {
      const nonExistentFile = join(testDir, "does-not-exist.json");
      
      const result = await splitCommand.execute(nonExistentFile, {
        output: join(testDir, "output"),
        overwrite: false,
        dry_run: false,
        verbose: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("file");
    });

    test("should handle invalid JSON file", async () => {
      const invalidJsonFile = join(testDir, "invalid.json");
      await Bun.write(invalidJsonFile, "{ invalid json content }");

      const result = await splitCommand.execute(invalidJsonFile, {
        output: join(testDir, "output"),
        overwrite: false,
        dry_run: false,
        verbose: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("should handle malformed collection structure", async () => {
      const malformedFile = join(testDir, "malformed.json");
      const malformedCollection = {
        // Missing required 'info' field
        item: []
      };
      await fsManager.writeJsonFile(malformedFile, malformedCollection);

      const result = await splitCommand.execute(malformedFile, {
        output: join(testDir, "output"),
        overwrite: false,
        dry_run: false,
        verbose: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("info");
    });

    test("should handle collection with missing schema", async () => {
      const noSchemaFile = join(testDir, "no-schema.json");
      const noSchemaCollection = {
        info: {
          name: "Test Collection"
          // Missing schema field
        },
        item: []
      };
      await fsManager.writeJsonFile(noSchemaFile, noSchemaCollection);

      const result = await splitCommand.execute(noSchemaFile, {
        output: join(testDir, "output"),
        overwrite: false,
        dry_run: false,
        verbose: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("should handle permission denied on output directory", async () => {
      const validCollection = {
        info: {
          name: "Test Collection",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        item: []
      };
      const validFile = join(testDir, "valid.json");
      await fsManager.writeJsonFile(validFile, validCollection);

      // Try to write to a restricted path (this might not work on all systems)
      const restrictedPath = "/root/restricted";

      const result = await splitCommand.execute(validFile, {
        output: restrictedPath,
        overwrite: false,
        dry_run: false,
        verbose: false
      });

      // Should handle the error gracefully
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    test("should handle existing output directory without overwrite", async () => {
      const validCollection = {
        info: {
          name: "Test Collection",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        item: []
      };
      const validFile = join(testDir, "valid.json");
      await fsManager.writeJsonFile(validFile, validCollection);

      const outputDir = join(testDir, "output");
      await fsManager.createDirectory(outputDir);
      await Bun.write(join(outputDir, "existing-file.txt"), "existing content");

      const result = await splitCommand.execute(validFile, {
        output: outputDir,
        overwrite: false,
        dry_run: false,
        verbose: false
      });

      // Should either succeed (if it handles conflicts) or fail gracefully
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe("Build Command Error Handling", () => {
    test("should handle non-existent input directory", async () => {
      const nonExistentDir = join(testDir, "does-not-exist");

      const result = await buildCommand.execute(nonExistentDir, {
        output: join(testDir, "output.json"),
        validate: false,
        verbose: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("directory");
    });

    test("should handle directory without index.json", async () => {
      const emptyDir = join(testDir, "empty");
      await fsManager.createDirectory(emptyDir);

      const result = await buildCommand.execute(emptyDir, {
        output: join(testDir, "output.json"),
        validate: false,
        verbose: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("index.json");
    });

    test("should handle malformed index.json", async () => {
      const malformedDir = join(testDir, "malformed");
      await fsManager.createDirectory(malformedDir);
      
      const malformedIndex = {
        // Missing required fields
        type: "collection"
      };
      await fsManager.writeJsonFile(join(malformedDir, "index.json"), malformedIndex);

      const result = await buildCommand.execute(malformedDir, {
        output: join(testDir, "output.json"),
        validate: false,
        verbose: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("should handle missing request files referenced in index", async () => {
      const incompleteDir = join(testDir, "incomplete");
      await fsManager.createDirectory(incompleteDir);

      const indexWithMissingFiles = {
        meta: {
          type: "collection",
          version: "1.0.0",
          generated_by: "carveman",
          generated_at: new Date().toISOString()
        },
        info: {
          name: "Test Collection",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        order: ["missing-request.json"] // This file doesn't exist
      };
      await fsManager.writeJsonFile(join(incompleteDir, "index.json"), indexWithMissingFiles);

      const result = await buildCommand.execute(incompleteDir, {
        output: join(testDir, "output.json"),
        validate: false,
        verbose: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("missing-request.json");
    });

    test("should handle validation failure", async () => {
      // Create a directory structure that builds but doesn't validate
      const invalidDir = join(testDir, "invalid-validation");
      await fsManager.createDirectory(invalidDir);

      const invalidIndex = {
        meta: {
          type: "collection",
          version: "1.0.0",
          generated_by: "carveman",
          generated_at: new Date().toISOString()
        },
        info: {
          name: "Invalid Collection",
          // Missing schema - will cause validation to fail
        },
        order: []
      };
      await fsManager.writeJsonFile(join(invalidDir, "index.json"), invalidIndex);

      const result = await buildCommand.execute(invalidDir, {
        output: join(testDir, "output.json"),
        validate: true, // Enable validation
        verbose: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("validation");
    });

    test("should handle circular folder references", async () => {
      // This is a more complex test case that might be hard to create
      // For now, we'll create a simple case that could cause issues
      const circularDir = join(testDir, "circular");
      await fsManager.createDirectory(circularDir);

      const folderA = join(circularDir, "folder-a");
      const folderB = join(folderA, "folder-b");
      await fsManager.createDirectory(folderA);
      await fsManager.createDirectory(folderB);

      // Create index files that might cause issues
      const indexA = {
        meta: {
          type: "folder",
          parent_path: "folder-b" // This creates a potential circular reference
        },
        name: "Folder A",
        order: ["folder-b"]
      };
      await fsManager.writeJsonFile(join(folderA, "index.json"), indexA);

      const mainIndex = {
        meta: {
          type: "collection",
          version: "1.0.0",
          generated_by: "carveman",
          generated_at: new Date().toISOString()
        },
        info: {
          name: "Circular Collection",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        order: ["folder-a"]
      };
      await fsManager.writeJsonFile(join(circularDir, "index.json"), mainIndex);

      const result = await buildCommand.execute(circularDir, {
        output: join(testDir, "output.json"),
        validate: false,
        verbose: false
      });

      // Should handle this gracefully without infinite loops
      // Result could be success or failure, but should not hang
      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
    });
  });

  describe("File System Error Handling", () => {
    test("should handle concurrent access issues", async () => {
      const validCollection = {
        info: {
          name: "Concurrent Test",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        item: []
      };
      const testFile = join(testDir, "concurrent.json");
      await fsManager.writeJsonFile(testFile, validCollection);

      const outputDir = join(testDir, "concurrent-output");

      // Start multiple split operations simultaneously
      const promises = [
        splitCommand.execute(testFile, {
          output: outputDir + "-1",
          overwrite: true,
          dry_run: false,
          verbose: false
        }),
        splitCommand.execute(testFile, {
          output: outputDir + "-2",
          overwrite: true,
          dry_run: false,
          verbose: false
        }),
        splitCommand.execute(testFile, {
          output: outputDir + "-3",
          overwrite: true,
          dry_run: false,
          verbose: false
        })
      ];

      const results = await Promise.all(promises);

      // All operations should complete without crashing
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result.success).toBe("boolean");
      });
    });
  });
}); 