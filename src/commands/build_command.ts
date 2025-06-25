/**
 * Build Command - Reconstructs Postman Collection JSON from File System Structure
 */

import { file_system_manager } from '@/fs/file_system_manager.ts';
import type {
  IBuildOptions,
  IPostmanCollection,
  IPostmanItem
} from '@/types/postman.ts';

/**
 * Build Command class for reconstructing Postman collections from file system
 */
export class BuildCommand {
  /**
   * Executes the build operation
   * @param input_path - Path to the collection directory
   * @param options - Build options
   * @returns Promise<BuildResult>
   */
  async execute(
    input_path: string,
    options: IBuildOptions
  ): Promise<BuildResult> {
    const result: BuildResult = {
      success: false,
      collection_name: '',
      output_file: '',
      items_processed: 0,
      errors: [],
      warnings: []
    };

    try {
      // Validate input directory exists
      if (!(await file_system_manager.pathExists(input_path))) {
        result.errors.push(`Input directory does not exist: ${input_path}`);
        return result;
      }

      if (!(await file_system_manager.isDirectory(input_path))) {
        result.errors.push(`Input path is not a directory: ${input_path}`);
        return result;
      }

      if (options.verbose) {
        console.log(`📖 Reading collection structure from: ${input_path}`);
      }

      // Validate directory structure
      const validation =
        await file_system_manager.validateDirectoryStructure(input_path);
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

      // Read collection index
      const collection_index =
        await file_system_manager.readCollectionIndex(input_path);
      result.collection_name = collection_index.info.name;

      if (options.verbose) {
        console.log(`📁 Building collection: ${result.collection_name}`);
      }

      // Build the collection structure
      const collection: IPostmanCollection = {
        info: collection_index.info,
        item: [],
        variable: collection_index.variable,
        event: collection_index.event,
        auth: collection_index.auth,
        protocolProfileBehavior: collection_index.protocolProfileBehavior
      };

      // Process items in the order specified in index.json
      for (const item_name of collection_index.order) {
        const item_path = file_system_manager.joinPath(input_path, item_name);

        if (await file_system_manager.pathExists(item_path)) {
          const processed_item = await this.processItem(item_path, options);
          if (processed_item) {
            collection.item.push(processed_item);
            result.items_processed++;
          }
        } else {
          result.warnings.push(`Item not found: ${item_name}`);
        }
      }

      // Determine output file path
      const output_file = options.output || 'collection.json';
      result.output_file = file_system_manager.resolvePath(output_file);

      // Validate collection if requested
      if (options.validate) {
        if (options.verbose) {
          console.log('🔍 Validating reconstructed collection...');
        }

        const validation_result =
          this.validateReconstructedCollection(collection);
        if (!validation_result.is_valid) {
          result.errors.push(...validation_result.errors);
          return result;
        }

        if (validation_result.warnings.length > 0) {
          result.warnings.push(...validation_result.warnings);
        }
      }

      // Write the collection JSON
      await file_system_manager.writeJsonFile(result.output_file, collection);

      result.success = result.errors.length === 0;

      if (options.verbose && result.success) {
        console.log('\n🎉 Build completed successfully!');
        console.log(`   Collection: ${result.collection_name}`);
        console.log(`   Output: ${result.output_file}`);
        console.log(`   Items processed: ${result.items_processed}`);
      }
    } catch (error) {
      result.errors.push(`Build operation failed: ${error}`);
    }

    return result;
  }

  /**
   * Processes a single item (folder or request) from file system
   * @param item_path - Path to the item (folder or file)
   * @param options - Build options
   * @returns Promise<IPostmanItem | null>
   */
  private async processItem(
    item_path: string,
    options: IBuildOptions
  ): Promise<IPostmanItem | null> {
    try {
      if (await file_system_manager.isDirectory(item_path)) {
        // It's a folder
        return await this.processFolder(item_path, options);
      }

      if (
        (await file_system_manager.isFile(item_path)) &&
        item_path.endsWith('.json')
      ) {
        // It's a request file
        return await this.processRequest(item_path, options);
      }
    } catch (error) {
      if (options.verbose) {
        console.log(`⚠️  Failed to process item ${item_path}: ${error}`);
      }
    }

    return null;
  }

  /**
   * Processes a folder and its contents
   * @param folder_path - Path to the folder
   * @param options - Build options
   * @returns Promise<IPostmanItem>
   */
  private async processFolder(
    folder_path: string,
    options: IBuildOptions
  ): Promise<IPostmanItem> {
    // Read folder index
    const folder_index = await file_system_manager.readFolderIndex(folder_path);

    const folder_item: IPostmanItem = {
      name: folder_index.name,
      description: folder_index.description,
      variable: folder_index.variable,
      event: folder_index.event,
      auth: folder_index.auth,
      protocolProfileBehavior: folder_index.protocolProfileBehavior,
      item: []
    };

    if (options.verbose) {
      console.log(`📁 Processing folder: ${folder_index.name}`);
    }

    // Process children in the order specified in index.json
    for (const child_name of folder_index.order) {
      const child_path = file_system_manager.joinPath(folder_path, child_name);

      if (await file_system_manager.pathExists(child_path)) {
        const child_item = await this.processItem(child_path, options);
        if (child_item && folder_item.item) {
          folder_item.item.push(child_item);
        }
      } else if (options.verbose) {
        console.log(`⚠️  Child item not found: ${child_name}`);
      }
    }

    return folder_item;
  }

  /**
   * Processes a request file
   * @param request_path - Path to the request file
   * @param options - Build options
   * @returns Promise<IPostmanItem>
   */
  private async processRequest(
    request_path: string,
    options: IBuildOptions
  ): Promise<IPostmanItem> {
    // Read request file
    const request_data =
      await file_system_manager.readRequestFile(request_path);

    const request_item: IPostmanItem = {
      name: request_data.name,
      description: request_data.description,
      variable: request_data.variable,
      event: request_data.event,
      auth: request_data.auth,
      protocolProfileBehavior: request_data.protocolProfileBehavior,
      request: request_data.request,
      response: request_data.response
    };

    if (options.verbose) {
      console.log(`📄 Processing request: ${request_data.name}`);
    }

    return request_item;
  }

  /**
   * Validates the reconstructed collection
   * @param collection - Collection to validate
   * @returns ValidationResult
   */
  private validateReconstructedCollection(
    collection: IPostmanCollection
  ): ValidationResult {
    const result: ValidationResult = {
      is_valid: true,
      errors: [],
      warnings: []
    };

    // Basic validation
    if (!collection.info) {
      result.is_valid = false;
      result.errors.push('Missing collection info');
      return result;
    }

    if (!collection.info.name) {
      result.is_valid = false;
      result.errors.push('Missing collection name');
    }

    if (!collection.info.schema) {
      result.is_valid = false;
      result.errors.push('Missing collection schema');
    }

    if (!Array.isArray(collection.item)) {
      result.is_valid = false;
      result.errors.push('Collection items must be an array');
      return result;
    }

    // Validate items recursively
    const item_validation = this.validateItems(collection.item);
    result.errors.push(...item_validation.errors);
    result.warnings.push(...item_validation.warnings);

    if (item_validation.errors.length > 0) {
      result.is_valid = false;
    }

    return result;
  }

  /**
   * Validates items array recursively
   * @param items - Array of items to validate
   * @param path - Current path for error reporting
   * @returns ValidationResult
   */
  private validateItems(
    items: IPostmanItem[],
    path = 'root'
  ): ValidationResult {
    const result: ValidationResult = {
      is_valid: true,
      errors: [],
      warnings: []
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) {
        result.errors.push(`Item at index ${i} is undefined`);
        continue;
      }

      const item_path = `${path}.item[${i}]`;

      if (!item.name) {
        result.errors.push(`Missing name for item at ${item_path}`);
        continue;
      }

      // Check if it's a folder (has item array) or request (has request object)
      const has_items = Array.isArray(item.item);
      const has_request = item.request && typeof item.request === 'object';

      if (has_items && has_request) {
        result.warnings.push(
          `Item at ${item_path} has both "item" and "request" fields`
        );
      } else if (!(has_items || has_request)) {
        result.errors.push(
          `Item at ${item_path} has neither "item" nor "request" field`
        );
        continue;
      }

      // Recursively validate nested items if it's a folder
      if (has_items && item.item) {
        const nested_validation = this.validateItems(item.item, item_path);
        result.errors.push(...nested_validation.errors);
        result.warnings.push(...nested_validation.warnings);
      }
    }

    return result;
  }

  /**
   * Counts total items in a collection for reporting
   * @param items - Array of items to count
   * @returns Count of items
   */
  private countItems(items: IPostmanItem[]): number {
    let count = 0;

    for (const item of items) {
      count++;
      if (item?.item) {
        count += this.countItems(item.item);
      }
    }

    return count;
  }
}

// Supporting types
export interface BuildResult {
  success: boolean;
  collection_name: string;
  output_file: string;
  items_processed: number;
  errors: string[];
  warnings: string[];
}

export interface ValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}

// Export singleton instance
export const build_command = new BuildCommand();
