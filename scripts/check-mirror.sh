#!/usr/bin/env bash
#
# The cookiecutter payload and this repository's own `docs/` hold the same
# files twice. This check is what keeps them the same.
#
# It compares them NORMALIZED — both sides piped through Prettier first —
# because `.prettierignore` deliberately excludes the payload, so `npm run
# format` reflows this repo's copies and leaves the payload's alone. Those
# wrapping differences are expected and mean nothing; a changed sentence means
# everything, and a byte comparison cannot tell them apart.
#
# The normalization happens in ONE Prettier run over a staging directory, not
# once per file. The per-file version spawned Node 82 times and took nine
# seconds, which is long enough in a pre-commit hook to teach people
# `--no-verify` — and a gate that trains its own bypass is worse than no gate.
#
# Files that are structurally mirrored but whose CONTENT differs by design are
# listed in DIFFERS_BY_DESIGN below, with the reason. Adding to that list is a
# decision, not a convenience: every entry is a place where the two copies can
# drift and nothing will say so.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PAYLOAD="$ROOT/{{cookiecutter.project_slug}}"
cd "$ROOT"

# `PROJECT_MANIFESTO.md` — this repo's is filled in; the payload's is the empty
#   skeleton a new project fills.
# `index.md` — this repo's catalogues every library page; the payload's is the
#   same headings with `_No pages yet._` under each.
DIFFERS_BY_DESIGN=(
  "docs/PROJECT_MANIFESTO.md"
  "docs/index.md"
)

# Code, not prose. Prettier's scope here is `**/*.md`, so these are compared
# byte for byte — the lint has no excuse to differ between the two copies at all.
CODE=(
  "docs/lint.ts"
  "scripts/docs-lint/index.ts"
  "scripts/docs-lint/config.ts"
  "scripts/docs-lint/unlinted-links.ts"
  "scripts/docs-lint/index.test.ts"
)

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

fail=0
docs_checked=0

is_exempt() {
  local needle="$1"
  for e in "${DIFFERS_BY_DESIGN[@]}"; do
    [ "$e" = "$needle" ] && return 0
  done
  return 1
}

while IFS= read -r payload_file; do
  rel="${payload_file#"$PAYLOAD"/}"
  mine="$ROOT/$rel"

  if [ ! -f "$mine" ]; then
    echo "PAYLOAD ONLY   $rel  (no counterpart at $rel — should this be mirrored?)"
    fail=1
    continue
  fi

  is_exempt "$rel" && continue

  mkdir -p "$STAGE/mine/$(dirname "$rel")" "$STAGE/payload/$(dirname "$rel")"
  cp "$mine" "$STAGE/mine/$rel"
  cp "$payload_file" "$STAGE/payload/$rel"
  docs_checked=$((docs_checked + 1))
done < <(find "$PAYLOAD/docs" -name '*.md' | sort)

if [ "$docs_checked" -gt 0 ]; then
  # One process, both trees. `--config` is REQUIRED: the staging directory is
  # under /tmp, where Prettier finds no `.prettierrc` and falls back to
  # defaults. The default `proseWrap` is `preserve`, which leaves both sides
  # wrapped exactly as they arrived — so the run appears to succeed and
  # normalizes nothing, and every payload file reports as drifted.
  # `--log-level warn` keeps the per-file list out of the gate's output.
  npx --no-install prettier --write --log-level warn \
    --config "$ROOT/.prettierrc" "$STAGE" > /dev/null

  if ! diff -r "$STAGE/mine" "$STAGE/payload" > "$STAGE/diff.txt" 2>&1; then
    # `diff -r` prints `diff <a> <b>` before each file's hunks; turn that back
    # into the repo-relative path a reader can act on.
    sed -e "s|^diff \(-[a-zA-Z-]* \)*$STAGE/mine/|DRIFTED        |" \
        -e "s| $STAGE/payload/[^ ]*$||" \
        -e "s|^\(Only in\)|PAYLOAD/REPO ONLY: \1|" \
        "$STAGE/diff.txt"
    fail=1
  fi
fi

for rel in "${CODE[@]}"; do
  if ! diff -q "$ROOT/$rel" "$PAYLOAD/$rel" > /dev/null 2>&1; then
    echo "DRIFTED        $rel  (code, compared byte for byte)"
    fail=1
  fi
done

if [ "$fail" -eq 0 ]; then
  echo "mirror: clean — $((docs_checked + ${#CODE[@]})) file(s) match the payload (${#DIFFERS_BY_DESIGN[@]} exempt by design)"
else
  echo ""
  echo "The cookiecutter payload is the source of truth for structure. Copy the"
  echo "settled version across, in whichever direction is actually newer, and say"
  echo "which you chose in the commit."
fi
exit "$fail"
