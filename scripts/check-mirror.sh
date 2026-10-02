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
#
# DISCOVERED, NOT LISTED, and that is a fix rather than a style preference. This
# used to be a hand-written array, and with twelve unmirrored files under
# `scripts/pdocs/` it still reported `mirror: clean`: a list only checks what
# somebody remembered to add to it. Worse, the obvious repair — a literal
# `scripts/pdocs/**` entry — cannot work, because the loop below consumes each
# entry as `diff -q "$ROOT/$rel"`, quoted, with no glob expansion; the entry
# would resolve to a file that does not exist and report DRIFTED forever.
#
# So the payload's own `scripts/` tree is the list. Every file it carries must
# have a byte-identical counterpart here.
#
# WHAT THIS CANNOT SEE: a file that exists HERE and not in the payload. That is
# deliberate, and it is what makes the payload PRODUCTION-ONLY. Every `*.test.ts`
# under `scripts/`, `scripts/pdocs/test-env.ts` and `scripts/pdocs/__fixtures__/`
# are this repository's own and stay unmirrored on purpose: they test code the
# consumer is delivered rather than owns, they would run inside their `bun test`,
# and the golden transcripts encode THIS repo's `SCHEMA.md` — shipping those
# would hand every generated project a test that fails the moment it edits its
# own contract. Adding a new NON-TEST file under `scripts/` that SHOULD be
# mirrored is therefore still a thing a human has to remember to copy across;
# the gate catches the drift afterwards,
# not the omission.
CODE=()
while IFS= read -r payload_file; do
  CODE+=("${payload_file#"$PAYLOAD"/}")
done < <(find "$PAYLOAD/scripts" -type f | sort)

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

# SEEDED TEMPLATES ARE COMPARED BYTE FOR BYTE, not normalized. The scaffold
# records each seeded file's hash (`docs/.pdocs-seed.json`), and a migration
# updates a template only while the project's copy still has that hash — so a
# wrapping difference between this repository's copy and the payload's is a
# real difference to the migration, even though Prettier calls it nothing.
#
# The match runs on the path INSIDE the payload (`docs/…`), never the absolute
# one: CI checks this repository out under `…/project-docs-scaffold-template/`,
# where an absolute `-ipath '*template*'` matched every payload file and called
# the two deliberately-different pages above drifted templates.
while IFS= read -r rel; do
  [ -f "$ROOT/$rel" ] || continue
  if ! cmp -s "$ROOT/$rel" "$PAYLOAD/$rel"; then
    echo "DRIFTED        $rel  (a seeded template, compared byte for byte: its hash is recorded)"
    fail=1
  fi
done < <(cd "$PAYLOAD" && { find docs -type f -ipath '*template*'; echo docs/STYLE.md; } | sort)
# `docs/STYLE.md` is the one seeded file that is not a template (`SEEDED_PAGES`
# in scripts/pdocs/seed.ts); its hash is recorded all the same.

# THE SEED RECORD MATCHES THE FILES IT NAMES. `docs/.pdocs-seed.json` holds the
# hash of every seeded file as this repository ships it. A template edited
# without refreshing its hash leaves the record describing bytes nobody has,
# and nothing else notices: `ITEM.template.md` went a release stale that way.
# Hashed with `seed.ts`'s own `hashOf`, so this agrees with what a migration
# compares. It lives here because the seeded files are already compared byte
# for byte above; this is the same question asked of the record.
if ! bun -e '
  import { hashOf, loadManifest } from "./scripts/pdocs/seed.ts";
  const m = loadManifest("docs");
  let stale = 0;
  for (const [rel, hash] of Object.entries(m.files)) {
    const now = hashOf(`docs/${rel}`);
    if (now === hash) continue;
    stale++;
    console.log(`STALE SEED     docs/${rel}  (${now === null ? "recorded, but not on disk" : "recorded hash is not the file\x27s"})`);
  }
  if (stale) {
    console.log("");
    console.log("Refresh each from the file as it now stands:");
    console.log("  bun -e \x27import {hashOf,loadManifest,writeManifest} from \"./scripts/pdocs/seed.ts\"; const m=loadManifest(\"docs\"); for (const k of Object.keys(m.files)) { const h=hashOf(`docs/${k}`); if (h) m.files[k]=h; } writeManifest(\"docs\", m)\x27");
    process.exit(1);
  }
'; then
  fail=1
fi

# Cookiecutter renders EVERY payload file through Jinja, code included. A
# mirrored source file that happens to contain `{{` or `{%` is therefore
# rewritten on generation — silently, and only in the generated project, where
# nothing here would ever see it. This was not hypothetical: mirroring the lint's
# tests shipped a `Bun.Glob("{{cookiecutter.project_slug}}/**")` that came out
# the other side as the project's own slug, and the assertion inverted.
#
# Payload PROSE uses those delimiters on purpose. Payload CODE has no reason to.
for rel in "${CODE[@]}"; do
  if grep -qE '\{\{|\{%' "$PAYLOAD/$rel"; then
    echo "JINJA IN CODE  $rel  (cookiecutter will rewrite this on generation)"
    fail=1
  fi
done

for rel in "${CODE[@]}"; do
  if [ ! -f "$ROOT/$rel" ]; then
    echo "PAYLOAD ONLY   $rel  (code with no counterpart at $rel — should this be mirrored?)"
    fail=1
  elif ! diff -q "$ROOT/$rel" "$PAYLOAD/$rel" > /dev/null 2>&1; then
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
