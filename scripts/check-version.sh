#!/usr/bin/env bash
#
# Every version marker in the repository agrees with `package.json`.
#
# release-please owns six files besides `package.json` — two `docs/README.md`
# front matters, two `.project-docs.json` bodies and the `VERSION` literal in
# both copies of `scripts/pdocs/cli.ts` — and it updates them from
# `release-please-config.json`'s `extra-files` when it cuts a release. Nothing
# checked that it had. Four of the six were seeded by hand after the 6.3.0
# release and have never been through one, so the first release to exercise
# them is the next one.
#
# THE LIST IS DERIVED, NOT RESTATED. It is read out of
# `release-please-config.json` itself, so an entry added there is checked here
# without anyone remembering to, and an entry naming a file that has been
# renamed or deleted fails LOUDLY rather than being skipped by whatever
# release-please does with a path it cannot find. A hand-written copy of that
# list would be a second source of truth for the thing this script exists to
# police.
#
# WHAT THIS CATCHES THAT NOTHING ELSE DOES. `check-mirror.sh` compares the
# payload against this repository, so it already guards `docs/README.md` and
# `scripts/pdocs/cli.ts` as PAIRS — but it says nothing about whether either
# half matches the package version, and it cannot see `.project-docs.json` at
# all: that file sits at the payload root, below the two trees the mirror walks.
# So the two copies of the file that tells a generated project which scaffold
# version it is could disagree, and no gate would have noticed.
set -euo pipefail

cd "$(dirname "$0")/.."

python3 - <<'PY'
import json
import re
import sys

version = json.load(open("package.json"))["version"]
problems = []
checked = 0


def check(path, found, where):
    global checked
    checked += 1
    if found != version:
        problems.append(f"{path}  {where} is {found!r}, package.json is {version!r}")


manifest = json.load(open(".release-please-manifest.json"))
if manifest.get(".") != version:
    problems.append(
        f".release-please-manifest.json  '.' is {manifest.get('.')!r}, "
        f"package.json is {version!r}"
    )
else:
    checked += 1

config = json.load(open("release-please-config.json"))
for entry in config["packages"]["."]["extra-files"]:
    path, kind = entry["path"], entry["type"]
    try:
        text = open(path, encoding="utf8").read()
    except FileNotFoundError:
        problems.append(f"{path}  named in release-please-config.json, but not on disk")
        continue

    if kind == "json":
        # Single-level `$.key` is the only shape in use. Anything richer is a
        # config this script cannot honestly verify, and saying so is the point.
        jsonpath = entry.get("jsonpath", "")
        m = re.fullmatch(r"\$\.([A-Za-z0-9_]+)", jsonpath)
        if not m:
            problems.append(f"{path}  jsonpath {jsonpath!r} is not a shape this check reads")
            continue
        key = m.group(1)
        data = json.loads(text)
        if key not in data:
            problems.append(f"{path}  has no {key!r} key for release-please to update")
            continue
        check(path, data[key], f"${{{key}}}")

    elif kind == "generic":
        # The generic updater rewrites the version on lines carrying the marker
        # comment. A file with no marker line is one release-please will leave
        # untouched for ever, which is a silent staleness this must not pass.
        marked = [ln for ln in text.splitlines() if "x-release-please-version" in ln]
        if not marked:
            problems.append(f"{path}  carries no `x-release-please-version` marker")
            continue
        for line in marked:
            found = re.search(r"\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?", line)
            if not found:
                problems.append(f"{path}  marker line holds no version: {line.strip()}")
                continue
            check(path, found.group(0), "marker")

    else:
        problems.append(f"{path}  extra-file type {kind!r} is not one this check reads")

if problems:
    print("version: DRIFTED")
    for p in problems:
        print(f"  {p}")
    print()
    print("release-please updates these from release-please-config.json. A marker")
    print("that disagrees is one it did not reach — check the path, the jsonpath,")
    print("or that the marker comment is still on the line.")
    sys.exit(1)

print(f"version: clean — {checked} marker(s) at {version}")
PY
