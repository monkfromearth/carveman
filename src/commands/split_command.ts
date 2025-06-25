/**
 * Split Command - Converts Postman Collection JSON to File System Structure
 */

import { file_system_manager } from '@/fs/file_system_manager.ts';
import { type ProcessedItem, postman_parser } from '@/parser/postman_parser.ts';
import type { IPostmanCollection, ISplitOptions } from '@/types/postman.ts';
import {
  createSafeDirectoryName,
  sanitizeFileName
} from '@/utils/sanitization.ts';

/**
 * Split Command class for converting Postman collections to file system
 */
export class SplitCommand {
  /**
   * Executes the split operation
   * @param input_path - Path to the Postman collection JSON file
   * @param options - Split options
   * @returns Promise<SplitResult>
   */
  async execute(
    input_path: string,
    options: ISplitOptions
  ): Promise<SplitResult> {
    const result: SplitResult = {
      success: false,
      collection_name: '',
      output_directory: '',
      files_created: 0,
      folders_created: 0,
      errors: [],
      warnings: []
    };

    try {
      // Validate input file exists
      if (!(await file_system_manager.pathExists(input_path))) {
        result.errors.push(`Input file does not exist: ${input_path}`);
        return result;
      }

      if (options.verbose) {
        console.log(`📖 Reading Postman collection from: ${input_path}`);
      }

      // Read and parse the collection JSON
      const collection_json =
        await file_system_manager.readJsonFile(input_path);

      // Validate the collection format
      const validation = postman_parser.validateCollection(collection_json);
      if (!validation.is_valid) {
        result.errors.push(...validation.errors);
        return result;
      }

      if (validation.warnings.length > 0) {
        result.warnings.push(...validation.warnings);
        if (options.verbose) {
          for (const warning of validation.warnings) {
            console.log(`⚠️  ${warning}`);
          }
        }
      }

      const collection: IPostmanCollection = collection_json;
      result.collection_name = collection.info.name;

      // Parse the collection
      const parsed_collection = postman_parser.parseCollection(collection);

      // Determine output directory
      const output_dir = options.output || process.cwd();
      const collection_dir_name = createSafeDirectoryName(collection.info.name);
      const full_output_path = file_system_manager.joinPath(
        output_dir,
        collection_dir_name
      );
      result.output_directory = full_output_path;

      // Check if output directory exists and handle overwrite
      if (await file_system_manager.pathExists(full_output_path)) {
        if (!(options.overwrite || options.dry_run)) {
          const response = await this.promptOverwrite(full_output_path);
          if (!response) {
            result.errors.push('Operation cancelled by user');
            return result;
          }
        }
      }

      if (options.verbose) {
        console.log(`📁 Creating collection structure in: ${full_output_path}`);
      }

      // Dry run - just report what would be done
      if (options.dry_run) {
        return this.performDryRun(parsed_collection, full_output_path, options);
      }

      // Create the root collection directory
      await file_system_manager.createDirectory(full_output_path);
      result.folders_created++;

      // Create collection index.json
      const collection_index = postman_parser.createCollectionIndex(
        parsed_collection.info,
        parsed_collection.metadata,
        parsed_collection.structure
      );

      await file_system_manager.writeCollectionIndex(
        full_output_path,
        collection_index
      );
      result.files_created++;

      if (options.verbose) {
        console.log('✅ Created collection index.json');
      }

      // Process all items recursively
      for (const item of parsed_collection.items) {
        const item_result = await this.processItem(
          item,
          full_output_path,
          options
        );
        result.files_created += item_result.files_created;
        result.folders_created += item_result.folders_created;
        result.errors.push(...item_result.errors);
        result.warnings.push(...item_result.warnings);
      }

      result.success = result.errors.length === 0;

      if (options.verbose && result.success) {
        console.log('\n🎉 Split completed successfully!');
        console.log(`   Collection: ${result.collection_name}`);
        console.log(`   Output: ${result.output_directory}`);
        console.log(`   Files created: ${result.files_created}`);
        console.log(`   Folders created: ${result.folders_created}`);
      }
    } catch (error) {
      result.errors.push(`Split operation failed: ${error}`);
    }

    return result;
  }

  /**
   * Processes a single item (folder or request) recursively
   * @param item - Processed item to handle
   * @param parent_path - Parent directory path
   * @param options - Split options
   * @returns Promise<ItemProcessResult>
   */
  private async processItem(
    item: ProcessedItem,
    parent_path: string,
    options: ISplitOptions
  ): Promise<ItemProcessResult> {
    const result: ItemProcessResult = {
      files_created: 0,
      folders_created: 0,
      errors: [],
      warnings: []
    };

    try {
      if (item.type === 'folder') {
        // Create folder directory
        const folder_path = file_system_manager.joinPath(
          parent_path,
          item.sanitized_name
        );
        await file_system_manager.createDirectory(folder_path);
        result.folders_created++;

        if (options.verbose) {
          console.log(`📁 Created folder: ${item.sanitized_name}`);
        }

        // Create folder index.json
        const folder_index = postman_parser.createFolderIndex(
          item,
          parent_path
        );
        await file_system_manager.writeFolderIndex(folder_path, folder_index);
        result.files_created++;

        // Process children recursively
        for (const child of item.children) {
          const child_result = await this.processItem(
            child,
            folder_path,
            options
          );
          result.files_created += child_result.files_created;
          result.folders_created += child_result.folders_created;
          result.errors.push(...child_result.errors);
          result.warnings.push(...child_result.warnings);
        }
      } else if (item.type === 'request') {
        // Create request file
        const request_filename = sanitizeFileName(item.sanitized_name);
        const request_data = postman_parser.createRequestFile(
          item,
          parent_path
        );

        await file_system_manager.writeRequestFile(
          parent_path,
          request_filename,
          request_data
        );
        result.files_created++;

        if (options.verbose) {
          console.log(`📄 Created request: ${request_filename}`);
        }
      }
    } catch (error) {
      result.errors.push(
        `Failed to process item ${item.original_name}: ${error}`
      );
    }

    return result;
  }

  /**
   * Performs a dry run and reports what would be done
   * @param parsed_collection - Parsed collection data
   * @param output_path - Output path
   * @param options - Split options
   * @returns SplitResult
   */
  private performDryRun(
    parsed_collection: any,
    output_path: string,
    options: ISplitOptions
  ): SplitResult {
    const result: SplitResult = {
      success: true,
      collection_name: parsed_collection.info.name,
      output_directory: output_path,
      files_created: 0,
      folders_created: 0,
      errors: [],
      warnings: []
    };

    console.log('\n🔍 DRY RUN - No files will be created\n');
    console.log(`Would create collection structure in: ${output_path}`);
    console.log(`Collection: ${parsed_collection.info.name}\n`);

    // Count what would be created
    result.folders_created = 1; // Root folder
    result.files_created = 1; // Collection index.json

    const count_result = this.countItems(parsed_collection.items);
    result.files_created += count_result.files;
    result.folders_created += count_result.folders;

    console.log('Would create:');
    console.log(`  📁 ${result.folders_created} folders`);
    console.log(`  📄 ${result.files_created} files`);

    if (options.verbose) {
      console.log('\nStructure preview:');
      this.printStructure(parsed_collection.items, '');
    }

    return result;
  }

  /**
   * Counts items recursively for dry run
   * @param items - Array of processed items
   * @returns Count result
   */
  private countItems(items: ProcessedItem[]): {
    files: number;
    folders: number;
  } {
    let files = 0;
    let folders = 0;

    for (const item of items) {
      if (item.type === 'folder') {
        folders++; // Folder itself
        files++; // index.json
        const child_counts = this.countItems(item.children);
        files += child_counts.files;
        folders += child_counts.folders;
      } else if (item.type === 'request') {
        files++; // Request file
      }
    }

    return { files, folders };
  }

  /**
   * Prints structure preview for dry run
   * @param items - Array of processed items
   * @param indent - Current indentation
   */
  private printStructure(items: ProcessedItem[], indent: string): void {
    for (const item of items) {
      if (item.type === 'folder') {
        console.log(`${indent}📁 ${item.sanitized_name}/`);
        console.log(`${indent}  📄 index.json`);
        this.printStructure(item.children, `${indent}  `);
      } else if (item.type === 'request') {
        console.log(`${indent}📄 ${sanitizeFileName(item.sanitized_name)}`);
      }
    }
  }

  /**
   * Prompts user for overwrite confirmation
   * @param path - Path that would be overwritten
   * @returns Promise<boolean> - True if user confirms
   */
  private async promptOverwrite(path: string): Promise<boolean> {
    console.log(`\n⚠️  Directory already exists: ${path}`);
    console.log(
      'Do you want to overwrite it? This will remove all existing content.'
    );

    // For now, return false to be safe. In a real CLI, this would prompt the user
    // You could use a library like 'prompts' for interactive input
    console.log('Use --overwrite flag to proceed automatically.');
    return false;
  }
}

// Supporting types
export interface SplitResult {
  success: boolean;
  collection_name: string;
  output_directory: string;
  files_created: number;
  folders_created: number;
  errors: string[];
  warnings: string[];
}

export interface ItemProcessResult {
  files_created: number;
  folders_created: number;
  errors: string[];
  warnings: string[];
}

// Export singleton instance
export const split_command = new SplitCommand();
