import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

describe('Round Trip Integration Tests', () => {
  const testDir = join(process.cwd(), 'test-integration');
  const inputFile = join(
    process.cwd(),
    'tests',
    'levo-test.postman_collection.json'
  );

  beforeEach(() => {
    // Clean up any existing test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (_error) {
      // Directory doesn't exist, which is fine
    }

    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory after each test
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  test('should verify test collection exists', async () => {
    const file = Bun.file(inputFile);
    expect(await file.exists()).toBe(true);

    const collection = await file.json();
    expect(collection.info).toBeDefined();
    expect(collection.info.name).toBeDefined();
    expect(collection.item).toBeDefined();
    expect(Array.isArray(collection.item)).toBe(true);
  });

  test('should perform basic split operation', async () => {
    // Test using the CLI directly
    const splitOutputDir = join(testDir, 'split-output');

    // Run the split command
    const splitProcess = Bun.spawn(
      [
        'bun',
        'run',
        'src/index.ts',
        'split',
        inputFile,
        '--output',
        splitOutputDir,
        '--verbose',
        '--overwrite'
      ],
      {
        cwd: process.cwd(),
        stdout: 'pipe',
        stderr: 'pipe'
      }
    );

    const splitResult = await splitProcess.exited;
    expect(splitResult).toBe(0);

    // The CLI creates a subdirectory based on collection name
    const actualOutputDir = join(splitOutputDir, 'levo_public_apis');
    expect(await Bun.file(actualOutputDir).exists()).toBe(true);
    expect(await Bun.file(join(actualOutputDir, 'index.json')).exists()).toBe(
      true
    );
  }, 30000);

  test('should perform basic build operation', async () => {
    const splitOutputDir = join(testDir, 'split-output');
    const buildOutputFile = join(testDir, 'rebuilt-collection.json');

    // First split the collection
    const splitProcess = Bun.spawn(
      [
        'bun',
        'run',
        'src/index.ts',
        'split',
        inputFile,
        '--output',
        splitOutputDir,
        '--overwrite'
      ],
      {
        cwd: process.cwd(),
        stdout: 'pipe',
        stderr: 'pipe'
      }
    );

    await splitProcess.exited;

    // The actual collection directory
    const actualCollectionDir = join(splitOutputDir, 'levo_public_apis');

    // Then build it back
    const buildProcess = Bun.spawn(
      [
        'bun',
        'run',
        'src/index.ts',
        'build',
        actualCollectionDir,
        '--output',
        buildOutputFile,
        '--validate'
      ],
      {
        cwd: process.cwd(),
        stdout: 'pipe',
        stderr: 'pipe'
      }
    );

    const buildResult = await buildProcess.exited;
    expect(buildResult).toBe(0);

    // Verify output file was created
    expect(await Bun.file(buildOutputFile).exists()).toBe(true);

    // Verify it's valid JSON
    const rebuiltCollection = await Bun.file(buildOutputFile).json();
    expect(rebuiltCollection.info).toBeDefined();
    expect(rebuiltCollection.item).toBeDefined();
  }, 45000);

  test('should preserve collection structure in round-trip', async () => {
    const splitOutputDir = join(testDir, 'split-output');
    const buildOutputFile = join(testDir, 'rebuilt-collection.json');

    // Split
    const splitProcess = Bun.spawn(
      [
        'bun',
        'run',
        'src/index.ts',
        'split',
        inputFile,
        '--output',
        splitOutputDir,
        '--overwrite'
      ],
      {
        cwd: process.cwd(),
        stdout: 'pipe',
        stderr: 'pipe'
      }
    );
    await splitProcess.exited;

    // The actual collection directory
    const actualCollectionDir = join(splitOutputDir, 'levo_public_apis');

    // Build
    const buildProcess = Bun.spawn(
      [
        'bun',
        'run',
        'src/index.ts',
        'build',
        actualCollectionDir,
        '--output',
        buildOutputFile,
        '--validate'
      ],
      {
        cwd: process.cwd(),
        stdout: 'pipe',
        stderr: 'pipe'
      }
    );
    await buildProcess.exited;

    // Compare original and rebuilt
    const originalCollection = await Bun.file(inputFile).json();
    const rebuiltCollection = await Bun.file(buildOutputFile).json();

    expect(rebuiltCollection.info.name).toBe(originalCollection.info.name);
    expect(rebuiltCollection.info.schema).toBe(originalCollection.info.schema);
    expect(rebuiltCollection.item.length).toBe(originalCollection.item.length);

    // Verify the structure is preserved
    expect(rebuiltCollection.item[0].name).toBeDefined();
    if (originalCollection.item[0].item) {
      expect(rebuiltCollection.item[0].item).toBeDefined();
    }
  }, 60000);

  test('should handle dry run mode', async () => {
    const splitOutputDir = join(testDir, 'dry-run-output');

    // Run split with dry-run
    const dryRunProcess = Bun.spawn(
      [
        'bun',
        'run',
        'src/index.ts',
        'split',
        inputFile,
        '--output',
        splitOutputDir,
        '--dry-run',
        '--verbose'
      ],
      {
        cwd: process.cwd(),
        stdout: 'pipe',
        stderr: 'pipe'
      }
    );

    const result = await dryRunProcess.exited;
    expect(result).toBe(0);

    // Verify no actual files were created
    expect(await Bun.file(splitOutputDir).exists()).toBe(false);
  }, 15000);
});
