import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { rmSync, mkdirSync } from "fs";
import { join } from "path";

describe("CLI Debug Tests", () => {
  const testDir = join(process.cwd(), "test-cli-debug");
  const inputFile = join(process.cwd(), "tests", "levo-test.postman_collection.json");

  beforeEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory doesn't exist, which is fine
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test("should capture CLI output and debug split command", async () => {
    const splitOutputDir = join(testDir, "split-output");
    
    const splitProcess = Bun.spawn([
      "bun", "run", "src/index.ts", "split", inputFile, 
      "--output", splitOutputDir, "--verbose", "--overwrite"
    ], {
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe"
    });

    const [stdout, stderr] = await Promise.all([
      new Response(splitProcess.stdout).text(),
      new Response(splitProcess.stderr).text()
    ]);

    const exitCode = await splitProcess.exited;

    console.log("Exit Code:", exitCode);
    console.log("STDOUT:", stdout);
    console.log("STDERR:", stderr);
    console.log("Expected output dir:", splitOutputDir);
    console.log("Expected collection dir:", join(splitOutputDir, "levo_public_apis"));

    // Check what was actually created
    try {
      const files = await Bun.readdir(testDir);
      console.log("Files in test dir:", files);
      
      if (await Bun.file(splitOutputDir).exists()) {
        const splitFiles = await Bun.readdir(splitOutputDir);
        console.log("Files in split output dir:", splitFiles);
      }
    } catch (error) {
      console.log("Error reading directories:", error);
    }

    expect(exitCode).toBe(0);
  }, 30000);
}); 