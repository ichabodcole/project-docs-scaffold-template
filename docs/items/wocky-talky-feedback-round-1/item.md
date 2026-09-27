---
type: item
title: "wocky-talky feedback, round 1: the first work cycle on 9.0"
description:
  "Five fixes from the first greenfield project's first cycle: finalize-branch's
  squash scan and empty branch, formatter guidance, and pdocs new and set
  output."
status: draft # OKF §5.4: draft | stable | deprecated. Nothing else.
lifecycle: active
id: 01a0dfd9-e9d7-77d3-9666-954c1028941b
kind: task
generated: { by: claude-opus-5-5, at: 2026-09-26 }
tags: [feedback, pdocs, finalize-branch]
cycle: 2026-09-v9-rollout-feedback
scope: project-docs
priority: high
---

# wocky-talky feedback, round 1: the first work cycle on 9.0

wocky-talky, a young Bun monorepo, adopted 9.0.0 fresh (no migration) and ran
the first full loop on 2026-09-26: `triage-items` on three items filed by an
agent in another harness, `pdocs new cycle`, then init-branch → implement →
finalize-branch → landed. It reported on the grapevine channel `project-docs-v9`
(messages 8 and 11), and a second loop landed with no new friction. Each finding
was checked against a clone of wocky-talky. The Prettier one turned out to be
narrower than reported: fresh `pdocs new` output passes wocky-talky's own
config. The failure came from text the agent wrote in: a wrapped `- [ ]`
continuation indented two spaces, where Prettier's default `proseWrap: preserve`
wants six.

| #   | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Where                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | Step 8's SHA scan reads `HEAD^` by design, so it never sees the session record Step 7 commits, the document most likely to cite a branch SHA. Step 4 says to cite branch work by description, not SHA, when the landing policy is squash; Step 8 also scans `HEAD`'s new documents and reports hits as "reword before squashing", never as a veto.                                                                                                                                                                                                         | `plugins/project-docs/skills/finalize-branch/SKILL.md` Steps 4, 8 |
| 2   | Step 0/1: if `<base>..HEAD` is empty and the tree is dirty, commit the code (not `docs/`) before the review, which is scoped to the net diff.                                                                                                                                                                                                                                                                                                                                                                                                              | `finalize-branch/SKILL.md`                                        |
| 3   | Step 7, and the next-step line `pdocs new` prints: run the project's formatter on new and edited docs before committing. A `prettier --check` hook fails the first commit otherwise; a `--write` hook reflows silently.                                                                                                                                                                                                                                                                                                                                    | `finalize-branch/SKILL.md`; `scripts/pdocs/commands/new.ts`       |
| 4   | `pdocs new`: strip the template's guidance comments from frontmatter values (`status: draft # OKF §5.4…`, `lifecycle: triage # …`, `tags: … # 2-4 kebab-case`); decided at triage 2026-09-26 that they are retired everywhere, so `set` never writes one either (this replaces the dropped `pdocs-set-keeps-lifecycle-comment`); fill `started:` on a cycle instead of leaving `YYYY-MM-DD`, and write `--tags` as a list when the template has no `tags:` key. Filing this item wrote `tags: feedback,pdocs,finalize-branch`, a string the lint accepted. | `scripts/pdocs/commands/new.ts`; the lint's `tags` check          |
| 5   | `pdocs set` on a value already set says "already" and skips the write, instead of printing `X -> X`.                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `scripts/pdocs/commands/set.ts`                                   |

The lint passing a fresh cycle with every placeholder in place
(`[One sentence…]`, `tags: [area, area]`, `started: YYYY-MM-DD`) is
[its own item](../lint-rejects-placeholder-bodies.md), in the same cycle.

## Definition of done

- [ ] Each of the five rows is fixed, with a test for the `pdocs` changes (4,
      5).
- [ ] A fresh `pdocs new item --tags a,b` and `pdocs new cycle` in a generated
      payload pass `pdocs check` and `prettier --check` with no hand edits to
      their frontmatter.
- [ ] Plugin 4.0.1 is released carrying them.
