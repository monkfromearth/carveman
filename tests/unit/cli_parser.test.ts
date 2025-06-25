import { describe, test, expect, beforeEach } from "bun:test";
import { CliParser } from "../../src/cli/cli_parser";

describe("CliParser", () => {
  let parser: CliParser;

  beforeEach(() => {
    parser = new CliParser();
  });

  describe("parseArgs", () => {
    test("should parse split command with basic arguments", () => {
      const args = ["split", "input.json"];
      const result = parser.parseArgs(args);

      expect(result.command).toBe("split");
      expect(result.input).toBe("input.json");
      expect(result.output).toBeUndefined();
      expect(result.overwrite).toBe(false);
      expect(result.dryRun).toBe(false);
      expect(result.verbose).toBe(false);
    });

    test("should parse build command with basic arguments", () => {
      const args = ["build", "input-dir"];
      const result = parser.parseArgs(args);

      expect(result.command).toBe("build");
      expect(result.input).toBe("input-dir");
      expect(result.validate).toBe(false);
    });

    test("should parse split command with all flags", () => {
      const args = [
        "split", 
        "input.json", 
        "--output", "output-dir",
        "--overwrite",
        "--dry-run",
        "--verbose"
      ];
      const result = parser.parseArgs(args);

      expect(result.command).toBe("split");
      expect(result.input).toBe("input.json");
      expect(result.output).toBe("output-dir");
      expect(result.overwrite).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.verbose).toBe(true);
    });

    test("should parse build command with all flags", () => {
      const args = [
        "build", 
        "input-dir", 
        "-o", "output.json",
        "--overwrite",
        "--validate",
        "-v"
      ];
      const result = parser.parseArgs(args);

      expect(result.command).toBe("build");
      expect(result.input).toBe("input-dir");
      expect(result.output).toBe("output.json");
      expect(result.overwrite).toBe(true);
      expect(result.validate).toBe(true);
      expect(result.verbose).toBe(true);
    });

    test("should handle short flag aliases", () => {
      const args = ["split", "input.json", "-o", "output", "-v"];
      const result = parser.parseArgs(args);

      expect(result.output).toBe("output");
      expect(result.verbose).toBe(true);
    });

    test("should parse help command", () => {
      const helpVariations = ["help", "--help", "-h"];
      
      helpVariations.forEach(helpArg => {
        const result = parser.parseArgs([helpArg]);
        expect(result.command).toBe("help");
      });
    });

    test("should parse version command", () => {
      const versionVariations = ["version", "--version", "-V"];
      
      versionVariations.forEach(versionArg => {
        const result = parser.parseArgs([versionArg]);
        expect(result.command).toBe("version");
      });
    });

    test("should handle command-specific help", () => {
      const args = ["split", "--help"];
      const result = parser.parseArgs(args);

      expect(result.command).toBe("help");
      expect(result.subCommand).toBe("split");
    });

    test("should throw error for missing input", () => {
      expect(() => parser.parseArgs(["split"])).toThrow("Input file or directory is required");
      expect(() => parser.parseArgs(["build"])).toThrow("Input file or directory is required");
    });

    test("should throw error for unknown command", () => {
      expect(() => parser.parseArgs(["unknown", "input"])).toThrow("Unknown command: unknown");
    });

    test("should throw error for unknown flag", () => {
      expect(() => parser.parseArgs(["split", "input.json", "--unknown"])).toThrow("Unknown option: --unknown");
    });

    test("should handle empty arguments array", () => {
      const result = parser.parseArgs([]);
      expect(result.command).toBe("help");
    });

    test("should validate flag values", () => {
      expect(() => parser.parseArgs(["split", "input.json", "--output"])).toThrow("Option --output requires a value");
      expect(() => parser.parseArgs(["split", "input.json", "-o"])).toThrow("Option -o requires a value");
    });
  });

  describe("getHelpText", () => {
    test("should return general help text", () => {
      const help = parser.getHelpText();
      
      expect(help).toContain("Carveman");
      expect(help).toContain("split");
      expect(help).toContain("build");
      expect(help).toContain("help");
      expect(help).toContain("version");
    });

    test("should return split command help", () => {
      const help = parser.getHelpText("split");
      
      expect(help).toContain("split");
      expect(help).toContain("--output");
      expect(help).toContain("--overwrite");
      expect(help).toContain("--dry-run");
      expect(help).toContain("--verbose");
    });

    test("should return build command help", () => {
      const help = parser.getHelpText("build");
      
      expect(help).toContain("build");
      expect(help).toContain("--output");
      expect(help).toContain("--validate");
      expect(help).toContain("--verbose");
    });

    test("should handle unknown command help", () => {
      const help = parser.getHelpText("unknown");
      
      expect(help).toContain("Unknown command");
      expect(help).toContain("split");
      expect(help).toContain("build");
    });
  });

  describe("getVersion", () => {
    test("should return version information", () => {
      const version = parser.getVersion();
      
      expect(version).toContain("Carveman");
      expect(version).toMatch(/\d+\.\d+\.\d+/); // Should contain version number
    });
  });

  describe("edge cases", () => {
    test("should handle mixed case commands", () => {
      expect(() => parser.parseArgs(["SPLIT", "input.json"])).toThrow("Unknown command: SPLIT");
      expect(() => parser.parseArgs(["Split", "input.json"])).toThrow("Unknown command: Split");
    });

    test("should handle flags with equals sign", () => {
      const args = ["split", "input.json", "--output=output-dir"];
      const result = parser.parseArgs(args);

      expect(result.output).toBe("output-dir");
    });

    test("should handle multiple boolean flags together", () => {
      const args = ["split", "input.json", "--overwrite", "--dry-run", "--verbose"];
      const result = parser.parseArgs(args);

      expect(result.overwrite).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.verbose).toBe(true);
    });

    test("should handle arguments with spaces", () => {
      const args = ["split", "my input file.json", "--output", "my output dir"];
      const result = parser.parseArgs(args);

      expect(result.input).toBe("my input file.json");
      expect(result.output).toBe("my output dir");
    });

    test("should handle special characters in paths", () => {
      const args = ["split", "./input-file.json", "-o", "../output/dir"];
      const result = parser.parseArgs(args);

      expect(result.input).toBe("./input-file.json");
      expect(result.output).toBe("../output/dir");
    });

    test("should preserve order independence of flags", () => {
      const args1 = ["split", "input.json", "--verbose", "--output", "dir", "--overwrite"];
      const args2 = ["split", "input.json", "--overwrite", "--verbose", "--output", "dir"];
      
      const result1 = parser.parseArgs(args1);
      const result2 = parser.parseArgs(args2);

      expect(result1).toEqual(result2);
    });
  });
}); 