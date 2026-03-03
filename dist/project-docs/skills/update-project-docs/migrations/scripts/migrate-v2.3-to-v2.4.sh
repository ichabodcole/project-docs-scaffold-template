#!/bin/bash
#
# Migration script: v2.3 → v2.4
#
# Handles mechanical steps:
#   - Copy projects/TEMPLATES/TEST-PLAN.template.md from scaffold
#   - Optionally replace DESIGN-RESOLUTION.template.md (--replace-design-resolution-template)
#   - Optionally replace docs/projects/README.md (--replace-projects-readme)
#   - Update documentation cycle string in docs/README.md
#   - Bump docs_version to 2.4.0
#   - Clean up scaffold
#
# Agent still handles:
#   - Running cookiecutter to generate the scaffold
#   - Adding the test-plan decision diamond to the flowchart in docs/README.md
#   - Updating Quick Reference and Special cases entries
#   - Merging docs/projects/README.md (if not using --replace-projects-readme)
#   - Merging DESIGN-RESOLUTION.template.md (if not using --replace-design-resolution-template)
#
# Usage:
#   migrate-v2.3-to-v2.4.sh [--dry-run] [--scaffold-dir PATH]
#                            [--replace-design-resolution-template]
#                            [--replace-projects-readme]
#
# Flags:
#   --dry-run                              Print all operations without executing.
#   --scaffold-dir PATH                    Use existing scaffold at PATH.
#                                          Also reads from SCAFFOLD_DIR env var.
#   --replace-design-resolution-template   Replace DESIGN-RESOLUTION.template.md
#                                          from scaffold (use if not customized).
#   --replace-projects-readme              Replace docs/projects/README.md from
#                                          scaffold (use if not customized).
#
# Run from your project root:
#   bash path/to/migrate-v2.3-to-v2.4.sh --dry-run
#   bash path/to/migrate-v2.3-to-v2.4.sh

set -e

# ─── Configuration ────────────────────────────────────────────────────────────

DRY_RUN=false
SCAFFOLD_DIR="${SCAFFOLD_DIR:-}"
REPLACE_DR_TEMPLATE=false
REPLACE_PROJECTS_README=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --scaffold-dir) SCAFFOLD_DIR="$2"; shift 2 ;;
    --replace-design-resolution-template) REPLACE_DR_TEMPLATE=true; shift ;;
    --replace-projects-readme) REPLACE_PROJECTS_README=true; shift ;;
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

# Copy a file from scaffold, with dry-run support
copy_from_scaffold() {
  local src="$1"
  local dst="$2"
  if [ ! -f "$src" ]; then
    warn "Source not found: $src — skipping"
    return
  fi
  if $DRY_RUN; then
    echo -e "  ${BLUE}[DRY RUN]${NC} cp $src → $dst"
  else
    cp "$src" "$dst"
    ok "Copied $dst"
  fi
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
echo -e "${GREEN}║  Migration: v2.3 → v2.4                  ║${NC}"
echo -e "${GREEN}║  Add test plan document type              ║${NC}"
if $DRY_RUN; then
  echo -e "${GREEN}║  ${YELLOW}DRY RUN — no changes will be made${GREEN}       ║${NC}"
fi
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"

# ─── Locate scaffold ──────────────────────────────────────────────────────────

step "Locating scaffold..."
SCAFFOLD=$(locate_scaffold)
ok "Using scaffold: $SCAFFOLD"

# ─── Step 1: Copy TEST-PLAN template ──────────────────────────────────────────

step "Step 1: Copying TEST-PLAN.template.md from scaffold"

copy_from_scaffold \
  "$SCAFFOLD/projects/TEMPLATES/TEST-PLAN.template.md" \
  "docs/projects/TEMPLATES/TEST-PLAN.template.md"

# ─── Step 2: Replace DESIGN-RESOLUTION template (optional) ───────────────────

step "Step 2: Design Resolution template"

if $REPLACE_DR_TEMPLATE; then
  copy_from_scaffold \
    "$SCAFFOLD/projects/TEMPLATES/DESIGN-RESOLUTION.template.md" \
    "docs/projects/TEMPLATES/DESIGN-RESOLUTION.template.md"
else
  warn "Skipping DESIGN-RESOLUTION.template.md replacement"
  warn "The template needs an 'External Dependencies' subsection added under Architectural Positioning."
  warn "Pass --replace-design-resolution-template to replace it automatically (if not customized),"
  warn "or merge the new subsection manually after the script runs."
fi

# ─── Step 3: Replace projects/README.md (optional) ───────────────────────────

step "Step 3: docs/projects/README.md"

if $REPLACE_PROJECTS_README; then
  copy_from_scaffold \
    "$SCAFFOLD/projects/README.md" \
    "docs/projects/README.md"
else
  warn "Skipping docs/projects/README.md replacement"
  warn "Key additions needed: test-plan.md entry in folder structure, 'What Goes Where',"
  warn "'Test Plans' subsection, and TEST-PLAN.template.md in Templates list."
  warn "Pass --replace-projects-readme to replace automatically (if not customized),"
  warn "or merge the new sections manually."
fi

# ─── Step 4: Update documentation cycle string ────────────────────────────────

step "Step 4: Updating documentation cycle string in docs/README.md"

if [ -f "docs/README.md" ]; then
  if grep -q '→ plan → sessions' "docs/README.md"; then
    sed_inplace 's|→ plan → sessions|→ plan → [test-plan] → sessions|g' "docs/README.md"
    if ! $DRY_RUN; then
      ok "Updated documentation cycle string"
    fi
  else
    warn "Cycle string '→ plan → sessions' not found in docs/README.md — may already be updated or customized"
  fi
else
  warn "docs/README.md not found — skipping cycle string update"
fi

# ─── Step 5: Bump docs_version ────────────────────────────────────────────────

step "Step 5: Updating docs_version in docs/README.md"

if [ -f "docs/README.md" ]; then
  if grep -q 'docs_version' "docs/README.md"; then
    if $DRY_RUN; then
      current_ver=$(grep 'docs_version' "docs/README.md" | head -1)
      echo -e "  ${BLUE}[DRY RUN]${NC} update docs_version: current='${current_ver}' → new='docs_version: \"2.4.0\"'"
    else
      if [[ "$(uname)" == "Darwin" ]]; then
        sed -i '' 's/docs_version: "[^"]*"/docs_version: "2.4.0"/' "docs/README.md"
      else
        sed -i 's/docs_version: "[^"]*"/docs_version: "2.4.0"/' "docs/README.md"
      fi
      ok "Updated docs_version to 2.4.0"
    fi
  else
    warn "No docs_version found in docs/README.md — add it manually"
  fi
else
  warn "docs/README.md not found — skipping version bump"
fi

# ─── Step 6: Clean up scaffold ────────────────────────────────────────────────

step "Step 6: Cleaning up scaffold"

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
  echo "  New template:"
  if [ -f "docs/projects/TEMPLATES/TEST-PLAN.template.md" ]; then
    ok "docs/projects/TEMPLATES/TEST-PLAN.template.md exists"
  else
    echo -e "  ${RED}✗${NC} TEST-PLAN.template.md — not found"
  fi

  echo ""
  echo "  docs/README.md cycle string:"
  if grep -q 'test-plan' "docs/README.md" 2>/dev/null; then
    ok "Cycle string contains '[test-plan]'"
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
  echo -e "${GREEN}Migration v2.3 → v2.4 script complete!${NC}"
  echo ""
  echo -e "${YELLOW}Remaining agent steps:${NC}"
  echo "  • Add test-plan decision diamond to flowchart in docs/README.md"
  echo "  • Update Quick Reference project entry to mention test plan"
  echo "  • Add Special cases entry for test plan"
  if ! $REPLACE_PROJECTS_README; then
    echo "  • Merge new test plan sections into docs/projects/README.md"
  fi
  if ! $REPLACE_DR_TEMPLATE; then
    echo "  • Add 'External Dependencies' subsection to DESIGN-RESOLUTION.template.md"
  fi
  echo ""
  echo "Next: complete agent steps, then commit"
  echo -e "  ${BLUE}git add -A && git commit -m 'docs: add test plan document type (v2.4)'${NC}"
fi
echo -e "${GREEN}══════════════════════════════════════════${NC}"
