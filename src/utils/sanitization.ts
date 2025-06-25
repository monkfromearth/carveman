/**
 * Utilities for sanitizing names to follow snake_case conventions
 * and ensure file system compatibility
 */

/**
 * Sanitizes a name to snake_case format suitable for file system usage
 * @param name - The original name to sanitize
 * @returns Sanitized name in snake_case format
 */
export function sanitizeName(name: string): string {
  return name
    // Replace spaces with underscores
    .replace(/\s+/g, '_')
    // Replace hyphens with underscores
    .replace(/-/g, '_')
    // Remove special characters except underscores and alphanumeric
    .replace(/[^a-zA-Z0-9_]/g, '')
    // Convert to lowercase
    .toLowerCase()
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '')
    // Replace multiple consecutive underscores with single underscore
    .replace(/_+/g, '_')
    // Ensure it doesn't start with a number
    .replace(/^(\d)/, '_$1')
    // Handle empty strings
    || 'unnamed';
}

/**
 * Generates a unique name by appending a counter if conflicts exist
 * @param base_name - The base sanitized name
 * @param existing_names - Set of already existing names
 * @returns Unique name
 */
export function generateUniqueName(base_name: string, existing_names: Set<string>): string {
  let unique_name = base_name;
  let counter = 1;
  
  while (existing_names.has(unique_name)) {
    unique_name = `${base_name}_${counter}`;
    counter++;
  }
  
  return unique_name;
}

/**
 * Sanitizes a filename by adding appropriate extension
 * @param name - The name to sanitize
 * @param extension - File extension (default: '.json')
 * @returns Sanitized filename with extension
 */
export function sanitizeFileName(name: string, extension: string = '.json'): string {
  const sanitized = sanitizeName(name);
  return `${sanitized}${extension}`;
}

/**
 * Validates if a name is safe for file system usage
 * @param name - Name to validate
 * @returns True if name is safe, false otherwise
 */
export function isValidFileName(name: string): boolean {
  // Check for empty or only whitespace
  if (!name || name.trim().length === 0) {
    return false;
  }
  
  // Check for reserved names on Windows
  const reserved_names = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ];
  
  if (reserved_names.includes(name.toUpperCase())) {
    return false;
  }
  
  // Check for invalid characters
  const invalid_chars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalid_chars.test(name)) {
    return false;
  }
  
  // Check length (most file systems support 255 characters)
  if (name.length > 255) {
    return false;
  }
  
  return true;
}

/**
 * Creates a safe directory name from a collection name
 * @param collection_name - Original collection name
 * @returns Safe directory name
 */
export function createSafeDirectoryName(collection_name: string): string {
  return sanitizeName(collection_name) || 'collection';
}

/**
 * Truncates a name if it's too long while preserving readability
 * @param name - Name to truncate
 * @param max_length - Maximum length (default: 200)
 * @returns Truncated name
 */
export function truncateName(name: string, max_length: number = 200): string {
  if (name.length <= max_length) {
    return name;
  }
  
  // Try to truncate at word boundary
  const truncated = name.substring(0, max_length);
  const last_underscore = truncated.lastIndexOf('_');
  
  if (last_underscore > max_length * 0.7) {
    return truncated.substring(0, last_underscore);
  }
  
  return truncated;
} 