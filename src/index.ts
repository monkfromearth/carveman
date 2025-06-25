#!/usr/bin/env bun

/**
 * Carveman - Postman Collection File System Utility
 * Main entry point that coordinates CLI parsing and command execution
 */

import { cli_parser } from '@/cli/cli_parser.ts';
import { build_command } from '@/commands/build_command.ts';
import { split_command } from '@/commands/split_command.ts';
import type { IBuildOptions, ISplitOptions } from '@/types/postman.ts';

/**
 * Main application class
 */
class CarvemanApp {
  /**
   * Runs the application
   * @returns Promise<void>
   */
  async run(): Promise<void> {
    try {
      // Parse command-line arguments
      const command = cli_parser.parse();

      if (!command) {
        // Help or version was shown, or parsing failed
        process.exit(0);
      }

      // Validate the command
      if (!cli_parser.validateCommand(command)) {
        process.exit(1);
      }

      // Execute the appropriate command
      switch (command.command) {
        case 'split':
          await this.executeSplit(
            command.input_path,
            command.options as ISplitOptions
          );
          break;
        case 'build':
          await this.executeBuild(
            command.input_path,
            command.options as IBuildOptions
          );
          break;
        default: {
          console.error(`Unknown command: ${command.command}`);
          process.exit(1);
        }
      }
    } catch (error) {
      console.error(`❌ Error: ${error}`);
      process.exit(1);
    }
  }

  /**
   * Executes the split command
   * @param input_path - Path to the Postman collection JSON file
   * @param options - Split options
   * @returns Promise<void>
   */
  private async executeSplit(
    input_path: string,
    options: ISplitOptions
  ): Promise<void> {
    const result = await split_command.execute(input_path, options);

    if (result.success) {
      if (!options.verbose) {
        console.log(`✅ Split completed: ${result.collection_name}`);
        console.log(`   Output: ${result.output_directory}`);
        console.log(
          `   Files: ${result.files_created}, Folders: ${result.folders_created}`
        );
      }

      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        for (const warning of result.warnings) {
          console.log(`   ${warning}`);
        }
      }
    } else {
      console.error('❌ Split failed:');
      for (const error of result.errors) {
        console.error(`   ${error}`);
      }

      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        for (const warning of result.warnings) {
          console.log(`   ${warning}`);
        }
      }

      process.exit(1);
    }
  }

  /**
   * Executes the build command
   * @param input_path - Path to the collection directory
   * @param options - Build options
   * @returns Promise<void>
   */
  private async executeBuild(
    input_path: string,
    options: IBuildOptions
  ): Promise<void> {
    const result = await build_command.execute(input_path, options);

    if (result.success) {
      if (!options.verbose) {
        console.log(`✅ Build completed: ${result.collection_name}`);
        console.log(`   Output: ${result.output_file}`);
        console.log(`   Items processed: ${result.items_processed}`);
      }

      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        for (const warning of result.warnings) {
          console.log(`   ${warning}`);
        }
      }
    } else {
      console.error('❌ Build failed:');
      for (const error of result.errors) {
        console.error(`   ${error}`);
      }

      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        for (const warning of result.warnings) {
          console.log(`   ${warning}`);
        }
      }

      process.exit(1);
    }
  }
}

// Run the application - works in both Bun and Node.js environments
(async () => {
  const app = new CarvemanApp();
  await app.run();
})();
