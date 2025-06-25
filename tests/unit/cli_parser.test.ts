import { beforeEach, describe, expect, test } from 'bun:test';
import { CliParser } from '../../src/cli/cli_parser';
import type { IBuildOptions, ISplitOptions } from '../../src/types/postman';

describe('CliParser', () => {
  let parser: CliParser;

  beforeEach(() => {
    parser = new CliParser();
  });

  describe('parse', () => {
    test('should parse split command with basic arguments', () => {
      const parser = new CliParser(['node', 'carveman', 'split', 'input.json']);
      const result = parser.parse();

      expect(result?.command).toBe('split');
      expect(result?.input_path).toBe('input.json');
      const options = result?.options as ISplitOptions;
      expect(options.output).toBeUndefined();
      expect(options.overwrite).toBe(false);
      expect(options.dry_run).toBe(false);
      expect(options.verbose).toBe(false);
    });

    test('should parse build command with basic arguments', () => {
      const parser = new CliParser(['node', 'carveman', 'build', 'input-dir']);
      const result = parser.parse();

      expect(result?.command).toBe('build');
      expect(result?.input_path).toBe('input-dir');
      const options = result?.options as IBuildOptions;
      expect(options.validate).toBe(false);
    });

    test('should parse split command with all flags', () => {
      const parser = new CliParser([
        'node',
        'carveman',
        'split',
        'input.json',
        '--output',
        'output-dir',
        '--overwrite',
        '--dry-run',
        '--verbose'
      ]);
      const result = parser.parse();

      expect(result?.command).toBe('split');
      expect(result?.input_path).toBe('input.json');
      const options = result?.options as ISplitOptions;
      expect(options.output).toBe('output-dir');
      expect(options.overwrite).toBe(true);
      expect(options.dry_run).toBe(true);
      expect(options.verbose).toBe(true);
    });

    test('should parse build command with all flags', () => {
      const parser = new CliParser([
        'node',
        'carveman',
        'build',
        'input-dir',
        '-o',
        'output.json',
        '--validate',
        '--verbose'
      ]);
      const result = parser.parse();

      expect(result?.command).toBe('build');
      expect(result?.input_path).toBe('input-dir');
      const options = result?.options as IBuildOptions;
      expect(options.output).toBe('output.json');
      expect(options.validate).toBe(true);
      expect(options.verbose).toBe(true);
    });

    test('should handle short flag aliases', () => {
      const parser = new CliParser([
        'node',
        'carveman',
        'split',
        'input.json',
        '-o',
        'output',
        '--verbose'
      ]);
      const result = parser.parse();

      const options = result?.options as ISplitOptions;
      expect(options.output).toBe('output');
      expect(options.verbose).toBe(true);
    });

    test('should return null for help command', () => {
      const helpVariations = ['help', '--help', '-h'];

      for (const helpArg of helpVariations) {
        const parser = new CliParser(['node', 'carveman', helpArg]);
        const result = parser.parse();
        expect(result).toBeNull();
      }
    });

    test('should return null for version command', () => {
      const versionVariations = ['version', '--version', '-v'];

      for (const versionArg of versionVariations) {
        const parser = new CliParser(['node', 'carveman', versionArg]);
        const result = parser.parse();
        expect(result).toBeNull();
      }
    });

    test('should return null for command-specific help', () => {
      const parser = new CliParser(['node', 'carveman', 'split', '--help']);
      const result = parser.parse();

      expect(result).toBeNull();
    });

    test('should return null for missing input', () => {
      const parser1 = new CliParser(['node', 'carveman', 'split']);
      const result1 = parser1.parse();
      expect(result1).toBeNull();

      const parser2 = new CliParser(['node', 'carveman', 'build']);
      const result2 = parser2.parse();
      expect(result2).toBeNull();
    });

    test('should return null for unknown command', () => {
      const parser = new CliParser(['node', 'carveman', 'unknown', 'input']);
      const result = parser.parse();
      expect(result).toBeNull();
    });

    test('should return null for unknown flag', () => {
      const parser = new CliParser([
        'node',
        'carveman',
        'split',
        'input.json',
        '--unknown'
      ]);
      const result = parser.parse();
      expect(result).toBeNull();
    });

    test('should return null for empty arguments array', () => {
      const parser = new CliParser(['node', 'carveman']);
      const result = parser.parse();
      expect(result).toBeNull();
    });

    test('should return null when flag values are missing', () => {
      const parser1 = new CliParser([
        'node',
        'carveman',
        'split',
        'input.json',
        '--output'
      ]);
      const result1 = parser1.parse();
      expect(result1).toBeNull();

      const parser2 = new CliParser([
        'node',
        'carveman',
        'split',
        'input.json',
        '-o'
      ]);
      const result2 = parser2.parse();
      expect(result2).toBeNull();
    });
  });

  describe('help and version methods', () => {
    test('should show help when called', () => {
      // These methods just print to console, so we test that they don't throw
      expect(() => parser.showHelp()).not.toThrow();
      expect(() => parser.showSplitHelp()).not.toThrow();
      expect(() => parser.showBuildHelp()).not.toThrow();
      expect(() => parser.showVersion()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    test('should handle mixed case commands', () => {
      const parser1 = new CliParser([
        'node',
        'carveman',
        'SPLIT',
        'input.json'
      ]);
      const result1 = parser1.parse();
      expect(result1).toBeNull();

      const parser2 = new CliParser([
        'node',
        'carveman',
        'Split',
        'input.json'
      ]);
      const result2 = parser2.parse();
      expect(result2).toBeNull();
    });

    test('should handle multiple boolean flags together', () => {
      const parser = new CliParser([
        'node',
        'carveman',
        'split',
        'input.json',
        '--overwrite',
        '--dry-run',
        '--verbose'
      ]);
      const result = parser.parse();

      const options = result?.options as ISplitOptions;
      expect(options.overwrite).toBe(true);
      expect(options.dry_run).toBe(true);
      expect(options.verbose).toBe(true);
    });

    test('should handle arguments with spaces', () => {
      const parser = new CliParser([
        'node',
        'carveman',
        'split',
        'my input file.json',
        '--output',
        'my output dir'
      ]);
      const result = parser.parse();

      expect(result?.input_path).toBe('my input file.json');
      const options = result?.options as ISplitOptions;
      expect(options.output).toBe('my output dir');
    });

    test('should validate commands', () => {
      const parser = new CliParser(['node', 'carveman', 'split', 'input.json']);
      const result = parser.parse();

      if (result) {
        expect(parser.validateCommand(result)).toBe(true);
      }
    });

    test('should get current directory', () => {
      const currentDir = parser.getCurrentDirectory();
      expect(typeof currentDir).toBe('string');
      expect(currentDir.length).toBeGreaterThan(0);
    });

    test('should detect help flags', () => {
      expect(parser.isHelpFlag('--help')).toBe(true);
      expect(parser.isHelpFlag('-h')).toBe(true);
      expect(parser.isHelpFlag('help')).toBe(true);
      expect(parser.isHelpFlag('--version')).toBe(false);
    });

    test('should detect version flags', () => {
      expect(parser.isVersionFlag('--version')).toBe(true);
      expect(parser.isVersionFlag('-v')).toBe(true);
      expect(parser.isVersionFlag('version')).toBe(true);
      expect(parser.isVersionFlag('--help')).toBe(false);
    });
  });
});
