/**
 * Postman Collection Parser
 * Handles parsing, validation, and processing of Postman Collection v2.1 format
 */

import type {
  ICollectionIndex,
  IFolderIndex,
  IPostmanCollection,
  IPostmanInfo,
  IPostmanItem,
  IRequestFile,
  PostmanItemType
} from '@/types/postman.ts';
import {
  generateUniqueName,
  sanitizeOriginalName,
  sanitizeOriginalFileName
} from '@/utils/sanitization.ts';

/**
 * Postman Collection Parser class
 */
export class PostmanParser {
  private existing_names: Set<string> = new Set();

  /**
   * Validates if the JSON is a valid Postman Collection v2.1
   * @param json_data - Raw JSON data to validate
   * @returns ValidationResult
   */
  validateCollection(json_data: any): ValidationResult {
    const result: ValidationResult = {
      is_valid: true,
      errors: [],
      warnings: []
    };

    try {
      // Check if it's an object
      if (!json_data || typeof json_data !== 'object') {
        result.is_valid = false;
        result.errors.push('Invalid JSON: not an object');
        return result;
      }

      // Check for required info field
      if (!json_data.info) {
        result.is_valid = false;
        result.errors.push('Missing required "info" field');
        return result;
      }

      // Validate info structure
      const info = json_data.info;
      if (!info.name || typeof info.name !== 'string') {
        result.is_valid = false;
        result.errors.push('Missing or invalid "info.name" field');
      }

      if (!info.schema || typeof info.schema !== 'string') {
        result.is_valid = false;
        result.errors.push('Missing or invalid "info.schema" field');
      } else if (!info.schema.includes('v2.1')) {
        result.warnings.push(
          'Schema version is not v2.1, some features may not work correctly'
        );
      }

      // Check for required item field
      if (!json_data.item) {
        result.is_valid = false;
        result.errors.push('Missing required "item" field');
        return result;
      }

      if (!Array.isArray(json_data.item)) {
        result.is_valid = false;
        result.errors.push('"item" field must be an array');
        return result;
      }

      // Validate items structure
      const item_validation = this.validateItems(json_data.item);
      result.errors.push(...item_validation.errors);
      result.warnings.push(...item_validation.warnings);

      if (item_validation.errors.length > 0) {
        result.is_valid = false;
      }
    } catch (error) {
      result.is_valid = false;
      result.errors.push(`Validation error: ${error}`);
    }

    return result;
  }

  /**
   * Validates items array recursively
   * @param items - Array of items to validate
   * @param path - Current path for error reporting
   * @returns ValidationResult
   */
  private validateItems(items: any[], path = 'root'): ValidationResult {
    const result: ValidationResult = {
      is_valid: true,
      errors: [],
      warnings: []
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const item_path = `${path}.item[${i}]`;

      if (!item || typeof item !== 'object') {
        result.errors.push(`Invalid item at ${item_path}: not an object`);
        continue;
      }

      if (!item.name || typeof item.name !== 'string') {
        result.errors.push(
          `Invalid item at ${item_path}: missing or invalid name`
        );
        continue;
      }

      // Check if it's a folder (has item array) or request (has request object)
      const has_items = Array.isArray(item.item);
      const has_request = item.request && typeof item.request === 'object';

      if (has_items && has_request) {
        result.warnings.push(
          `Item at ${item_path} has both "item" and "request" fields, treating as folder`
        );
      } else if (!(has_items || has_request)) {
        result.errors.push(
          `Item at ${item_path} has neither "item" nor "request" field`
        );
        continue;
      }

      // Recursively validate nested items if it's a folder
      if (has_items) {
        const nested_validation = this.validateItems(item.item, item_path);
        result.errors.push(...nested_validation.errors);
        result.warnings.push(...nested_validation.warnings);
      }
    }

    return result;
  }

  /**
   * Parses a Postman collection and extracts metadata
   * @param collection - Postman collection object
   * @returns ParsedCollection
   */
  parseCollection(collection: IPostmanCollection): ParsedCollection {
    this.existing_names.clear();

    const parsed: ParsedCollection = {
      info: collection.info,
      metadata: {
        variable: collection.variable || [],
        event: collection.event || [],
        auth: collection.auth,
        protocolProfileBehavior: collection.protocolProfileBehavior
      },
      items: [],
      structure: []
    };

    // Process all items
    for (const item of collection.item) {
      const processed_item = this.processItem(item, '');
      parsed.items.push(processed_item);
      parsed.structure.push(this.createStructureItem(processed_item));
    }

    return parsed;
  }

  /**
   * Processes a single item (folder or request) recursively
   * @param item - Postman item to process
   * @param parent_path - Path of the parent folder
   * @returns ProcessedItem
   */
  private processItem(item: IPostmanItem, parent_path: string): ProcessedItem {
    const sanitized_name = sanitizeOriginalName(item.name);
    const unique_name = generateUniqueName(sanitized_name, this.existing_names);
    this.existing_names.add(unique_name);

    const current_path = parent_path
      ? `${parent_path}/${unique_name}`
      : unique_name;

    const processed: ProcessedItem = {
      original_name: item.name,
      sanitized_name: unique_name,
      path: current_path,
      type: item.item ? 'folder' : 'request',
      description: item.description,
      variable: item.variable,
      event: item.event,
      auth: item.auth,
      protocolProfileBehavior: item.protocolProfileBehavior,
      children: []
    };

    if (item.item) {
      // It's a folder - process children
      for (const child_item of item.item) {
        const child_processed = this.processItem(child_item, current_path);
        processed.children.push(child_processed);
      }
    } else if (item.request) {
      // It's a request - store request data
      processed.request = item.request;
      processed.response = item.response || [];
    }

    return processed;
  }

  /**
   * Creates a structure item for the file system hierarchy
   * @param processed_item - Processed item
   * @returns StructureItem
   */
  private createStructureItem(processed_item: ProcessedItem): StructureItem {
    const structure_item: StructureItem = {
      name: processed_item.sanitized_name,
      type: processed_item.type,
      original_name: processed_item.original_name,
      children: []
    };

    if (processed_item.children.length > 0) {
      structure_item.children = processed_item.children.map((child) =>
        this.createStructureItem(child)
      );
    }

    return structure_item;
  }

  /**
   * Creates collection index data for file system
   * @param collection_info - Collection info
   * @param metadata - Collection metadata
   * @param structure - Collection structure
   * @returns ICollectionIndex
   */
  createCollectionIndex(
    collection_info: IPostmanInfo,
    metadata: CollectionMetadata,
    structure: StructureItem[]
  ): ICollectionIndex {
    return {
      meta: {
        type: 'collection',
        version: '2.1.0',
        generated_by: 'carveman',
        generated_at: new Date().toISOString()
      },
      info: collection_info,
      variable: metadata.variable,
      event: metadata.event,
      auth: metadata.auth,
      protocolProfileBehavior: metadata.protocolProfileBehavior,
      order: structure.map((item) =>
        item.type === 'folder' ? item.name : `${item.name}.json`
      )
    };
  }

  /**
   * Creates folder index data for file system
   * @param processed_item - Processed folder item
   * @param parent_path - Parent path
   * @returns IFolderIndex
   */
  createFolderIndex(
    processed_item: ProcessedItem,
    parent_path: string
  ): IFolderIndex {
    if (processed_item.type !== 'folder') {
      throw new Error('Cannot create folder index for non-folder item');
    }

    const order = processed_item.children.map((child) => {
      return child.type === 'folder'
        ? child.sanitized_name
        : sanitizeOriginalFileName(child.sanitized_name);
    });

    return {
      meta: {
        type: 'folder',
        parent_path: parent_path
      },
      name: processed_item.original_name,
      description: processed_item.description,
      variable: processed_item.variable,
      event: processed_item.event,
      auth: processed_item.auth,
      protocolProfileBehavior: processed_item.protocolProfileBehavior,
      order: order
    };
  }

  /**
   * Creates request file data for file system
   * @param processed_item - Processed request item
   * @param folder_path - Folder path
   * @returns IRequestFile
   */
  createRequestFile(
    processed_item: ProcessedItem,
    folder_path: string
  ): IRequestFile {
    if (processed_item.type !== 'request' || !processed_item.request) {
      throw new Error('Cannot create request file for non-request item');
    }

    return {
      meta: {
        type: 'request',
        folder_path: folder_path
      },
      name: processed_item.original_name,
      description: processed_item.description,
      variable: processed_item.variable,
      event: processed_item.event,
      request: processed_item.request,
      response: processed_item.response,
      auth: processed_item.auth,
      protocolProfileBehavior: processed_item.protocolProfileBehavior
    };
  }

  /**
   * Gets all request items from a processed structure (flattened)
   * @param processed_items - Array of processed items
   * @returns ProcessedItem[] - Array of request items only
   */
  getRequestItems(processed_items: ProcessedItem[]): ProcessedItem[] {
    const requests: ProcessedItem[] = [];

    for (const item of processed_items) {
      if (item.type === 'request') {
        requests.push(item);
      } else if (item.children.length > 0) {
        requests.push(...this.getRequestItems(item.children));
      }
    }

    return requests;
  }

  /**
   * Gets all folder items from a processed structure (flattened)
   * @param processed_items - Array of processed items
   * @returns ProcessedItem[] - Array of folder items only
   */
  getFolderItems(processed_items: ProcessedItem[]): ProcessedItem[] {
    const folders: ProcessedItem[] = [];

    for (const item of processed_items) {
      if (item.type === 'folder') {
        folders.push(item);
        if (item.children.length > 0) {
          folders.push(...this.getFolderItems(item.children));
        }
      }
    }

    return folders;
  }
}

// Supporting types
export interface ValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CollectionMetadata {
  variable: any[];
  event: any[];
  auth?: any;
  protocolProfileBehavior?: any;
}

export interface ProcessedItem {
  original_name: string;
  sanitized_name: string;
  path: string;
  type: PostmanItemType;
  description?: string;
  variable?: any[];
  event?: any[];
  auth?: any;
  protocolProfileBehavior?: any;
  request?: any;
  response?: any[];
  children: ProcessedItem[];
}

export interface StructureItem {
  name: string;
  type: PostmanItemType;
  original_name: string;
  children: StructureItem[];
}

export interface ParsedCollection {
  info: IPostmanInfo;
  metadata: CollectionMetadata;
  items: ProcessedItem[];
  structure: StructureItem[];
}

// Export singleton instance
export const postman_parser = new PostmanParser();
