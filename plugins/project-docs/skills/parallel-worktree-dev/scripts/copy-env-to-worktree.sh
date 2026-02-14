#!/bin/bash
#
# Copy gitignored .env files from main repo to an existing worktree
#
# Usage:
#   copy-env-to-worktree.sh <worktree-path>
#   copy-env-to-worktree.sh .worktrees/feature/user-auth
#
# Auto-discovers all gitignored .env* files and copies them to the same
# relative paths in the worktree. No hardcoded paths needed — works with
# any project structure.
#
# Use this when:
#   - Creating a new worktree (called automatically by create-worktree.sh)
#   - Main repo's env files have changed and need syncing
#

set -e

# Resolve main repo directory (git root from script location)
MAIN_REPO_DIR="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
WORKTREE_PATH="$1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ -z "$WORKTREE_PATH" ]; then
    echo -e "${RED}Usage: $0 <worktree-path>${NC}"
    echo ""
    echo "Example:"
    echo "  $0 .worktrees/feature/user-auth"
    exit 1
fi

# Make worktree path absolute if it isn't already
if [[ "$WORKTREE_PATH" != /* ]]; then
    WORKTREE_PATH="$MAIN_REPO_DIR/$WORKTREE_PATH"
fi

# Verify the path exists and is a git worktree
if [ ! -d "$WORKTREE_PATH" ]; then
    echo -e "${RED}Error: Path does not exist: $WORKTREE_PATH${NC}"
    exit 1
fi

if [ ! -d "$WORKTREE_PATH/.git" ] && [ ! -f "$WORKTREE_PATH/.git" ]; then
    echo -e "${RED}Error: Path does not appear to be a git worktree: $WORKTREE_PATH${NC}"
    exit 1
fi

# Auto-discover gitignored .env files
cd "$MAIN_REPO_DIR"

ENV_FILES=$(git ls-files --others --ignored --exclude-standard 2>/dev/null | grep -E '(^|/)\.env($|\.)' || true)

if [ -z "$ENV_FILES" ]; then
    echo -e "${YELLOW}No gitignored .env files found to copy${NC}"
    exit 0
fi

COPIED_COUNT=0

while IFS= read -r file; do
    if [ -f "$MAIN_REPO_DIR/$file" ]; then
        dest="$WORKTREE_PATH/$file"
        mkdir -p "$(dirname "$dest")"
        cp "$MAIN_REPO_DIR/$file" "$dest"
        echo -e "${GREEN}  Copied: $file${NC}"
        COPIED_COUNT=$((COPIED_COUNT + 1))
    fi
done <<< "$ENV_FILES"

echo ""
if [ "$COPIED_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}No .env files found to copy${NC}"
else
    echo -e "${GREEN}Copied $COPIED_COUNT environment file(s) to worktree${NC}"
fi
