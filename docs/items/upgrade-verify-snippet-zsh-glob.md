---
type: item
title: Guard the tsconfig glob in the upgrade's verify snippet
description:
  Step 7's verify snippet aborts under zsh when no root tsconfig*.json exists,
  skipping the formatter checks after it.
status: draft
lifecycle: triage
id: 01a0ff09-eb17-7700-b264-7748f0d82c42
kind: bug
generated: { by: claude-opus-5-5, at: 2026-10-02 }
source: "#197"
---

# Guard the tsconfig glob in the upgrade's verify snippet

update-project-docs Step 7, check 3, runs
`grep -lE '"(scripts|\*\*/)' tsconfig*.json 2>/dev/null && echo FAIL || echo ok`.
Under zsh an unmatched glob is an error before grep runs
(`no matches found: tsconfig*.json`), so the Biome and Prettier checks after it
in the same block never run. A monorepo with no root `tsconfig*.json` hits it
every time.

Reported in
[#197](https://github.com/ichabodcole/project-docs-scaffold-template/issues/197).

## Definition of done

- [ ] The snippet guards the glob (e.g. with
      `find . -maxdepth 1 -name 'tsconfig*.json'`, as the formatter loop does)
      and runs to the end under bash and zsh in a repo with no root tsconfig.
