---
type: item
title: Bootstrap skill-garden with the five plugins
description:
  Create the skill-garden repository from the 9.2.0 scaffold, copy in
  agent-bridge, hivemind, operator, recipes and toolbox with their own
  marketplace, and move their live items there.
status: draft
lifecycle: done
id: 01a0ee6f-03d7-71b1-a716-431cd34d7aa4
kind: task
generated: { by: claude-opus-5-5, at: 2026-09-29 }
parent: feature/toolbox-migration
scope: project-docs
priority: high
cycle: 2026-09-skill-garden
---

# Bootstrap skill-garden with the five plugins

The [plugin extraction](../../features/toolbox-migration/feature.md) moves
agent-bridge, hivemind, operator, recipes and toolbox out of this repository.
Cole created the empty repository
(`git@github.com:ichabodcole/skill-garden.git`, local folder
`~/Projects/skill-garden`). Cole's decisions (2026-09-29): a fresh history,
whose first commit names the project-docs commit it was copied from;
skill-garden generated from the project-docs scaffold at 9.2.0; the live items
about these plugins moved there, with archived history staying here; no
openpackage `dist/` build for now; and a hard cut, with no window where the
plugins ship from both repositories.

## Definition of done

- [x] `~/Projects/skill-garden` is generated from the 9.2.0 scaffold, under git,
      with `develop` and `main`, and pushed to its remote.
- [x] It holds the five plugins at their current versions and a
      `.claude-plugin/marketplace.json` that lists them.
- [x] Its README and root `AGENTS.md` say what the repository is for, and point
      at the `pdocs` CLI.
- [x] The live items about these plugins live there:
      `skill-distribution-beyond-claude-plugins`, `dedupe-hivemind-field-guide`
      and `hivemind-lessons-folder-vs-guidance-lifecycle`.
- [x] Cole has added the skill-garden marketplace and installed the plugins in
      use from it (hivemind, operator, recipes, toolbox; agent-bridge stays
      available there).
