---
type: index
title: Documentation catalog
description:
  One line per library page, so nothing durable is reachable only by knowing it
  exists.
tags: [catalog, documentation]
status: stable
generated: { by: claude-opus-5, at: 2026-09-03 }
---

# Documentation catalog

Every page in the library — the folders whose documents are meant to live and
grow — gets exactly one line here: a link and its own `description`, verbatim.
Nothing else. This is the reachability root, so a page missing from it is an
orphan and the lint says so.

Add entries under their heading, below the ones already there; the sections read
in the order the pages were written. A heading reading `_No pages yet._` is
holding the place for the first entry — replace that line, don't add beneath it.

The workbench (`backlog/`, `briefs/`, `investigations/`, `projects/`,
`reports/`, `fragments/`, `cycles/`) is deliberately **not** catalogued. Those
documents are found by their date and their folder README, they close, and
nobody returns to them. See [SCHEMA.md](./SCHEMA.md) for the two tiers.

## The tree itself

- [Project manifesto](./PROJECT_MANIFESTO.md) — What this project is for, what
  it deliberately is not, and the principles that decide the arguments in
  between.
- [Project summary](./PROJECT-SUMMARY.md) — A synthesized overview of the
  repository: what it ships, how it is laid out, and where the work currently
  stands.

## Architecture

How subsystems are built and why. — see
[architecture/README.md](./architecture/README.md).

_No pages yet._

## Specifications

What a domain must do, precisely enough to build from. — see
[specifications/README.md](./specifications/README.md).

_No pages yet._

## Interaction design

How a surface behaves for the person using it. — see
[interaction-design/README.md](./interaction-design/README.md).

_No pages yet._

## Playbooks

Repeatable procedures for work that recurs. — see
[playbooks/README.md](./playbooks/README.md).

_No pages yet._

## Lessons learned

What went wrong or right, distilled so it transfers. — see
[lessons-learned/README.md](./lessons-learned/README.md).

- [Migration Steps Must Be Uniformly Specific](./lessons-learned/migration-steps-uniform-specificity.md)
  — In an agent-run guide, one underspecified step becomes the failure point —
  the specificity has to be uniform, not average.

## Memories

What has been happening lately, for a cold start. — see
[memories/README.md](./memories/README.md).

- [Documentation restructured to project folders](./memories/2026-02-09-documentation-restructuring.md)
  — Flat proposals/, plans/ and sessions/ folders became co-located
  projects/<name>/ folders, so a feature's whole record opens in one place.
- [Added Design Resolution document type](./memories/2026-02-13-design-resolution-doc-type.md)
  — A Design Resolution stage was added between proposal and plan, for the
  system-level questions a proposal leaves open.
- [Generalized worktree scripts and bundled with skill](./memories/2026-02-14-generalize-worktree-scripts.md)
  — Project-specific worktree scripts were generalized and bundled into the
  skill that uses them, so they carry no repo assumptions.
- [Added test plan document type to project lifecycle](./memories/2026-02-15-test-plan-doc-type.md)
  — Test plans became a document type: tiered verification scenarios written
  before an agent implements, not after.
- [Cookiecutter install-to-current-directory option](./memories/2026-02-22-install-to-current-directory.md)
  — The cookiecutter learned to install docs/ into an existing project rather
  than only into a fresh slug folder.
- [Renamed archive/ to \_archive/ across scaffold](./memories/2026-02-25-archive-to-underscore-archive.md)
  — Every archive/ folder became \_archive/, so closed work sorts to the top of
  a listing instead of into the middle of it.
- [Cross-agent skill distribution pipeline](./memories/2026-02-25-cross-agent-distribution.md)
  — A build script packages plugin skills, agents and commands into dist/ with
  OpenPackage manifests, so they run outside Claude Code.
- [dev-kickoff skill replaces parallel-worktree-dev](./memories/2026-03-03-dev-kickoff-skill.md)
  — dev-kickoff replaced parallel-worktree-dev with one orchestrator that
  handles both the worktree and main-repo paths.
- [Migration scripts added to update-project-docs skill](./memories/2026-03-03-migration-scripts.md)
  — Migration guides gained shell scripts for their mechanical steps, so an
  upgrade is run rather than transcribed.
- [Added agent-feedback-reporting recipe](./memories/2026-03-08-agent-feedback-reporting-recipe.md)
  — A recipe for giving agents a structured way to report difficulty mid-run,
  with the entity_id correlation gotcha written down.
- [Added zed-biome-husky-quality-gates recipe](./memories/2026-04-02-zed-biome-husky-recipe.md)
  — A recipe making Biome the single formatting authority across editor, hook
  and CI, and the three-config discipline that stops drift.
- [api-mcp-server skill gains Claude Desktop DCR compatibility section](./memories/2026-04-16-api-mcp-desktop-dcr-gotcha.md)
  — Claude Desktop's connector fails silently against a confidential-client DCR
  endpoint; the api-mcp-server recipe now documents the rewrite that fixes it.
- [Project CLI Toolkit Recipe Added](./memories/2026-04-19-project-cli-toolkit-recipe.md)
  — A recipe for the dual-audience CLI pattern: TTY-aware text for people, a
  machine-readable envelope for agents, from one command.
- [Slimmed project-cli-toolkit Skill to Companion Doc](./memories/2026-04-19-project-cli-toolkit-skill-slim.md)
  — The project-cli-toolkit recipe shrank from 1071 lines to 386 once an
  installer owned the scaffold and the recipe kept only the rationale.
- [Digestify --reference flag shipped](./memories/2026-05-07-digestify-reference-input.md)
  — Digestify learned to render a file the agent never has to read, which is the
  whole token win when reviewing a long document.
- [Digestify skill shipped in toolbox plugin](./memories/2026-05-07-digestify-skill-shipped.md)
  — Digestify shipped: a terminal agent writes markdown with question fences,
  the user answers in a browser, and the answers land in the same turn.
- [Recipes plugin consolidated to umbrella skill](./memories/2026-05-07-recipes-plugin-consolidation.md)
  — Twenty-one recipe skills became one umbrella skill loading recipes on
  demand, trading public skill names for a namespace that stops growing.
- [Digestify session-recovery features shipped](./memories/2026-05-08-digestify-session-recovery.md)
  — Digestify gained an idle countdown, heartbeat keep-alive and draft recovery,
  so a slow review no longer loses what was typed.
- [Magpie skill shipped — Gemini-bbox moodboard extraction](./memories/2026-05-23-magpie-skill-shipped.md)
  — Magpie shipped: every distinct element on a moodboard extracted as its own
  PNG, discovered by a vision model for a penny or two a board.
- [Tuskboard skill shipped](./memories/2026-05-24-tuskboard-skill-shipped.md) —
  Tuskboard shipped — a duplex agent-and-user task board in the browser, and the
  first flagship use of the agent-surface-bun pattern.
- [Grapevine V1.6.7 — presence honesty, grounding, consume-path paper cuts](./memories/2026-05-28-grapevine-v167.md)
  — Grapevine V1.6.7 made presence counts honest, so a watching tab stops
  reading as a ghost participant.
- [finalize-branch: reviewer capability check + project-owned landing policy](./memories/2026-08-07-finalize-branch-reviewer-and-landing-policy.md)
  — finalize-branch stopped assuming: it verifies a reviewer can actually run
  commands, and reads the landing policy from the project rather than picking
  one.
- [Sweep-project closure touchpoint added; first two projects archived](./memories/2026-08-07-sweep-project-closure-touchpoint.md)
  — sweep-project arrived to reconcile a project against what was actually
  built, with archival as a human decision rather than a step.
- [Branch Landing Policy example had drifted from its implementation](./memories/2026-09-02-branch-landing-policy-example-drift.md)
  — The landing-policy example shipped to downstream projects still carried
  wording this repo had already replaced for being unreachable.
- [Completion marks generalized; two fail-open checks found by execution review](./memories/2026-09-02-completion-marks-and-silent-permissive-checks.md)
  — sweep-project now reads completion marks in whatever idiom a document
  already uses, rather than looking for checkboxes.
- [A self-report can't be made verifiable by constraining its wording](./memories/2026-09-02-self-reports-cannot-be-made-verifiable.md)
  — Constraining how an agent words a self-report does not make the report
  verifiable; only checking the capability does.
- [OKF frontmatter layer shipped; the gate that did not gate half the tree](./memories/2026-09-04-okf-frontmatter-layer.md)
  — A checked metadata layer on every document, and the lesson that a guardrail
  is only verified where you actually try to break it.
