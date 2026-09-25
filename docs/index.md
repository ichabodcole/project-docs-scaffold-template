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

- [Writing Migrations Playbook](./playbooks/writing-migrations-playbook.md) —
  Writing or changing an update-project-docs migration — a script, its tests and
  its guide — so every guard can fail and a consumer's agent can run it unaided.
- [Changing pdocs Playbook](./playbooks/changing-pdocs-playbook.md) — Changing
  the pdocs CLI or its lint under scripts/pdocs/ — a new rule, verb or flag — so
  it fires everywhere it claims to and holds in a consumer's hook.
- [Changing a Shipped Skill Playbook](./playbooks/changing-a-shipped-skill-playbook.md)
  — Changing a plugin skill, command or agent that consumers run, so every check
  it prescribes can fail and a fresh agent can follow it.
- [Changing the Scaffold Payload Playbook](./playbooks/changing-the-scaffold-payload-playbook.md)
  — Changing what the cookiecutter payload ships — a file, a template, a setup
  instruction — so it lands in the right owner's file and is true in a project
  that is not this one.
- [Fixing Consumer Feedback Playbook](./playbooks/fixing-consumer-feedback-playbook.md)
  — Working a batch of issues a consuming project filed, so each claim is
  reproduced and each proposed fix judged before anything is scoped.
