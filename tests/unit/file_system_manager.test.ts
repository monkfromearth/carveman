import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { FileSystemManager } from '../../src/fs/file_system_manager';

describe('FileSystemManager', () => {
  let fsManager: FileSystemManager;
  const testDir = join(process.cwd(), 'test-fs-manager');

  beforeEach(() => {
    fsManager = new FileSystemManager();

    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (_error) {
      // Directory doesn't exist, which is fine
    }
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  describe('createDirectory', () => {
    test('should create a directory', async () => {
      const dirPath = join(testDir, 'new-dir');

      await fsManager.createDirectory(dirPath);

      expect(await fsManager.pathExists(dirPath)).toBe(true);
      expect(await fsManager.isDirectory(dirPath)).toBe(true);
    });

    test('should create nested directories', async () => {
      const nestedPath = join(testDir, 'level1', 'level2', 'level3');

      await fsManager.createDirectory(nestedPath);

      expect(await fsManager.pathExists(nestedPath)).toBe(true);
      expect(await fsManager.isDirectory(nestedPath)).toBe(true);
    });

    test('should not throw if directory already exists', async () => {
      await fsManager.createDirectory(testDir);

      await expect(fsManager.createDirectory(testDir)).resolves.not.toThrow();
      expect(await fsManager.pathExists(testDir)).toBe(true);
    });
  });

  describe('writeJsonFile and readJsonFile', () => {
    test('should write and read JSON files', async () => {
      await fsManager.createDirectory(testDir);
      const filePath = join(testDir, 'test.json');
      const testData = { name: 'test', value: 123, nested: { key: 'value' } };

      await fsManager.writeJsonFile(filePath, testData);
      const readData = await fsManager.readJsonFile(filePath);

      expect(readData).toEqual(testData);
    });

    test('should create parent directories when writing', async () => {
      const filePath = join(testDir, 'nested', 'deep', 'test.json');
      const testData = { test: true };

      await fsManager.writeJsonFile(filePath, testData);
      const readData = await fsManager.readJsonFile(filePath);

      expect(readData).toEqual(testData);
      expect(await fsManager.pathExists(join(testDir, 'nested', 'deep'))).toBe(
        true
      );
    });

    test('should handle complex JSON structures', async () => {
      await fsManager.createDirectory(testDir);
      const filePath = join(testDir, 'complex.json');
      const complexData = {
        array: [1, 2, 3, { nested: true }],
        nullValue: null,
        booleanValue: false,
        stringValue: 'test string',
        numberValue: 42.5
      };

      await fsManager.writeJsonFile(filePath, complexData);
      const readData = await fsManager.readJsonFile(filePath);

      expect(readData).toEqual(complexData);
    });
  });

  describe('pathExists', () => {
    test('should return true for existing paths', async () => {
      await fsManager.createDirectory(testDir);
      const filePath = join(testDir, 'test.json');
      await fsManager.writeJsonFile(filePath, { test: true });

      expect(await fsManager.pathExists(testDir)).toBe(true);
      expect(await fsManager.pathExists(filePath)).toBe(true);
    });

    test('should return false for non-existing paths', async () => {
      const nonExistentPath = join(testDir, 'does-not-exist');

      expect(await fsManager.pathExists(nonExistentPath)).toBe(false);
    });
  });

  describe('isDirectory and isFile', () => {
    test('should correctly identify directories and files', async () => {
      await fsManager.createDirectory(testDir);
      const filePath = join(testDir, 'test.json');
      await fsManager.writeJsonFile(filePath, { test: true });

      expect(await fsManager.isDirectory(testDir)).toBe(true);
      expect(await fsManager.isFile(testDir)).toBe(false);

      expect(await fsManager.isFile(filePath)).toBe(true);
      expect(await fsManager.isDirectory(filePath)).toBe(false);
    });

    test('should return false for non-existent paths', async () => {
      const nonExistentPath = join(testDir, 'does-not-exist');

      expect(await fsManager.isDirectory(nonExistentPath)).toBe(false);
      expect(await fsManager.isFile(nonExistentPath)).toBe(false);
    });
  });

  describe('listDirectory', () => {
    test('should list directory contents', async () => {
      await fsManager.createDirectory(testDir);
      await fsManager.createDirectory(join(testDir, 'subdir'));
      await fsManager.writeJsonFile(join(testDir, 'file1.json'), { test: 1 });
      await fsManager.writeJsonFile(join(testDir, 'file2.json'), { test: 2 });

      const contents = await fsManager.listDirectory(testDir);

      expect(contents).toContain('subdir');
      expect(contents).toContain('file1.json');
      expect(contents).toContain('file2.json');
      expect(contents.length).toBe(3);
    });

    test('should return empty array for empty directory', async () => {
      await fsManager.createDirectory(testDir);

      const contents = await fsManager.listDirectory(testDir);

      expect(contents).toEqual([]);
    });
  });

  describe('scanDirectoryStructure', () => {
    test('should scan directory structure', async () => {
      await fsManager.createDirectory(testDir);
      await fsManager.createDirectory(join(testDir, 'folder1'));
      await fsManager.createDirectory(join(testDir, 'folder2'));
      await fsManager.writeJsonFile(join(testDir, 'index.json'), {
        type: 'index'
      });
      await fsManager.writeJsonFile(join(testDir, 'request1.json'), {
        type: 'request'
      });
      await fsManager.writeJsonFile(join(testDir, 'request2.json'), {
        type: 'request'
      });
      await Bun.write(join(testDir, 'readme.txt'), 'Not a JSON file');

      const structure = await fsManager.scanDirectoryStructure(testDir);

      expect(structure.folders).toHaveLength(2);
      expect(structure.files).toHaveLength(2); // Only JSON files
      expect(structure.index_files).toHaveLength(1);

      expect(structure.folders.map((f) => f.name)).toContain('folder1');
      expect(structure.folders.map((f) => f.name)).toContain('folder2');
      expect(structure.files.map((f) => f.name)).toContain('request1.json');
      expect(structure.files.map((f) => f.name)).toContain('request2.json');
      expect(structure.index_files.map((f) => f.name)).toContain('index.json');
    });
  });

  describe('collection and folder operations', () => {
    test('should write and read collection index', async () => {
      await fsManager.createDirectory(testDir);
      const collectionIndex = {
        meta: {
          type: 'collection' as const,
          version: '1.0.0',
          generated_by: 'test',
          generated_at: new Date().toISOString()
        },
        info: {
          name: 'Test Collection',
          schema:
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        order: ['folder1', 'request1']
      };

      await fsManager.writeCollectionIndex(testDir, collectionIndex);
      const readIndex = await fsManager.readCollectionIndex(testDir);

      expect(readIndex).toEqual(collectionIndex);
    });

    test('should write and read folder index', async () => {
      await fsManager.createDirectory(testDir);
      const folderIndex = {
        meta: {
          type: 'folder' as const,
          parent_path: '/parent'
        },
        name: 'Test Folder',
        description: 'A test folder',
        order: ['request1', 'request2']
      };

      await fsManager.writeFolderIndex(testDir, folderIndex);
      const readIndex = await fsManager.readFolderIndex(testDir);

      expect(readIndex).toEqual(folderIndex);
    });

    test('should write and read request files', async () => {
      await fsManager.createDirectory(testDir);
      const requestData = {
        meta: {
          type: 'request' as const,
          folder_path: '/test'
        },
        name: 'Test Request',
        request: {
          url: 'https://api.example.com/test',
          method: 'GET'
        }
      };

      await fsManager.writeRequestFile(
        testDir,
        'test_request.json',
        requestData
      );
      const readData = await fsManager.readRequestFile(
        join(testDir, 'test_request.json')
      );

      expect(readData).toEqual(requestData);
    });
  });

  describe('validateDirectoryStructure', () => {
    test('should validate correct directory structure', async () => {
      await fsManager.createDirectory(testDir);
      await fsManager.writeJsonFile(join(testDir, 'index.json'), {
        meta: { type: 'collection' },
        info: { name: 'Test', schema: 'test' },
        order: []
      });

      const validation = await fsManager.validateDirectoryStructure(testDir);

      expect(validation.is_valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect missing index.json', async () => {
      await fsManager.createDirectory(testDir);

      const validation = await fsManager.validateDirectoryStructure(testDir);

      expect(validation.is_valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('utility methods', () => {
    test('should resolve paths', () => {
      const relativePath = './test/path';
      const resolved = fsManager.resolvePath(relativePath);

      expect(typeof resolved).toBe('string');
      expect(resolved.length).toBeGreaterThan(relativePath.length);
    });

    test('should get basename', () => {
      const path = '/path/to/file.json';
      const basename = fsManager.getBasename(path);

      expect(basename).toBe('file.json');
    });

    test('should get dirname', () => {
      const path = '/path/to/file.json';
      const dirname = fsManager.getDirname(path);

      expect(dirname).toBe('/path/to');
    });

    test('should join paths', () => {
      const joined = fsManager.joinPath('path', 'to', 'file.json');

      expect(joined).toBe(join('path', 'to', 'file.json'));
    });
  });
});
