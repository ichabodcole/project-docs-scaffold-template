#!/bin/bash
#
# Migration script: v2.5 → v2.6
#
# Renames all archive/ directories to _archive/ for consistent sort-to-top
# behavior, and updates all path references in documentation.
#
# This script handles the ENTIRE migration — no agent steps remain after
# running it.
#
# Usage:
#   migrate-v2.5-to-v2.6.sh [--dry-run]
#
# Flags:
#   --dry-run   Print all operations without executing. Safe to run repeatedly.
#
# Run from your project root:
#   bash path/to/migrate-v2.5-to-v2.6.sh --dry-run
#   bash path/to/migrate-v2.5-to-v2.6.sh
#

set -e

# ─── Configuration ────────────────────────────────────────────────────────────

DRY_RUN=false
for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]] && DRY_RUN=true
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

# Rename a single archive dir using git mv if available, otherwise plain mv
rename_archive() {
  local old="$1"
  local new="$2"
  if [ ! -d "$old" ]; then
    warn "Skipping $old (does not exist)"
    return
  fi
  if $DRY_RUN; then
    echo -e "  ${BLUE}[DRY RUN]${NC} rename $old → $new"
    return
  fi
  if git rev-parse --git-dir > /dev/null 2>&1; then
    git mv "$old" "$new" 2>/dev/null || mv "$old" "$new"
  else
    mv "$old" "$new"
  fi
  ok "Renamed $old → $new"
}

# Run sed in-place (macOS/BSD and GNU compatible)
sed_inplace() {
  local pattern="$1"
  local file="$2"
  if $DRY_RUN; then
    local count
    count=$(grep -c "$pattern" "$file" 2>/dev/null || true)
    # show what the substitution would change
    local display="${pattern}"
    echo -e "  ${BLUE}[DRY RUN]${NC} sed '${display}' → ${file} (approx ${count} line(s) affected)"
    return
  fi
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "$pattern" "$file"
  else
    sed -i "$pattern" "$file"
  fi
}

# ─── Main ─────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Migration: v2.5 → v2.6                  ║${NC}"
echo -e "${GREEN}║  Rename archive/ → _archive/              ║${NC}"
if $DRY_RUN; then
  echo -e "${GREEN}║  ${YELLOW}DRY RUN — no changes will be made${GREEN}       ║${NC}"
fi
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"

# ─── Step 1: Rename archive directories ───────────────────────────────────────

step "Step 1: Renaming archive/ directories to _archive/"

while IFS= read -r -d '' old; do
  new="${old/\/archive/\/_archive}"
  rename_archive "$old" "$new"
done < <(find docs -maxdepth 2 -type d -name "archive" -print0 2>/dev/null)

# ─── Step 2: Update path references in documentation ─────────────────────────

step "Step 2: Updating /archive/ path references in docs/**/*.md"

# Find markdown files that contain /archive/ path references
# The leading slash prevents matching verb uses like "archive it", "archive when"
if [ -d "docs" ]; then
  while IFS= read -r -d '' file; do
    if grep -q '/archive/' "$file" 2>/dev/null; then
      sed_inplace 's|/archive/|/_archive/|g' "$file"
      if ! $DRY_RUN; then
        ok "Updated path refs in $file"
      fi
    fi
  done < <(find docs -name "*.md" -print0 2>/dev/null)
else
  warn "No docs/ directory found — skipping path reference updates"
fi

# ─── Step 3: Update AGENTS.md / CLAUDE.md ─────────────────────────────────────

step "Step 3: Checking root agent context files for /archive/ references"

for ctx_file in AGENTS.md CLAUDE.md docs/AGENTS.md docs/CLAUDE.md; do
  if [ -f "$ctx_file" ] && grep -q '/archive/' "$ctx_file" 2>/dev/null; then
    sed_inplace 's|/archive/|/_archive/|g' "$ctx_file"
    if ! $DRY_RUN; then
      ok "Updated path refs in $ctx_file"
    fi
  fi
done

# ─── Step 4: Bump docs_version ────────────────────────────────────────────────

step "Step 4: Updating docs_version in docs/README.md"

if [ -f "docs/README.md" ]; then
  if grep -q 'docs_version' "docs/README.md"; then
    if $DRY_RUN; then
      local_ver=$(grep 'docs_version' "docs/README.md" | head -1)
      echo -e "  ${BLUE}[DRY RUN]${NC} update docs_version: current='${local_ver}' → new='docs_version: \"2.6.0\"'"
    else
      if [[ "$(uname)" == "Darwin" ]]; then
        sed -i '' 's/docs_version: "[^"]*"/docs_version: "2.6.0"/' "docs/README.md"
      else
        sed -i 's/docs_version: "[^"]*"/docs_version: "2.6.0"/' "docs/README.md"
      fi
      ok "Updated docs_version to 2.6.0"
    fi
  else
    warn "No docs_version found in docs/README.md — add it manually"
  fi
else
  warn "docs/README.md not found — skipping version bump"
fi

# ─── Verification ─────────────────────────────────────────────────────────────

step "Verification"

if ! $DRY_RUN; then
  # Check that _archive dirs exist (for any that were renamed)
  echo "  Archive directories:"
  for old in "${ARCHIVE_DIRS[@]}"; do
    new="${old/archive/_archive}"
    if [ -d "$new" ]; then
      ok "$new exists"
    elif [ ! -d "$old" ]; then
      warn "$new — original $old did not exist, skipped"
    else
      echo -e "  ${RED}✗${NC} $new — rename may have failed"
    fi
  done

  echo ""
  echo "  Stale /archive/ path references:"
  stale=$(grep -rn '/archive/' docs/ --include="*.md" 2>/dev/null \
    | grep -v '_archive/' \
    | grep -v 'archive it\|archive when\|archive freely\|archive the\|Archive when\|Status.*Archived' \
    || true)
  if [ -z "$stale" ]; then
    ok "No stale /archive/ path references found"
  else
    echo -e "  ${RED}✗ Stale references remain:${NC}"
    echo "$stale" | sed 's/^/    /'
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
  echo -e "${GREEN}Migration v2.5 → v2.6 complete!${NC}"
  echo ""
  echo "Next: commit the changes"
  echo -e "  ${BLUE}git add -A && git commit -m 'docs: migrate archive/ → _archive/ (v2.6)'${NC}"
fi
echo -e "${GREEN}══════════════════════════════════════════${NC}"
