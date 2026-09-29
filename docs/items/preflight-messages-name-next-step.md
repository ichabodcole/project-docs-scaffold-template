---
type: item
title:
  Preflight messages name the rename shape, the backlinks, and a near-miss
  proposal
description:
  A slug collision says nothing about how to rename or where the inbound links
  are, and a project whose proposal is named <slug>-proposal.md silently becomes
  a born done item.
status: draft
lifecycle: triage
id: 01a0ee55-c89b-7366-b9fb-3c60b0099906
kind: task
generated: { by: claude-opus-5-5, at: 2026-09-29 }
scope: migrations
source: "grapevine project-docs-v9 #17"
---

# Preflight messages name the rename shape, the backlinks, and a near-miss proposal

Two preflight outputs from story-loom's run left the adopter to work out the
next step:

- **A slug collision** between an archived and a live project
  (`projects/_archive/storyline-engine` and `projects/storyline-engine`) is a
  judgment step, but the message doesn't suggest a rename shape
  (`<slug>-legacy`, say) or point at `pdocs backlinks` for the inbound links.
- **A project whose proposal isn't named `proposal.md`**
  (`storyline-engine-proposal.md`) becomes a born `done` item with no remark.
  The plan line could say "no proposal.md (found storyline-engine-proposal.md)"
  so the near-miss is visible.

## Definition of done

- [ ] The collision message suggests a rename and names the backlinks command,
      and the plan names a near-miss proposal file, with tests.
