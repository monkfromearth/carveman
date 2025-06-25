# Publishing Guide for Carveman

This guide explains how to publish new versions of the Carveman package to npm.

## Prerequisites

1. **NPM Account with 2FA**: You must have an npm account with 2FA enabled
2. **Login to NPM**: Run `npm login` and authenticate with your 2FA code
3. **Git Repository**: Ensure you're in a clean git state (all changes committed)

## Quick Publishing

### Using NPM Scripts (Recommended)

```bash
# For bug fixes (1.0.0 -> 1.0.1)
npm run publish:patch

# For new features (1.0.0 -> 1.1.0)  
npm run publish:minor

# For breaking changes (1.0.0 -> 2.0.0)
npm run publish:major

# Test publishing without actually publishing
npm run publish:dry

# Publish beta version
npm run publish:beta
```

### Using Publishing Scripts

We provide two publishing scripts for more control:

#### Bash Script (Unix/Linux/macOS)
```bash
# Make sure script is executable
chmod +x scripts/publish.sh

# Publish patch version
./scripts/publish.sh patch

# Publish minor version
./scripts/publish.sh minor

# Publish major version
./scripts/publish.sh major

# Run checks only
./scripts/publish.sh check

# Dry run
./scripts/publish.sh dry-run
```

#### Node.js Script (Cross-platform)
```bash
# Publish patch version
node scripts/publish.js patch

# Publish minor version
node scripts/publish.js minor

# Publish major version
node scripts/publish.js major

# Run checks only
node scripts/publish.js check

# Dry run
node scripts/publish.js dry-run
```

## What Gets Published

The package is configured to include only essential files:

### ✅ Included Files
- `dist/` - Built JavaScript files
- `package.json` - Package configuration
- `README.md` - Documentation
- `LICENSE` - MIT license file

### ❌ Excluded Files
- `src/` - TypeScript source files
- `tests/` - Test files
- `docs/` - Development documentation
- `scripts/` - Build and publishing scripts
- `node_modules/` - Dependencies
- Configuration files (tsconfig.json, biome.json, etc.)

## Publishing Process

The publishing process automatically:

1. **Pre-publish Checks**:
   - Verifies npm login status
   - Checks if working directory is clean
   - Builds the project (`npm run build`)
   - Runs tests (`npm test`)
   - Validates package contents

2. **Version Management**:
   - Bumps version in package.json
   - Creates git commit with version bump
   - Creates git tag (e.g., `v1.0.1`)

3. **Publishing**:
   - Publishes to npm registry
   - Prompts for 2FA code
   - Provides success confirmation

4. **Post-publish**:
   - Shows package URL
   - Reminds to push git tags

## Manual Publishing Steps

If you prefer manual control:

```bash
# 1. Ensure you're logged in
npm whoami

# 2. Run tests and build
npm test
npm run build

# 3. Check what will be published
npm pack --dry-run

# 4. Bump version (choose one)
npm version patch   # Bug fixes
npm version minor   # New features  
npm version major   # Breaking changes

# 5. Publish (you'll be prompted for 2FA)
npm publish

# 6. Push git tags
git push origin --tags
```

## Troubleshooting

### 2FA Issues
- Make sure you have 2FA enabled on your npm account
- Use an authenticator app (Google Authenticator, Authy, etc.)
- The 2FA prompt will appear during `npm publish`

### Permission Errors
```bash
# If you get permission errors, make sure you're logged in
npm login

# Check your login status
npm whoami
```

### Package Already Exists
```bash
# If version already exists, bump the version first
npm version patch
npm publish
```

### Build Errors
```bash
# If build fails, check for TypeScript errors
npm run build

# Run tests to ensure everything works
npm test
```

## Version Guidelines

Follow semantic versioning (semver):

- **Patch** (1.0.0 → 1.0.1): Bug fixes, no new features
- **Minor** (1.0.0 → 1.1.0): New features, backward compatible
- **Major** (1.0.0 → 2.0.0): Breaking changes, not backward compatible

## Post-Publishing Checklist

After publishing:

1. ✅ Verify package on npm: https://www.npmjs.com/package/carveman
2. ✅ Test installation: `npx carveman --version`
3. ✅ Push git tags: `git push origin --tags`
4. ✅ Update GitHub releases (optional)
5. ✅ Announce on social media/community (optional)

## Emergency Unpublishing

If you need to unpublish (use carefully):

```bash
# Unpublish specific version (only works within 72 hours)
npm unpublish carveman@1.0.1

# Unpublish entire package (use with extreme caution)
npm unpublish carveman --force
```

**Note**: Unpublishing can break dependent projects. Only use in emergencies.

## Support

If you encounter issues:

1. Check npm status: https://status.npmjs.org/
2. Verify your npm account and 2FA settings
3. Ensure you have maintainer permissions for the package
4. Contact npm support if needed 