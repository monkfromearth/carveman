# 🪓 Carveman - Postman Collection Carver

<div align="center">

**Transform your Postman Collections into Git-friendly file structures and back again!**

[![npm version](https://badge.fury.io/js/carveman.svg)](https://www.npmjs.com/package/carveman)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Bun](https://img.shields.io/badge/Built%20with-Bun-ff69b4.svg)](https://bun.sh/)

*Stop wrestling with massive JSON files. Start collaborating on APIs like a pro.*

[🚀 Quick Start](#-quick-start) • [📖 Documentation](#-commands) • [💡 Examples](#-real-world-examples) • [🤝 Contributing](#-contributing)

</div>

---

## 🎯 Why Carveman?

**The Problem:** Postman Collections are stored as monolithic JSON files that are:
- 😤 **Impossible to diff** meaningfully in Git
- 🚫 **Merge conflicts galore** when teams collaborate  
- 🔍 **Hard to review** - who changed what endpoint?
- 📦 **Bloated repositories** with huge JSON blobs

**The Solution:** Carveman carves your collections into organized, readable file structures:

```
Before (1 file):                    After (organized structure):
my-api.postman_collection.json  →   my-api/
                                    ├── index.json          # Collection metadata
                                    ├── auth/
                                    │   ├── index.json      # Folder info
                                    │   ├── login.json      # Individual requests
                                    │   └── refresh.json
                                    ├── users/
                                    │   ├── index.json
                                    │   ├── get_users.json
                                    │   ├── create_user.json
                                    │   └── update_user.json
                                    └── variables.json      # Collection variables
```

## ✨ Features That Make Teams Happy

- **🔄 Perfect Round-Trip**: Split → Edit → Build → Deploy seamlessly
- **👥 Git-Native Collaboration**: Meaningful diffs, easy merges, granular reviews
- **🏗️ Organized Structure**: Logical folder hierarchies with clean naming
- **🛡️ Production Ready**: Built-in validation, error handling, and safety checks
- **⚡ Lightning Fast**: Powered by Bun for optimal performance
- **🔍 Preview Mode**: Dry-run to see changes before applying
- **📝 Verbose Logging**: Know exactly what's happening

## 🚀 Quick Start

### Installation

```bash
# Install globally (recommended)
npm install -g carveman

# Or use with npx (no installation)
npx carveman --help

# Or with bun
bun install -g carveman
```

### 30-Second Demo

```bash
# 1. Split your collection into files
carveman split my-api.postman_collection.json

# 2. Edit individual request files with your favorite editor
code my-api/users/create_user.json

# 3. Rebuild the collection
carveman build my-api --output updated-collection.json

# 4. Import back into Postman and you're done! 🎉
```

## 📋 Commands

### `split` - Carve Collection into Files

Transform a monolithic Postman Collection into an organized file structure.

```bash
carveman split <collection.json> [options]
```

**Options:**
- `--output, -o <directory>` - Where to create the file structure
- `--overwrite` - Replace existing files without asking
- `--dry-run` - Preview what would be created (safe!)
- `--verbose, -v` - Show detailed progress

**Examples:**
```bash
# Basic split
carveman split api.postman_collection.json

# Custom output location with preview
carveman split api.json --output ./src/api --dry-run

# Force overwrite with detailed logging
carveman split api.json --output ./api --overwrite --verbose
```

### `build` - Reconstruct Collection

Rebuild a Postman Collection from your organized file structure.

```bash
carveman build <directory> [options]
```

**Options:**
- `--output, -o <file>` - Output JSON file name
- `--validate` - Validate against Postman schema
- `--verbose, -v` - Show detailed progress

**Examples:**
```bash
# Basic build
carveman build ./my-api

# Custom output with validation
carveman build ./api --output production-api.json --validate

# Verbose build for debugging
carveman build ./api --verbose
```

### `help` & `version`

```bash
carveman help           # Show general help
carveman help split     # Command-specific help
carveman version        # Show version info
```

## 🏗️ File Structure Explained

Carveman creates an intuitive structure that mirrors your collection:

```
my-collection/
├── index.json              # 📋 Collection metadata, variables, auth
├── users/                  # 📁 Folder from your collection
│   ├── index.json          # 📋 Folder metadata and request order
│   ├── get_users.json      # 📄 Individual request
│   ├── create_user.json    # 📄 Individual request
│   └── profile/            # 📁 Nested folder
│       ├── index.json      # 📋 Nested folder metadata
│       └── get_profile.json # 📄 Nested request
└── health_check.json       # 📄 Root-level request
```

### File Types

| File             | Purpose                 | Contains                                                  |
| ---------------- | ----------------------- | --------------------------------------------------------- |
| **`index.json`** | Metadata & Organization | Collection/folder info, variables, auth, request ordering |
| **`*.json`**     | Individual Requests     | Complete request details, headers, body, tests, examples  |

### Naming Magic ✨

Carveman automatically handles naming:
- `User Management` → `user_management/`
- `Get User Profile` → `get_user_profile.json`
- Special characters are safely removed
- Duplicates get numbered suffixes
- Reserved names are avoided

## 💡 Real-World Examples

### 🔄 Team Collaboration Workflow

```bash
# Team lead splits the main collection
carveman split company-api.json --output ./api-structure

# Commit the organized structure
git add api-structure/
git commit -m "Split API collection for better collaboration"
git push origin main

# Developer A works on user endpoints
cd api-structure/users/
# Edit get_users.json, create_user.json, etc.
git add . && git commit -m "Add pagination to user endpoints"

# Developer B works on auth
cd api-structure/auth/
# Edit login.json, refresh.json, etc.
git add . && git commit -m "Update OAuth2 flow"

# Before deployment, rebuild the collection
carveman build ./api-structure --output production-api.json --validate
```

### 🚀 CI/CD Integration

```yaml
# .github/workflows/api-validation.yml
name: API Collection Validation
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      
      - name: Install Carveman
        run: npm install -g carveman
        
      - name: Validate API Structure
        run: carveman build ./api-structure --validate
        
      - name: Generate Collection Artifact
        run: carveman build ./api-structure --output dist/api-collection.json
        
      - name: Upload Collection
        uses: actions/upload-artifact@v3
        with:
          name: api-collection
          path: dist/api-collection.json
```

### 🔍 Code Review Made Easy

**Before Carveman:**
```diff
- Reviewing 5000-line JSON blob
- "What changed in the user endpoints?"
- Merge conflicts everywhere
```

**After Carveman:**
```diff
api-structure/users/create_user.json
+ "header": [
+   {
+     "key": "Content-Type", 
+     "value": "application/json"
+   }
+ ]

api-structure/auth/login.json  
- "url": "{{base_url}}/login"
+ "url": "{{base_url}}/v2/auth/login"
```

### 📦 Environment Management

```bash
# Development environment
carveman split dev-api.json --output ./environments/dev

# Staging environment  
carveman split staging-api.json --output ./environments/staging

# Production environment
carveman split prod-api.json --output ./environments/prod

# Easy comparison and sync between environments
diff -r ./environments/dev ./environments/prod
```

## 🛠️ Advanced Usage

### Working with Large Collections

```bash
# Use verbose mode to track progress
carveman split huge-collection.json --verbose

# Preview structure first
carveman split huge-collection.json --dry-run | grep "📁\|📄"

# Split with custom organization
carveman split api.json --output ./src/api-specs
```

### Automation Scripts

```bash
#!/bin/bash
# auto-sync.sh - Keep collections in sync

echo "🔄 Syncing API collections..."

# Split latest from Postman export
carveman split latest-export.json --output ./api --overwrite

# Commit changes
git add api/
git commit -m "Auto-sync: $(date)"

# Rebuild for deployment
carveman build ./api --output deploy/api-collection.json --validate

echo "✅ Sync complete!"
```

### Custom Workflows

```bash
# Split multiple collections
for collection in *.postman_collection.json; do
  name=$(basename "$collection" .postman_collection.json)
  carveman split "$collection" --output "./collections/$name"
done

# Batch rebuild
find ./collections -type d -name "*.api" -exec carveman build {} \;
```

## 🧪 Testing & Validation

Carveman includes comprehensive validation:

```bash
# Validate collection structure
carveman build ./api --validate --verbose

# Check for common issues
carveman split problematic.json --dry-run --verbose
```

**Common Validations:**
- ✅ Postman Collection v2.1 schema compliance
- ✅ Required fields (`info`, `item`) presence
- ✅ Valid JSON structure
- ✅ Circular reference detection
- ✅ File system safety checks

## 🐛 Troubleshooting

### Common Issues & Solutions

**❌ "Collection must have an 'info' object"**
```bash
# Your JSON might not be a valid Postman Collection
# Check the file format and schema version
carveman split your-file.json --verbose
```

**❌ "Directory already exists"**
```bash
# Use --overwrite or choose different output
carveman split api.json --output ./api-v2
# or
carveman split api.json --overwrite
```

**❌ "Build fails with validation errors"**
```bash
# Use verbose mode to see detailed errors
carveman build ./api --validate --verbose

# Check for missing files or corrupted structure
find ./api -name "*.json" -exec echo "Checking: {}" \; -exec cat {} \; > /dev/null
```

**❌ Import issues in Node.js**
```bash
# Make sure you're using a recent Node.js version (18+)
node --version

# Try with npx instead
npx carveman split your-collection.json
```

### Getting Help

```bash
# Command-specific help
carveman help split
carveman help build

# Verbose output for debugging  
carveman split file.json --verbose
carveman build directory --verbose
```

## 📊 Schema Support

**Full Postman Collection Format v2.1 Support:**

| Feature            | Status       | Notes                                     |
| ------------------ | ------------ | ----------------------------------------- |
| ✅ Requests         | Full Support | All HTTP methods, headers, body types     |
| ✅ Folders          | Full Support | Nested folder structures preserved        |
| ✅ Variables        | Full Support | Collection, environment, global variables |
| ✅ Authentication   | Full Support | Bearer, Basic, API Key, OAuth, etc.       |
| ✅ Scripts          | Full Support | Pre-request and test scripts              |
| ✅ Examples         | Full Support | Request/response examples                 |
| ✅ Headers          | Full Support | Dynamic and static headers                |
| ✅ Request Bodies   | Full Support | JSON, form-data, raw, binary              |
| ✅ Query Parameters | Full Support | Static and dynamic parameters             |

## 🚀 Performance

Carveman is built for speed:

- **⚡ Bun Runtime**: 3x faster than Node.js for file operations
- **🔄 Streaming Processing**: Handles large collections efficiently  
- **💾 Memory Efficient**: Processes files incrementally
- **🎯 Optimized Bundling**: Single executable with minimal dependencies

**Benchmarks:**
- Small collection (10 requests): ~50ms
- Medium collection (100 requests): ~200ms  
- Large collection (1000+ requests): ~2s

## 🛠️ Development

### Prerequisites

- [Bun](https://bun.sh/) v1.0+
- Node.js v18+ (for compatibility testing)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/monkfromearth/carveman.git
cd carveman

# Install dependencies
bun install

# Development mode
bun run dev split example.json

# Build for production
bun run build

# Run tests
bun test

# Run specific tests
bun test --grep "split command"
```

### Project Structure

```
src/
├── cli/                    # 🖥️  CLI argument parsing
├── commands/               # ⚙️  Split and build implementations  
├── fs/                     # 📁 File system operations
├── parser/                 # 🔍 Postman collection parsing
├── types/                  # 📝 TypeScript definitions
├── utils/                  # 🛠️  Utility functions
└── index.ts               # 🚀 Main entry point

tests/
├── unit/                   # 🧪 Unit tests
├── integration/            # 🔗 Integration tests
└── fixtures/              # 📋 Test data
```

### Contributing Workflow

1. **Fork & Clone**: `git clone your-fork-url`
2. **Create Branch**: `git checkout -b feature/amazing-feature`
3. **Make Changes**: Follow the coding standards
4. **Add Tests**: Ensure good coverage
5. **Test**: `bun test` and manual testing
6. **Commit**: `git commit -m 'Add amazing feature'`
7. **Push**: `git push origin feature/amazing-feature`
8. **PR**: Open a Pull Request with good description

## 🤝 Contributing

We love contributions! Here's how you can help:

### 🐛 Found a Bug?
- Check [existing issues](https://github.com/monkfromearth/carveman/issues)
- Create a [new issue](https://github.com/monkfromearth/carveman/issues/new) with:
  - Clear description
  - Steps to reproduce
  - Expected vs actual behavior
  - Your environment details

### 💡 Have an Idea?
- Check [discussions](https://github.com/monkfromearth/carveman/discussions)
- Open a [feature request](https://github.com/monkfromearth/carveman/issues/new)
- Consider implementing it yourself!

### 📖 Improve Documentation?
- Fix typos, add examples, clarify instructions
- Documentation PRs are always welcome

### Code Style

- **TypeScript**: Strict mode enabled
- **Naming**: snake_case for variables, camelCase for functions, PascalCase for classes
- **Testing**: Add tests for new features
- **Comments**: Document complex logic

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- 🔥 **[Bun](https://bun.sh/)** - For the amazing runtime that makes this fast
- 📮 **[Postman](https://www.postman.com/)** - For the excellent API platform and collection format
- 🌟 **Open Source Community** - For inspiration and feedback
- 💼 **API Developers Everywhere** - This tool is for you!

## 📞 Support & Community

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/monkfromearth/carveman/issues)
- 💡 **Feature Requests**: [GitHub Issues](https://github.com/monkfromearth/carveman/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/monkfromearth/carveman/discussions)
- 📖 **Documentation**: [GitHub Wiki](https://github.com/monkfromearth/carveman/wiki)
- 🐦 **Updates**: Follow [@monkfromearth](https://twitter.com/monkfromearth) for updates

---

<div align="center">

**Made with ❤️ for API developers who believe in clean, collaborative workflows**

*Stop fighting with JSON. Start carving with Carveman.* 🪓

[⬆️ Back to Top](#-carveman---postman-collection-carver)

</div>
