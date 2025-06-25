# Postman Collection File System Utility - Product Requirements Document

## Overview

This CLI utility, built with Bun, enables conversion between Postman Collection v2.1 JSON files and a file system-based structure. It supports version control, collaboration with AI agents, and granular API request management by decomposing collections into a folder hierarchy and recomposing them back into JSON.

## Product Goals

- **Split**: Transform Postman JSON collections into an organized file system structure.
- **Build**: Rebuild Postman Collection v2.1 JSON from the file system.
- **Preserve Data**: Maintain all metadata, examples, nested folders, and variables.
- **Developer Experience**: Provide an intuitive CLI with clear feedback and options.
- **Performance**: Leverage Bun's native performance for efficient file operations.

## Architecture Overview

### Two Core Utilities

1. **`carveman split`** - Converts Postman JSON → File System
2. **`carveman build`** - Converts File System → Postman JSON

### File System Structure Format

The file system mirrors the Postman collection's hierarchy, supporting arbitrary nesting of folders:

```
sample-collection/
├── index.json                 # Collection metadata
├── Folder1/
│   ├── index.json            # Folder metadata for "Folder1"
│   ├── SubFolder1/
│   │   ├── index.json        # Folder metadata for "SubFolder1"
│   │   ├── Request1.json     # Request "Request1" with examples
│   │   ├── Request2.json     # Request "Request2" with examples
│   ├── SubFolder2/
│   │   ├── index.json        # Folder metadata for "SubFolder2"
│   │   ├── SubSubFolder/
│   │   │   ├── index.json    # Folder metadata for "SubSubFolder"
│   │   │   ├── Request3.json # Request "Request3" with examples
│   ├── Request4.json         # Request "Request4" with examples
├── Folder2/
│   ├── index.json            # Folder metadata for "Folder2"
│   ├── Request5.json         # Request "Request5" with examples
```

- Each folder contains an `index.json` with metadata.
- Requests are stored as individual `.json` files, named after their `name` field (sanitized).
- Supports multiple levels of nested folders (e.g., `Folder1/SubFolder2/SubSubFolder`).

## Detailed Requirements

### 1. Core Functionality

#### 1.1 Postman JSON Analysis
- **Parse Postman Collection v2.1 Format**
  - Validate JSON against the Postman v2.1 schema.
  - Handle nested folder structures (e.g., `Folder1 > SubFolder2 > SubSubFolder`).
  - Support variables, events, and authentication.

- **Extract Collection Metadata**
  - Capture `info` (name, description, schema).
  - Extract collection-level variables and events (pre-request/test scripts).

- **Process Folder Hierarchy**
  - Recursively process nested `item` arrays for folders and requests.
  - Preserve order of items as defined in the `item` array.
  - Extract folder metadata (e.g., `name`, `description`).

- **Extract Individual Requests**
  - Capture request details (method, URL, headers, body).
  - Include responses/examples.
  - Preserve metadata like `name` and scripts.

#### 1.2 File System Operations
- **Directory Creation**
  - Use Bun's `Bun.file()` and `fs` APIs for directory creation.
  - Sanitize folder/request names (e.g., replace spaces with underscores).
  - Resolve naming conflicts (e.g., append `_1` for duplicates).

- **JSON File Generation**
  - Write formatted JSON files for readability.
  - Store folder metadata in `index.json`.
  - Save requests as `.json` files.

- **File System Reading**
  - Recursively read directories and JSON files.
  - Rebuild hierarchy using `index.json` and request files.
  - Validate JSON integrity during recomposition.

### 2. CLI Interface Design

#### 2.1 Command Structure
```bash
# Split command
pnpx carveman split <input-json-file> [output-directory] [options]

# Build command
pnpx carveman build <input-directory> [output-json-file] [options]

# Help and version
pnpx carveman split --help
pnpx carveman build --version
```

#### 2.2 Command Options
**Split Options:**
- `--output, -o`: Output directory (default: current directory).
- `--overwrite`: Overwrite existing files without prompt.
- `--dry-run`: Simulate without creating files.
- `--verbose, -v`: Detailed logging.

**Build Options:**
- `--output, -o`: Output JSON file (default: `collection.json`).
- `--validate`: Validate against Postman v2.1 schema.
- `--verbose, -v`: Detailed logging.

#### 2.3 User Experience Features
- **Interactive Prompts**
  - Confirm overwrites if directory exists.
  - Show progress for large collections.
- **Error Handling**
  - Handle invalid JSON or missing files.
  - Provide clear error messages (e.g., "Missing index.json in Folder1").
- **Feedback**
  - Summarize created files or recomposed structure.

### 3. JSON Structure Specifications

#### 3.1 Collection `index.json`
```json
{
  "meta": {
    "type": "collection",
    "version": "2.1.0",
    "generated_by": "postman-utility",
    "generated_at": "2025-06-25T21:23:00.000Z"
  },
  "info": {
    "name": "Sample Collection",
    "description": "A generic Postman collection.",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {"key": "BASE_URL", "value": "https://api.example.com"}
  ],
  "event": [
    {"listen": "prerequest", "script": {...}},
    {"listen": "test", "script": {...}}
  ],
  "order": ["Folder1", "Folder2"]
}
```

#### 3.2 Folder `index.json`
```json
{
  "meta": {
    "type": "folder",
    "parent_path": "sample-collection/Folder1/SubFolder2"
  },
  "name": "SubSubFolder",
  "description": "A nested subfolder.",
  "order": ["Request3.json"]
}
```

#### 3.3 Request JSON
```json
{
  "meta": {
    "type": "request",
    "folder_path": "sample-collection/Folder1/SubFolder1"
  },
  "name": "Request1",
  "request": {
    "method": "GET",
    "header": [
      {"key": "Authorization", "value": "{{API_KEY}}"}
    ],
    "url": {
      "raw": "{{BASE_URL}}/resource",
      "host": ["{{BASE_URL}}"],
      "path": ["resource"]
    }
  },
  "response": [
    {
      "name": "Success",
      "status": "OK",
      "code": 200,
      "body": "{...}"
    }
  ]
}
```

###  nudity

System: 4. Technical Implementation Tasks

#### 4.1 Project Setup
- Initialize Bun project with TypeScript: `bun init`.
- Set up project structure: `src/parser`, `src/fs`, `src/cli`.
- Configure CLI entry points in `package.json`.

#### 4.2 JSON Parsing Module
- Parse Postman JSON with `Bun.file().json()`.
- Validate schema (check `info.schema` and structure).
- Extract metadata (`info`, `variable`, `event`).
- Recursively process `item` array for folders and requests, handling nested folders.

#### 4.3 File System Module
- Create directories with `await Bun.write()` and `fs.mkdir`.
- Sanitize names (replace spaces with `_`, remove invalid chars).
- Write JSON files with `Bun.write(path, JSON.stringify(data, null, 2))`.
- Read directories with `fs.readdirSync` and parse JSON with `Bun.file().json()`.

#### 4.4 Split Utility
- Read input JSON: `const collection = await Bun.file(inputPath).json()`.
- Create root directory named after collection (e.g., `sample-collection`).
- Write collection `index.json` with metadata and `order`.
- Recursively process `item`:
  - Folders: Create dir, write `index.json`, recurse into nested folders.
  - Requests: Write `.json` file with request data.
- Track order in `index.json` (e.g., `["Request1.json", ...]`).

#### 4.5 Build Utility
- Read root `index.json` for collection metadata.
- Traverse directories recursively, respecting nested folder structures:
  - Parse folder `index.json` for metadata and `order`.
  - Parse request `.json` files.
- Rebuild `item` array using `order`.
- Write output JSON with `Bun.write(outputPath, JSON.stringify(collection, null, 2))`.

#### 4.6 CLI Interface Module
- Parse args with Bun's `process.argv`.
- Implement `split` and `build` commands.
- Add options (`--output`, `--overwrite`, `--verbose`).
- Use `console.log` for feedback, `console.error` for errors.

#### 4.7 Error Handling and Logging
- Catch JSON parsing errors and invalid schemas.
- Handle file system errors (permissions, conflicts).
- Log verbose output with `--verbose` flag.

#### 4.8 Testing
- Test with a generic collection containing nested folders.
- Verify round-trip (split → build) preserves data.
- Check nested folder handling (e.g., `Folder1/SubFolder2/SubSubFolder`).
- Validate output JSON imports into Postman.

#### 4.9 Documentation
- Write CLI usage guide with generic examples.
- Document file system structure and JSON formats.
- Provide troubleshooting tips (e.g., name conflicts).

#### 4.10 Compilation for Node.js Compatibility
- Compile the project into a JavaScript bundle (or bundles) compatible with Node.js.
- Utilize `bun build --target=node --format=esm --outdir=dist` to create the output files.
- Ensure the compiled output is suitable for execution via `npx`, `pnpx`, or `bunx`.
- The `package.json` `bin` entry will point to the main compiled entry file within the `dist/` directory.

### 5. Performance and Scalability
- Use Bun's streaming for large files (`Bun.file().stream()`).
- Process items sequentially to manage memory.
- Provide progress feedback for large collections.

### 6. Validation and Quality Assurance
- Ensure all requests retain examples.
- Verify nested folder order matches original JSON.
- Test cross-platform (Windows, macOS, Linux) compatibility.

## Success Criteria
- **Functional Completeness**: Accurate conversion in both directions.
- **User Experience**: Clear CLI feedback and options.
- **Performance**: Efficient handling of nested collections.
- **Reliability**: Robust error handling.
- **Compatibility**: Works with complex, nested Postman collections.

## Implementation Phases
**Phase 1: Core Setup and Parsing**
- Project setup and JSON parsing module.

**Phase 2: File System Operations**
- Directory creation, file writing, and reading.

**Phase 3: Split and Build Logic**
- Implement core utilities for conversion, supporting nested folders.

**Phase 4: CLI and User Experience**
- Build CLI interface and feedback mechanisms.

**Phase 5: Testing and Validation**
- Test with generic nested collections and edge cases.

**Phase 6: Documentation**
- Create user and developer documentation.

The AI agent will execute all phases sequentially, producing a fully functional utility that handles nested folder structures.