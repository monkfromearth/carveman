#!/usr/bin/env node

/**
 * Carveman Publishing Script (Node.js version)
 * Handles version management and publishing with 2FA support
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Colors for output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

// Helper functions
const log = {
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`)
};

// Utility functions
function runCommand(command, options = {}) {
    try {
        return execSync(command, {
            cwd: projectRoot,
            stdio: options.silent ? 'pipe' : 'inherit',
            encoding: 'utf8'
        });
    } catch (error) {
        if (!options.allowFailure) {
            log.error(`Command failed: ${command}`);
            process.exit(1);
        }
        return null;
    }
}

function getCurrentVersion() {
    const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
    return packageJson.version;
}

function checkNpmLogin() {
    const result = runCommand('npm whoami', { silent: true, allowFailure: true });
    if (!result) {
        log.error('You must be logged in to npm. Run "npm login" first.');
        process.exit(1);
    }
    return result.trim();
}

function checkWorkingDirectory() {
    const result = runCommand('git diff-index --quiet HEAD --', { silent: true, allowFailure: true });
    return result !== null;
}

function showCurrentVersion() {
    const version = getCurrentVersion();
    log.info(`Current version: ${version}`);
    return version;
}

function runPrePublishChecks() {
    log.info('Running pre-publish checks...');

    // Check if working directory is clean
    if (!checkWorkingDirectory()) {
        log.warning('Working directory is not clean. Consider committing changes first.');
        // In a real interactive environment, you'd prompt the user here
        // For now, we'll continue with a warning
    }

    // Build the project
    log.info('Building project...');
    runCommand('npm run build');

    // Run tests
    log.info('Running tests...');
    runCommand('npm test');

    // Check package contents
    log.info('Checking package contents...');
    runCommand('npm run pack:check');

    log.success('All checks passed!');
}

function publishWithVersion(versionType) {
    const currentVersion = showCurrentVersion();

    log.info(`Bumping ${versionType} version...`);
    runCommand(`npm version ${versionType}`);

    const newVersion = getCurrentVersion();
    log.success(`Version bumped to: ${newVersion}`);

    log.info('Publishing to npm...');
    log.warning('You will be prompted for your 2FA code during publishing');

    runCommand('npm publish');

    log.success(`Successfully published version ${newVersion}!`);
    log.info('Package available at: https://www.npmjs.com/package/carveman');

    // Tag the git commit
    runCommand(`git tag v${newVersion}`);
    log.info(`Created git tag: v${newVersion}`);
    log.info(`Don't forget to push the tag: git push origin v${newVersion}`);
}

function showHelp() {
    console.log('Carveman Publishing Script (Node.js)');
    console.log('');
    console.log('Usage: node scripts/publish.js [command]');
    console.log('');
    console.log('Commands:');
    console.log('  patch     - Bump patch version (1.0.0 -> 1.0.1) and publish');
    console.log('  minor     - Bump minor version (1.0.0 -> 1.1.0) and publish');
    console.log('  major     - Bump major version (1.0.0 -> 2.0.0) and publish');
    console.log('  dry-run   - Test publishing without actually publishing');
    console.log('  beta      - Publish as beta version');
    console.log('  check     - Run pre-publish checks only');
    console.log('  help      - Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/publish.js patch    # For bug fixes');
    console.log('  node scripts/publish.js minor    # For new features');
    console.log('  node scripts/publish.js major    # For breaking changes');
    console.log('');
    console.log('Note: This script requires npm 2FA. You\'ll be prompted for your 2FA code.');
}

// Main script logic
function main() {
    const command = process.argv[2] || 'help';

    // Check npm login first (except for help)
    if (command !== 'help') {
        const username = checkNpmLogin();
        log.info(`Logged in as: ${username}`);
    }

    switch (command) {
        case 'patch':
        case 'minor':
        case 'major':
            runPrePublishChecks();
            publishWithVersion(command);
            break;

        case 'dry-run':
            runPrePublishChecks();
            log.info('Running dry-run publish...');
            runCommand('npm run publish:dry');
            log.success('Dry-run completed successfully!');
            break;

        case 'beta':
            runPrePublishChecks();
            log.info('Publishing beta version...');
            log.warning('You will be prompted for your 2FA code during publishing');
            runCommand('npm run publish:beta');
            log.success('Beta version published!');
            break;

        case 'check':
            runPrePublishChecks();
            break;

        case 'help':
        default:
            showHelp();
            break;
    }
}

// Run the script
main(); 