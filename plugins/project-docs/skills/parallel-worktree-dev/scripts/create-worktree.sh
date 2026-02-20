#!/bin/bash
#
# Create a git worktree with automatic environment file copying
#
# Usage:
#   create-worktree.sh <type> <name>
#   create-worktree.sh feature user-auth
#   create-worktree.sh fix login-redirect
#
# This script:
#   1. Creates a git worktree from develop (or specified base branch)
#   2. Copies all gitignored .env files from the main repo
#   3. Creates a WORKTREE_TASK.md from a template (if provided)
#   4. Provides instructions for next steps
#

set -e

# Configuration
WORKTREE_BASE="${WORKTREE_BASE:-.worktrees}"
BASE_BRANCH="${BASE_BRANCH:-develop}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MAIN_REPO_DIR="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
BRANCH_TYPE="$1"
BRANCH_NAME="$2"

if [ -z "$BRANCH_TYPE" ] || [ -z "$BRANCH_NAME" ]; then
    echo -e "${RED}Usage: $0 <type> <name>${NC}"
    echo ""
    echo "Branch types:"
    echo "  feature  - New features"
    echo "  fix      - Bug fixes"
    echo "  refactor - Code refactoring"
    echo "  chore    - Maintenance tasks"
    echo "  docs     - Documentation changes"
    echo ""
    echo "Examples:"
    echo "  $0 feature user-authentication"
    echo "  $0 fix login-redirect-loop"
    echo "  $0 refactor api-client"
    echo ""
    echo "Environment variables:"
    echo "  WORKTREE_BASE  - Directory for worktrees (default: .worktrees)"
    echo "  BASE_BRANCH    - Branch to create from (default: develop)"
    exit 1
fi

# Validate branch type
case "$BRANCH_TYPE" in
    feature|fix|refactor|chore|docs)
        ;;
    *)
        echo -e "${RED}Error: Invalid branch type '$BRANCH_TYPE'${NC}"
        echo "Valid types: feature, fix, refactor, chore, docs"
        exit 1
        ;;
esac

# Construct paths
FULL_BRANCH="$BRANCH_TYPE/$BRANCH_NAME"
WORKTREE_PATH="$MAIN_REPO_DIR/$WORKTREE_BASE/$BRANCH_TYPE/$BRANCH_NAME"

echo -e "${BLUE}Creating worktree for branch: $FULL_BRANCH${NC}"
echo ""

# Step 1: Fetch latest base branch (without switching branches)
echo -e "${YELLOW}Step 1: Fetching latest $BASE_BRANCH...${NC}"
cd "$MAIN_REPO_DIR"

git fetch origin "$BASE_BRANCH" 2>/dev/null || echo -e "${YELLOW}  Warning: Could not fetch from remote (offline?)${NC}"

echo -e "${GREEN}  Done${NC}"

# Step 2: Create worktree
echo ""
echo -e "${YELLOW}Step 2: Creating worktree...${NC}"

# Create parent directories if needed
mkdir -p "$(dirname "$WORKTREE_PATH")"

# Create the worktree
git worktree add "$WORKTREE_PATH" -b "$FULL_BRANCH" "$BASE_BRANCH"

echo -e "${GREEN}  Worktree created at $WORKTREE_PATH${NC}"

# Step 3: Copy gitignored .env files
echo ""
echo -e "${YELLOW}Step 3: Copying environment files...${NC}"

"$SCRIPT_DIR/copy-env-to-worktree.sh" "$WORKTREE_PATH"

# Step 4: Create WORKTREE_TASK.md from template
echo ""
echo -e "${YELLOW}Step 4: Creating task handoff document...${NC}"

TASK_FILE="$WORKTREE_PATH/WORKTREE_TASK.md"
TEMPLATE_FILE="$SCRIPT_DIR/templates/WORKTREE_TASK.template.md"
TODAY=$(date +%Y-%m-%d)

if [ ! -f "$TEMPLATE_FILE" ]; then
    echo -e "${RED}Error: Template not found at $TEMPLATE_FILE${NC}"
    echo -e "${RED}This indicates an installation problem with the parallel-worktree-dev skill.${NC}"
    exit 1
fi

sed -e "s|{{BRANCH}}|$FULL_BRANCH|g" \
    -e "s|{{BASE_BRANCH}}|$BASE_BRANCH|g" \
    -e "s|{{DATE}}|$TODAY|g" \
    "$TEMPLATE_FILE" > "$TASK_FILE"
echo -e "${GREEN}  Created WORKTREE_TASK.md from template${NC}"

echo -e "${YELLOW}  Edit this file to provide task context for agent handoff${NC}"

# Step 5: Summary and next steps
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Worktree created successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Branch: ${BLUE}$FULL_BRANCH${NC}"
echo -e "Path:   ${BLUE}$WORKTREE_PATH${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "  1. Navigate to the worktree:"
echo -e "     ${BLUE}cd $WORKTREE_PATH${NC}"
echo ""
echo "  2. Edit WORKTREE_TASK.md with task details (for agent handoff)"
echo ""
echo "  3. Install dependencies and start development"
echo ""
echo "  4. When done, clean up the worktree:"
echo -e "     ${BLUE}git worktree remove $WORKTREE_PATH${NC}"
echo ""
