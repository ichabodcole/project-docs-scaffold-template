#!/bin/bash
#
# Migration script: v2.4 → v2.5
#
# Handles mechanical steps:
#   - Create docs/briefs/ directory structure
#   - Copy briefs/README.md and briefs/TEMPLATES/BRIEF.template.md from scaffold
#   - Update documentation cycle string in docs/README.md
#   - Bump docs_version to 2.5.0
#   - Clean up scaffold
#
# Agent still handles:
#   - Running cookiecutter to generate the scaffold
#   - Adding the Ideation/briefs structural section to docs/README.md
#   - Adding the decision flowchart branch (new "rough idea?" diamond)
#   - Adding Quick Reference and Special cases entries
#
# Usage:
#   migrate-v2.4-to-v2.5.sh [--dry-run] [--scaffold-dir PATH]
#
# Flags:
#   --dry-run             Print all operations without executing. Safe to run repeatedly.
#   --scaffold-dir PATH   Use existing scaffold at PATH instead of auto-detecting.
#                         Also reads from SCAFFOLD_DIR env var.
#
# Run from your project root:
#   bash path/to/migrate-v2.4-to-v2.5.sh --dry-run
#   bash path/to/migrate-v2.4-to-v2.5.sh

set -e

# ─── Configuration ────────────────────────────────────────────────────────────

DRY_RUN=false
SCAFFOLD_DIR="${SCAFFOLD_DIR:-}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --scaffold-dir) SCAFFOLD_DIR="$2"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

# ─── Colors ───────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ─── Helpers ──────────────────────────────────────────────────────────────────

run() {
  if $DRY_RUN; then
    echo -e "  ${BLUE}[DRY RUN]${NC} $*"
  else
    "$@"
  fi
}

step() {
  echo ""
  echo -e "${YELLOW}$*${NC}"
}

ok() {
  echo -e "  ${GREEN}✓${NC} $*"
}

warn() {
  echo -e "  ${YELLOW}⚠${NC} $*"
}

# Run sed in-place (macOS/BSD and GNU compatible)
# Extracts the search term from s|search|replace|flags for accurate dry-run counts.
sed_inplace() {
  local pattern="$1"
  local file="$2"
  if $DRY_RUN; then
    local delim="${pattern:1:1}"
    local search="${pattern#s$delim}"
    search="${search%%$delim*}"
    local count
    count=$(grep -Fc "$search" "$file" 2>/dev/null || true)
    echo -e "  ${BLUE}[DRY RUN]${NC} sed '${pattern}' → ${file} (${count} line(s) affected)"
    return
  fi
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "$pattern" "$file"
  else
    sed -i "$pattern" "$file"
  fi
}

# ─── Locate scaffold ──────────────────────────────────────────────────────────

locate_scaffold() {
  if [ -n "$SCAFFOLD_DIR" ]; then
    if [ ! -d "$SCAFFOLD_DIR" ]; then
      echo -e "${RED}Error: --scaffold-dir '$SCAFFOLD_DIR' does not exist.${NC}" >&2
      exit 1
    fi
    echo "$SCAFFOLD_DIR"
    return
  fi
  # Auto-detect .scaffold-tmp/*/docs
  local candidate
  candidate=$(find .scaffold-tmp -maxdepth 2 -name "docs" -type d 2>/dev/null | head -1)
  if [ -n "$candidate" ]; then
    echo "$candidate"
    return
  fi
  echo -e "${RED}Error: No scaffold found. Run cookiecutter first or pass --scaffold-dir PATH.${NC}" >&2
  echo -e "  ${BLUE}cookiecutter gh:ichabodcole/project-docs-scaffold-template -o .scaffold-tmp${NC}" >&2
  exit 1
}

# ─── Main ─────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Migration: v2.4 → v2.5                  ║${NC}"
echo -e "${GREEN}║  Add briefs document type                 ║${NC}"
if $DRY_RUN; then
  echo -e "${GREEN}║  ${YELLOW}DRY RUN — no changes will be made${GREEN}       ║${NC}"
fi
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"

# ─── Locate scaffold ──────────────────────────────────────────────────────────

step "Locating scaffold..."
SCAFFOLD=$(locate_scaffold)
ok "Using scaffold: $SCAFFOLD"

# ─── Step 1: Create briefs directory structure ────────────────────────────────

step "Step 1: Creating docs/briefs/ directory structure"

if $DRY_RUN; then
  echo -e "  ${BLUE}[DRY RUN]${NC} mkdir -p docs/briefs/TEMPLATES docs/briefs/_archive"
  echo -e "  ${BLUE}[DRY RUN]${NC} touch docs/briefs/_archive/.gitkeep"
else
  mkdir -p docs/briefs/TEMPLATES docs/briefs/_archive
  touch docs/briefs/_archive/.gitkeep
  ok "Created docs/briefs/ directory structure"
fi

# ─── Step 2: Copy files from scaffold ─────────────────────────────────────────

step "Step 2: Copying files from scaffold"

FILES_TO_COPY=(
  "briefs/README.md|docs/briefs/README.md"
  "briefs/TEMPLATES/BRIEF.template.md|docs/briefs/TEMPLATES/BRIEF.template.md"
)

for pair in "${FILES_TO_COPY[@]}"; do
  src="${SCAFFOLD}/${pair%%|*}"
  dst="${pair##*|}"
  if [ ! -f "$src" ]; then
    warn "Source not found: $src — skipping"
    continue
  fi
  if $DRY_RUN; then
    echo -e "  ${BLUE}[DRY RUN]${NC} cp $src → $dst"
  else
    cp "$src" "$dst"
    ok "Copied $dst"
  fi
done

# ─── Step 3: Update documentation cycle string ────────────────────────────────

step "Step 3: Updating documentation cycle string in docs/README.md"

if [ -f "docs/README.md" ]; then
  if grep -q 'Report → Investigation' "docs/README.md"; then
    sed_inplace 's|Report → Investigation|Brief → Investigation|g' "docs/README.md"
    if ! $DRY_RUN; then
      ok "Updated documentation cycle string"
    fi
  else
    warn "Cycle string 'Report → Investigation' not found in docs/README.md — may already be updated or customized"
  fi
else
  warn "docs/README.md not found — skipping cycle string update"
fi

# ─── Step 4: Bump docs_version ────────────────────────────────────────────────

step "Step 4: Updating docs_version in docs/README.md"

if [ -f "docs/README.md" ]; then
  if grep -q 'docs_version' "docs/README.md"; then
    if $DRY_RUN; then
      current_ver=$(grep 'docs_version' "docs/README.md" | head -1)
      echo -e "  ${BLUE}[DRY RUN]${NC} update docs_version: current='${current_ver}' → new='docs_version: \"2.5.0\"'"
    else
      if [[ "$(uname)" == "Darwin" ]]; then
        sed -i '' 's/docs_version: "[^"]*"/docs_version: "2.5.0"/' "docs/README.md"
      else
        sed -i 's/docs_version: "[^"]*"/docs_version: "2.5.0"/' "docs/README.md"
      fi
      ok "Updated docs_version to 2.5.0"
    fi
  else
    warn "No docs_version found in docs/README.md — add it manually"
  fi
else
  warn "docs/README.md not found — skipping version bump"
fi

# ─── Step 5: Clean up scaffold ────────────────────────────────────────────────

step "Step 5: Cleaning up scaffold"

if [ -d ".scaffold-tmp" ]; then
  run rm -rf .scaffold-tmp
  if ! $DRY_RUN; then
    ok "Removed .scaffold-tmp/"
  fi
else
  warn ".scaffold-tmp/ not found — skipping cleanup"
fi

# ─── Verification ─────────────────────────────────────────────────────────────

step "Verification"

if ! $DRY_RUN; then
  echo "  Briefs directory:"
  for f in docs/briefs/README.md docs/briefs/TEMPLATES/BRIEF.template.md docs/briefs/_archive/.gitkeep; do
    if [ -f "$f" ]; then
      ok "$f exists"
    else
      echo -e "  ${RED}✗${NC} $f — not found"
    fi
  done

  echo ""
  echo "  docs/README.md cycle string:"
  if grep -q 'Brief → Investigation' "docs/README.md" 2>/dev/null; then
    ok "Cycle string starts with 'Brief →'"
  else
    echo -e "  ${RED}✗${NC} Cycle string not updated — check docs/README.md manually"
  fi

  echo ""
  echo "  docs_version:"
  if [ -f "docs/README.md" ]; then
    current_ver=$(grep 'docs_version' "docs/README.md" | head -1 || echo "  (not found)")
    echo "    $current_ver"
  fi
fi

# ─── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}══════════════════════════════════════════${NC}"
if $DRY_RUN; then
  echo -e "${GREEN}Dry run complete. No changes were made.${NC}"
  echo -e "Run without ${BLUE}--dry-run${NC} to apply."
else
  echo -e "${GREEN}Migration v2.4 → v2.5 script complete!${NC}"
  echo ""
  echo -e "${YELLOW}Remaining agent steps:${NC}"
  echo "  • Add Ideation/briefs structural section to docs/README.md"
  echo "  • Add 'rough idea?' decision diamond to the flowchart"
  echo "  • Add Quick Reference entry for Brief"
  echo "  • Add Special cases entry for Brief"
  echo ""
  echo "Next: complete agent steps, then commit"
  echo -e "  ${BLUE}git add -A && git commit -m 'docs: add briefs document type (v2.5)'${NC}"
fi
echo -e "${GREEN}══════════════════════════════════════════${NC}"
