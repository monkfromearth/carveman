/**
 * File System Manager using Bun's native APIs
 * Handles directory creation, file reading/writing, and path operations
 */

import { access, mkdir, readdir, stat } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import type {
  ICollectionIndex,
  IFolderIndex,
  IRequestFile
} from '@/types/postman.ts';

/**
 * File System Manager class for handling all file operations
 */
export class FileSystemManager {
  /**
   * Creates a directory recursively if it doesn't exist
   * @param directory_path - Path to create
   * @returns Promise<void>
   */
  async createDirectory(directory_path: string): Promise<void> {
    try {
      await mkdir(directory_path, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory ${directory_path}: ${error}`);
    }
  }

  /**
   * Writes JSON data to a file with proper formatting
   * @param file_path - Path to write the file
   * @param data - Data to write as JSON
   * @returns Promise<void>
   */
  async writeJsonFile(file_path: string, data: any): Promise<void> {
    try {
      // Ensure directory exists
      const dir = dirname(file_path);
      await this.createDirectory(dir);

      // Write formatted JSON using Bun's native file API
      const json_content = JSON.stringify(data, null, 2);
      await Bun.write(file_path, json_content);
    } catch (error) {
      throw new Error(`Failed to write JSON file ${file_path}: ${error}`);
    }
  }

  /**
   * Reads and parses a JSON file
   * @param file_path - Path to read the file from
   * @returns Promise<any> - Parsed JSON data
   */
  async readJsonFile(file_path: string): Promise<any> {
    try {
      const file = Bun.file(file_path);
      return await file.json();
    } catch (error) {
      throw new Error(`Failed to read JSON file ${file_path}: ${error}`);
    }
  }

  /**
   * Checks if a file or directory exists
   * @param path - Path to check
   * @returns Promise<boolean>
   */
  async pathExists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if a path is a directory
   * @param path - Path to check
   * @returns Promise<boolean>
   */
  async isDirectory(path: string): Promise<boolean> {
    try {
      const stats = await stat(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Checks if a path is a file
   * @param path - Path to check
   * @returns Promise<boolean>
   */
  async isFile(path: string): Promise<boolean> {
    try {
      const stats = await stat(path);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Lists all items in a directory
   * @param directory_path - Directory to list
   * @returns Promise<string[]> - Array of item names
   */
  async listDirectory(directory_path: string): Promise<string[]> {
    try {
      return await readdir(directory_path);
    } catch (error) {
      throw new Error(`Failed to list directory ${directory_path}: ${error}`);
    }
  }

  /**
   * Recursively reads directory structure and returns file/folder info
   * @param directory_path - Root directory to scan
   * @returns Promise<DirectoryStructure>
   */
  async scanDirectoryStructure(
    directory_path: string
  ): Promise<DirectoryStructure> {
    const structure: DirectoryStructure = {
      folders: [],
      files: [],
      index_files: []
    };

    try {
      const items = await this.listDirectory(directory_path);

      for (const item of items) {
        const item_path = join(directory_path, item);

        if (await this.isDirectory(item_path)) {
          structure.folders.push({
            name: item,
            path: item_path,
            relative_path: item
          });
        } else if (await this.isFile(item_path)) {
          if (item === 'index.json') {
            structure.index_files.push({
              name: item,
              path: item_path,
              relative_path: item
            });
          } else if (item.endsWith('.json')) {
            structure.files.push({
              name: item,
              path: item_path,
              relative_path: item
            });
          }
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to scan directory structure ${directory_path}: ${error}`
      );
    }

    return structure;
  }

  /**
   * Writes collection index.json file
   * @param directory_path - Directory to write in
   * @param collection_index - Collection index data
   * @returns Promise<void>
   */
  async writeCollectionIndex(
    directory_path: string,
    collection_index: ICollectionIndex
  ): Promise<void> {
    const index_path = join(directory_path, 'index.json');
    await this.writeJsonFile(index_path, collection_index);
  }

  /**
   * Writes folder index.json file
   * @param directory_path - Directory to write in
   * @param folder_index - Folder index data
   * @returns Promise<void>
   */
  async writeFolderIndex(
    directory_path: string,
    folder_index: IFolderIndex
  ): Promise<void> {
    const index_path = join(directory_path, 'index.json');
    await this.writeJsonFile(index_path, folder_index);
  }

  /**
   * Writes request JSON file
   * @param directory_path - Directory to write in
   * @param filename - Name of the file
   * @param request_data - Request data
   * @returns Promise<void>
   */
  async writeRequestFile(
    directory_path: string,
    filename: string,
    request_data: IRequestFile
  ): Promise<void> {
    const file_path = join(directory_path, filename);
    await this.writeJsonFile(file_path, request_data);
  }

  /**
   * Reads collection index.json file
   * @param directory_path - Directory to read from
   * @returns Promise<ICollectionIndex>
   */
  async readCollectionIndex(directory_path: string): Promise<ICollectionIndex> {
    const index_path = join(directory_path, 'index.json');
    return await this.readJsonFile(index_path);
  }

  /**
   * Reads folder index.json file
   * @param directory_path - Directory to read from
   * @returns Promise<IFolderIndex>
   */
  async readFolderIndex(directory_path: string): Promise<IFolderIndex> {
    const index_path = join(directory_path, 'index.json');
    return await this.readJsonFile(index_path);
  }

  /**
   * Reads request JSON file
   * @param file_path - Full path to the request file
   * @returns Promise<IRequestFile>
   */
  async readRequestFile(file_path: string): Promise<IRequestFile> {
    return await this.readJsonFile(file_path);
  }

  /**
   * Validates that a directory has the expected structure
   * @param directory_path - Directory to validate
   * @returns Promise<ValidationResult>
   */
  async validateDirectoryStructure(
    directory_path: string
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      is_valid: true,
      errors: [],
      warnings: []
    };

    try {
      // Check if directory exists
      if (!(await this.pathExists(directory_path))) {
        result.is_valid = false;
        result.errors.push(`Directory does not exist: ${directory_path}`);
        return result;
      }

      // Check if it's actually a directory
      if (!(await this.isDirectory(directory_path))) {
        result.is_valid = false;
        result.errors.push(`Path is not a directory: ${directory_path}`);
        return result;
      }

      // Check for index.json
      const index_path = join(directory_path, 'index.json');
      if (!(await this.pathExists(index_path))) {
        result.is_valid = false;
        result.errors.push(`Missing index.json in: ${directory_path}`);
        return result;
      }

      // Try to parse index.json
      try {
        await this.readJsonFile(index_path);
      } catch (error) {
        result.is_valid = false;
        result.errors.push(`Invalid JSON in index.json: ${error}`);
      }
    } catch (error) {
      result.is_valid = false;
      result.errors.push(`Validation error: ${error}`);
    }

    return result;
  }

  /**
   * Resolves absolute path from relative path
   * @param relative_path - Relative path
   * @returns string - Absolute path
   */
  resolvePath(relative_path: string): string {
    return resolve(relative_path);
  }

  /**
   * Gets the basename of a path
   * @param path - Path to get basename from
   * @returns string - Basename
   */
  getBasename(path: string): string {
    return basename(path);
  }

  /**
   * Gets the directory name of a path
   * @param path - Path to get dirname from
   * @returns string - Directory name
   */
  getDirname(path: string): string {
    return dirname(path);
  }

  /**
   * Joins path segments
   * @param segments - Path segments to join
   * @returns string - Joined path
   */
  joinPath(...segments: string[]): string {
    return join(...segments);
  }
}

// Supporting types
export interface DirectoryItem {
  name: string;
  path: string;
  relative_path: string;
}

export interface DirectoryStructure {
  folders: DirectoryItem[];
  files: DirectoryItem[];
  index_files: DirectoryItem[];
}

export interface ValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}

// Export a singleton instance
export const file_system_manager = new FileSystemManager();
