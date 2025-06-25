#!/bin/bash

# Carveman Publishing Script
# Handles version management and publishing with 2FA support

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    log_error "This script must be run from the project root directory"
    exit 1
fi

# Check if npm is logged in
if ! npm whoami > /dev/null 2>&1; then
    log_error "You must be logged in to npm. Run 'npm login' first."
    exit 1
fi

# Function to show current version
show_current_version() {
    local current_version=$(node -p "require('./package.json').version")
    log_info "Current version: $current_version"
}

# Function to run pre-publish checks
run_checks() {
    log_info "Running pre-publish checks..."
    
    # Check if working directory is clean
    if ! git diff-index --quiet HEAD --; then
        log_warning "Working directory is not clean. Consider committing changes first."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Build the project
    log_info "Building project..."
    npm run build
    
    # Run tests
    log_info "Running tests..."
    npm test
    
    # Check package contents
    log_info "Checking package contents..."
    npm run pack:check
    
    log_success "All checks passed!"
}

# Function to publish with version bump
publish_with_version() {
    local version_type=$1
    
    show_current_version
    
    log_info "Bumping $version_type version..."
    npm run "version:$version_type"
    
    local new_version=$(node -p "require('./package.json').version")
    log_success "Version bumped to: $new_version"
    
    log_info "Publishing to npm..."
    log_warning "You will be prompted for your 2FA code during publishing"
    
    npm publish
    
    log_success "Successfully published version $new_version!"
    log_info "Package available at: https://www.npmjs.com/package/carveman"
    
    # Tag the git commit
    git tag "v$new_version"
    log_info "Created git tag: v$new_version"
    log_info "Don't forget to push the tag: git push origin v$new_version"
}

# Function to show help
show_help() {
    echo "Carveman Publishing Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  patch     - Bump patch version (1.0.0 -> 1.0.1) and publish"
    echo "  minor     - Bump minor version (1.0.0 -> 1.1.0) and publish"
    echo "  major     - Bump major version (1.0.0 -> 2.0.0) and publish"
    echo "  dry-run   - Test publishing without actually publishing"
    echo "  beta      - Publish as beta version"
    echo "  check     - Run pre-publish checks only"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 patch    # For bug fixes"
    echo "  $0 minor    # For new features"
    echo "  $0 major    # For breaking changes"
    echo ""
    echo "Note: This script requires npm 2FA. You'll be prompted for your 2FA code."
}

# Main script logic
case "${1:-help}" in
    "patch"|"minor"|"major")
        run_checks
        publish_with_version $1
        ;;
    "dry-run")
        run_checks
        log_info "Running dry-run publish..."
        npm run publish:dry
        log_success "Dry-run completed successfully!"
        ;;
    "beta")
        run_checks
        log_info "Publishing beta version..."
        log_warning "You will be prompted for your 2FA code during publishing"
        npm run publish:beta
        log_success "Beta version published!"
        ;;
    "check")
        run_checks
        ;;
    "help"|*)
        show_help
        ;;
esac 