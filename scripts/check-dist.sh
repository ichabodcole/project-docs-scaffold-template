#!/usr/bin/env bash
#
# `dist/` is a BUILD PRODUCT that is committed. `plugins/` is its source, and
# `scripts/build-skills-dist.sh` is the only thing that turns one into the
# other. This check is what keeps the committed copy equal to what that script
# would produce today.
#
# It matters because `dist/` is what non-Claude-Code consumers actually install
# — OpenPackage, OpenCode, Crush, Codex all read `dist/<plugin>/skills/`, never
# `plugins/`. A stale `dist/` is not a cosmetic lag; it is shipping a different
# product than the one in the repository. That has already happened: `dist/`
# sat at HEAD carrying a superseded type table for a full cycle and nothing
# said a word, because `build:dist` was wired into no hook, no `check`, and no
# workflow.
#
# WHY REBUILD-AND-DIFF RATHER THAN JUST REBUILDING. The cheaper option is to
# put `build:dist` in `npm run check` and let drift show up in `git status`.
# That is not a gate: `check` runs from `.husky/pre-commit`, so it would
# rewrite `dist/` underneath a commit that has already staged its files — the
# regenerated output lands unstaged and the stale copy is committed anyway. In
# CI it is worse than useless, since a fresh checkout regenerates the files,
# reports nothing, and throws the result away. A gate that mutates the tree it
# is checking cannot fail in the two places it needs to.
#
# So: build a second copy somewhere disposable, compare, delete. Nothing under
# `dist/` is touched, the exit code is the whole answer, and the same command
# is honest from a hook, from CI, and by hand. The cost is one extra build
# (~1.3s — the build is a `cp -R`, a couple of heredocs and one Prettier run).
#
# NORMALIZATION: none, deliberately, and this is the difference from
# `scripts/check-mirror.sh`. That script compares two hand-maintained copies
# whose whitespace legitimately differs, so it pipes both through Prettier
# first. Here both sides come out of the same generator, so any difference at
# all is a real one and a byte comparison is the correct instrument. What makes
# that safe is `build-skills-dist.sh` passing `--config` to its Prettier run —
# without it the temp-dir build would find no `.prettierrc` and every generated
# README would report as drifted.
#
# DISCOVERED, NOT LISTED, for the same reason `check-mirror.sh` discovers: the
# comparison is `diff -r` over two whole trees, so a file added to a plugin, a
# plugin added to `plugins/`, and a file deleted from either are all caught
# without anybody remembering to add a line here.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -d "$ROOT/dist" ]; then
  echo "MISSING        dist/  (never built — run: npm run build:dist)"
  exit 1
fi

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

FRESH="$STAGE/dist"

# The build's own stdout is a progress log, not a result. Keep it for the
# failure path only — if the builder itself breaks, its output is the finding.
if ! DIST_DIR="$FRESH" "$ROOT/scripts/build-skills-dist.sh" > "$STAGE/build.log" 2>&1; then
  echo "BUILD FAILED   scripts/build-skills-dist.sh could not produce dist/"
  echo ""
  cat "$STAGE/build.log"
  exit 1
fi

if diff -r "$ROOT/dist" "$FRESH" > "$STAGE/diff.txt" 2>&1; then
  file_count=$(find "$ROOT/dist" -type f | wc -l | tr -d ' ')
  plugin_count=$(find "$ROOT/dist" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
  echo "dist: clean — $file_count file(s) across $plugin_count plugin(s) match a fresh build"
  exit 0
fi

# `diff -r` prints `diff <a> <b>` before each file's hunks and `Only in <dir>:
# <name>` for unpaired files; turn both back into something a reader can act on
# without knowing where the temp build went.
sed -e "s|^diff \(-[a-zA-Z-]* \)*$ROOT/dist/|DRIFTED        dist/|" \
    -e "s| $FRESH/[^ ]*$||" \
    -e "s|^Only in $ROOT/dist\(/*\)\(.*\): |STALE          dist\1\2/|" \
    -e "s|^Only in $FRESH\(/*\)\(.*\): |MISSING        dist\1\2/|" \
    "$STAGE/diff.txt"

echo ""
echo "dist/ is a build product and it no longer matches plugins/. It is what"
echo "OpenPackage, OpenCode, Crush and Codex install, so a stale copy ships a"
echo "different product than this repository holds."
echo ""
echo "  npm run build:dist   # then commit dist/ alongside the plugin change"
exit 1
