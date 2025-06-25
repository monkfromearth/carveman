#!/bin/bash

# Carveman Quick Publishing Script
# Usage: ./publish.sh [patch|minor|major|dry-run]

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🪓 Carveman Publishing Script${NC}"
echo ""

# Check if logged in to npm
if ! npm whoami > /dev/null 2>&1; then
    echo -e "${RED}❌ You must be logged in to npm first${NC}"
    echo -e "${YELLOW}Run: npm login${NC}"
    exit 1
fi

USERNAME=$(npm whoami)
echo -e "${GREEN}✅ Logged in as: $USERNAME${NC}"

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}📦 Current version: $CURRENT_VERSION${NC}"

# Default to patch if no argument provided
VERSION_TYPE=${1:-patch}

case $VERSION_TYPE in
    "patch"|"minor"|"major")
        echo -e "${YELLOW}⚠️  This will bump the $VERSION_TYPE version and publish to npm${NC}"
        echo -e "${YELLOW}⚠️  You will be prompted for your 2FA code${NC}"
        echo ""
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Publishing cancelled${NC}"
            exit 0
        fi
        
        echo -e "${BLUE}🔨 Building project...${NC}"
        npm run build
        
        echo -e "${BLUE}📈 Bumping $VERSION_TYPE version...${NC}"
        npm version $VERSION_TYPE
        
        NEW_VERSION=$(node -p "require('./package.json').version")
        echo -e "${GREEN}✅ Version bumped to: $NEW_VERSION${NC}"
        
        echo -e "${BLUE}🚀 Publishing to npm...${NC}"
        npm publish
        
        echo ""
        echo -e "${GREEN}🎉 Successfully published carveman@$NEW_VERSION!${NC}"
        echo -e "${BLUE}📦 Package: https://www.npmjs.com/package/carveman${NC}"
        echo -e "${YELLOW}📝 Don't forget to push the git tag: git push origin v$NEW_VERSION${NC}"
        ;;
    "dry-run")
        echo -e "${BLUE}🔍 Running dry-run publish (no actual publishing)${NC}"
        npm run build
        npm run publish:dry
        echo -e "${GREEN}✅ Dry-run completed successfully!${NC}"
        ;;
    *)
        echo "Usage: $0 [patch|minor|major|dry-run]"
        echo ""
        echo "Commands:"
        echo "  patch    - Bug fixes (1.0.0 -> 1.0.1)"
        echo "  minor    - New features (1.0.0 -> 1.1.0)"
        echo "  major    - Breaking changes (1.0.0 -> 2.0.0)"
        echo "  dry-run  - Test publishing without actually publishing"
        echo ""
        echo "Examples:"
        echo "  $0 patch     # Most common - for bug fixes"
        echo "  $0 minor     # For new features"
        echo "  $0 dry-run   # Test before publishing"
        exit 1
        ;;
esac 