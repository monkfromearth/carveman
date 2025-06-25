import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { FileSystemManager } from "../../src/fs/file_system_manager";
import { rmSync, mkdirSync } from "fs";
import { join } from "path";

describe("FileSystemManager", () => {
  let fsManager: FileSystemManager;
  const testDir = join(process.cwd(), "test-temp");

  beforeEach(() => {
    fsManager = new FileSystemManager();
    // Clean up any existing test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory doesn't exist, which is fine
    }
  });

  afterEach(() => {
    // Clean up test directory after each test
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("ensureDirectoryExists", () => {
    test("should create directory if it doesn't exist", async () => {
      const dirPath = join(testDir, "new-directory");
      
      await fsManager.ensureDirectoryExists(dirPath);
      
      expect(await Bun.file(dirPath).exists()).toBe(true);
    });

    test("should not throw if directory already exists", async () => {
      const dirPath = join(testDir, "existing-directory");
      mkdirSync(dirPath, { recursive: true });
      
      await expect(fsManager.ensureDirectoryExists(dirPath)).resolves.not.toThrow();
    });

    test("should create nested directories", async () => {
      const nestedPath = join(testDir, "level1", "level2", "level3");
      
      await fsManager.ensureDirectoryExists(nestedPath);
      
      expect(await Bun.file(nestedPath).exists()).toBe(true);
    });
  });

  describe("writeJsonFile", () => {
    test("should write JSON file correctly", async () => {
      const filePath = join(testDir, "test.json");
      const testData = { name: "test", value: 123 };
      
      await fsManager.ensureDirectoryExists(testDir);
      await fsManager.writeJsonFile(filePath, testData);
      
      const fileContent = await Bun.file(filePath).json();
      expect(fileContent).toEqual(testData);
    });

    test("should format JSON with proper indentation", async () => {
      const filePath = join(testDir, "formatted.json");
      const testData = { nested: { data: "value" } };
      
      await fsManager.ensureDirectoryExists(testDir);
      await fsManager.writeJsonFile(filePath, testData);
      
      const fileText = await Bun.file(filePath).text();
      expect(fileText).toContain("  "); // Should have indentation
      expect(fileText).toContain("\n"); // Should have newlines
    });
  });

  describe("readJsonFile", () => {
    test("should read JSON file correctly", async () => {
      const filePath = join(testDir, "read-test.json");
      const testData = { message: "hello world", numbers: [1, 2, 3] };
      
      await fsManager.ensureDirectoryExists(testDir);
      await Bun.write(filePath, JSON.stringify(testData, null, 2));
      
      const result = await fsManager.readJsonFile(filePath);
      expect(result).toEqual(testData);
    });

    test("should throw error for non-existent file", async () => {
      const filePath = join(testDir, "non-existent.json");
      
      await expect(fsManager.readJsonFile(filePath)).rejects.toThrow();
    });

    test("should throw error for invalid JSON", async () => {
      const filePath = join(testDir, "invalid.json");
      
      await fsManager.ensureDirectoryExists(testDir);
      await Bun.write(filePath, "{ invalid json }");
      
      await expect(fsManager.readJsonFile(filePath)).rejects.toThrow();
    });
  });

  describe("fileExists", () => {
    test("should return true for existing file", async () => {
      const filePath = join(testDir, "exists.txt");
      
      await fsManager.ensureDirectoryExists(testDir);
      await Bun.write(filePath, "content");
      
      const exists = await fsManager.fileExists(filePath);
      expect(exists).toBe(true);
    });

    test("should return false for non-existing file", async () => {
      const filePath = join(testDir, "does-not-exist.txt");
      
      const exists = await fsManager.fileExists(filePath);
      expect(exists).toBe(false);
    });
  });

  describe("listDirectory", () => {
    test("should list directory contents", async () => {
      await fsManager.ensureDirectoryExists(testDir);
      await Bun.write(join(testDir, "file1.txt"), "content1");
      await Bun.write(join(testDir, "file2.json"), "{}");
      await fsManager.ensureDirectoryExists(join(testDir, "subdir"));
      
      const contents = await fsManager.listDirectory(testDir);
      
      expect(contents).toHaveLength(3);
      expect(contents).toContain("file1.txt");
      expect(contents).toContain("file2.json");
      expect(contents).toContain("subdir");
    });

    test("should return empty array for empty directory", async () => {
      await fsManager.ensureDirectoryExists(testDir);
      
      const contents = await fsManager.listDirectory(testDir);
      
      expect(contents).toHaveLength(0);
    });

    test("should throw error for non-existent directory", async () => {
      const nonExistentDir = join(testDir, "does-not-exist");
      
      await expect(fsManager.listDirectory(nonExistentDir)).rejects.toThrow();
    });
  });

  describe("isDirectory", () => {
    test("should return true for directory", async () => {
      await fsManager.ensureDirectoryExists(testDir);
      
      const isDir = await fsManager.isDirectory(testDir);
      expect(isDir).toBe(true);
    });

    test("should return false for file", async () => {
      const filePath = join(testDir, "test-file.txt");
      
      await fsManager.ensureDirectoryExists(testDir);
      await Bun.write(filePath, "content");
      
      const isDir = await fsManager.isDirectory(filePath);
      expect(isDir).toBe(false);
    });

    test("should return false for non-existent path", async () => {
      const nonExistentPath = join(testDir, "does-not-exist");
      
      const isDir = await fsManager.isDirectory(nonExistentPath);
      expect(isDir).toBe(false);
    });
  });

  describe("validatePath", () => {
    test("should accept valid paths", () => {
      const validPaths = [
        "/valid/path",
        "./relative/path",
        "../parent/path",
        "simple-path"
      ];
      
      validPaths.forEach(path => {
        expect(() => fsManager.validatePath(path)).not.toThrow();
      });
    });

    test("should reject dangerous paths", () => {
      const dangerousPaths = [
        "",
        "   ",
        "\0null-byte",
        "path\nwith\nnewlines"
      ];
      
      dangerousPaths.forEach(path => {
        expect(() => fsManager.validatePath(path)).toThrow();
      });
    });
  });

  describe("resolveConflict", () => {
    test("should generate unique filename for conflicts", async () => {
      const basePath = join(testDir, "conflict-test.json");
      
      await fsManager.ensureDirectoryExists(testDir);
      await Bun.write(basePath, "{}");
      
      const resolvedPath = await fsManager.resolveConflict(basePath);
      
      expect(resolvedPath).not.toBe(basePath);
      expect(resolvedPath).toContain("conflict-test");
      expect(resolvedPath).toContain(".json");
    });

    test("should return original path if no conflict", async () => {
      const basePath = join(testDir, "no-conflict.json");
      
      const resolvedPath = await fsManager.resolveConflict(basePath);
      
      expect(resolvedPath).toBe(basePath);
    });

    test("should handle multiple conflicts", async () => {
      const basePath = join(testDir, "multi-conflict.json");
      
      await fsManager.ensureDirectoryExists(testDir);
      await Bun.write(basePath, "{}");
      await Bun.write(join(testDir, "multi-conflict_1.json"), "{}");
      await Bun.write(join(testDir, "multi-conflict_2.json"), "{}");
      
      const resolvedPath = await fsManager.resolveConflict(basePath);
      
      expect(resolvedPath).toContain("multi-conflict_3.json");
    });
  });
}); 