/**
 * CLI Parser - Handles command-line argument parsing and routing
 */

import type {
  IBuildOptions,
  ICliCommand,
  ISplitOptions
} from '@/types/postman.ts';

/**
 * CLI Parser class for handling command-line arguments
 */
export class CliParser {
  private args: string[];
  private program_name: string;

  constructor(args: string[] = process.argv) {
    this.args = args;
    this.program_name = 'carveman';
  }

  /**
   * Parses command-line arguments and returns a command object
   * @returns ICliCommand | null
   */
  parse(): ICliCommand | null {
    // Remove node and script path
    const clean_args = this.args.slice(2);

    if (clean_args.length === 0) {
      this.showHelp();
      return null;
    }

    const command = clean_args[0]?.toLowerCase();

    switch (command) {
      case 'split':
        return this.parseSplitCommand(clean_args.slice(1));
      case 'build':
        return this.parseBuildCommand(clean_args.slice(1));
      case 'help':
      case '--help':
      case '-h': {
        this.showHelp();
        return null;
      }
      case 'version':
      case '--version':
      case '-v': {
        this.showVersion();
        return null;
      }
      default: {
        console.error(`Unknown command: ${command}`);
        this.showHelp();
        return null;
      }
    }
  }

  /**
   * Parses split command arguments
   * @param args - Arguments for split command
   * @returns ICliCommand | null
   */
  private parseSplitCommand(args: string[]): ICliCommand | null {
    // If first token is a help flag, show help and exit
    const firstArg = args[0] ?? '';
    if (args.length === 0 || this.isHelpFlag(firstArg)) {
      console.error('Split command requires an input file path');
      this.showSplitHelp();
      return null;
    }

    // At this point args[0] is the input path (could still be a flag)
    const input_path = firstArg;
    if (this.isHelpFlag(input_path)) {
      this.showSplitHelp();
      return null;
    }
    if (!input_path) {
      console.error('Input file path is required');
      return null;
    }

    const options: ISplitOptions = {
      output: undefined,
      overwrite: false,
      dry_run: false,
      verbose: false
    };

    // Parse flags
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (!arg) {
        continue;
      }

      switch (arg) {
        case '--output':
        case '-o': {
          i++;
          options.output = args[i];
          if (!options.output) {
            console.error('--output flag requires a value');
            return null;
          }
          break;
        }
        case '--overwrite':
          options.overwrite = true;
          break;
        case '--dry-run':
          options.dry_run = true;
          break;
        case '--verbose':
          options.verbose = true;
          break;
        case '--help':
        case '-h': {
          this.showSplitHelp();
          return null;
        }
        default: {
          console.error(`Unknown flag for split command: ${arg}`);
          this.showSplitHelp();
          return null;
        }
      }
    }

    return {
      command: 'split',
      input_path,
      options
    };
  }

  /**
   * Parses build command arguments
   * @param args - Arguments for build command
   * @returns ICliCommand | null
   */
  private parseBuildCommand(args: string[]): ICliCommand | null {
    // If first token is help flag, show help
    const buildFirstArg = args[0] ?? '';
    if (args.length === 0 || this.isHelpFlag(buildFirstArg)) {
      console.error('Build command requires an input directory path');
      this.showBuildHelp();
      return null;
    }

    const input_path = buildFirstArg;
    if (this.isHelpFlag(input_path)) {
      this.showBuildHelp();
      return null;
    }

    const options: IBuildOptions = {
      output: undefined,
      validate: false,
      verbose: false
    };

    // Parse flags
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (!arg) {
        continue;
      }

      switch (arg) {
        case '--output':
        case '-o': {
          i++;
          options.output = args[i];
          if (!options.output) {
            console.error('--output flag requires a value');
            return null;
          }
          break;
        }
        case '--validate':
          options.validate = true;
          break;
        case '--verbose':
          options.verbose = true;
          break;
        case '--help':
        case '-h': {
          this.showBuildHelp();
          return null;
        }
        default: {
          console.error(`Unknown flag for build command: ${arg}`);
          this.showBuildHelp();
          return null;
        }
      }
    }

    return {
      command: 'build',
      input_path,
      options
    };
  }

  /**
   * Shows general help information
   */
  showHelp(): void {
    console.log(`
${this.program_name} - Postman Collection File System Utility

USAGE:
  ${this.program_name} <command> [options]

COMMANDS:
  split <input-json-file>     Convert Postman collection to file system structure
  build <input-directory>     Convert file system structure to Postman collection
  help                        Show this help message
  version                     Show version information

EXAMPLES:
  ${this.program_name} split collection.json --output ./output --verbose
  ${this.program_name} build ./my-collection --output rebuilt.json --validate
  ${this.program_name} split collection.json --dry-run --verbose

For command-specific help, use:
  ${this.program_name} <command> --help
`);
  }

  /**
   * Shows help for split command
   */
  showSplitHelp(): void {
    console.log(`
${this.program_name} split - Convert Postman collection to file system structure

USAGE:
  ${this.program_name} split <input-json-file> [options]

OPTIONS:
  --output, -o <directory>    Output directory (default: current directory)
  --overwrite                 Overwrite existing files without prompt
  --dry-run                   Show what would be done without creating files
  --verbose                   Show detailed output
  --help, -h                  Show this help message

EXAMPLES:
  ${this.program_name} split collection.json
  ${this.program_name} split collection.json --output ./output
  ${this.program_name} split collection.json --dry-run --verbose
  ${this.program_name} split collection.json --overwrite --verbose
`);
  }

  /**
   * Shows help for build command
   */
  showBuildHelp(): void {
    console.log(`
${this.program_name} build - Convert file system structure to Postman collection

USAGE:
  ${this.program_name} build <input-directory> [options]

OPTIONS:
  --output, -o <file>         Output JSON file (default: collection.json)
  --validate                  Validate the reconstructed collection
  --verbose                   Show detailed output
  --help, -h                  Show this help message

EXAMPLES:
  ${this.program_name} build ./my-collection
  ${this.program_name} build ./my-collection --output rebuilt.json
  ${this.program_name} build ./my-collection --validate --verbose
`);
  }

  /**
   * Shows version information
   */
  showVersion(): void {
    // In a real implementation, this would read from package.json
    console.log(`${this.program_name} version 1.0.0`);
  }

  /**
   * Validates that required arguments are present
   * @param command - Parsed command object
   * @returns boolean - True if valid
   */
  validateCommand(command: ICliCommand): boolean {
    if (!command.input_path || command.input_path.trim().length === 0) {
      console.error('Input path is required');
      return false;
    }

    return true;
  }

  /**
   * Gets the current working directory
   * @returns string - Current working directory
   */
  getCurrentDirectory(): string {
    return process.cwd();
  }

  /**
   * Checks if a flag is a help flag
   * @param flag - Flag to check
   * @returns boolean
   */
  isHelpFlag(flag: string): boolean {
    return ['--help', '-h', 'help'].includes(flag.toLowerCase());
  }

  /**
   * Checks if a flag is a version flag
   * @param flag - Flag to check
   * @returns boolean
   */
  isVersionFlag(flag: string): boolean {
    return ['--version', '-v', 'version'].includes(flag.toLowerCase());
  }
}

// Export singleton instance
export const cli_parser = new CliParser();
