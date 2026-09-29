---
type: item
title: Migration tests time out at their 5-second budget under load
description:
  Twice on 2026-09-28 and 29 the pre-commit gate failed on migration tests
  exceeding bun's 5-second default, in a test and a beforeEach hook, and passed
  unchanged on retry.
status: draft
lifecycle: triage
id: 01a0eebf-8c73-76b0-b803-da561d5d8590
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-29 }
scope: migrations
---

# Migration tests time out at their 5-second budget under load

The full gate (`npm run check`, about 1,988 tests in about 4 minutes) failed
twice without a code change, and passed on an unchanged retry each time. On
2026-09-29 the failures were in `migrate-v2.10-to-v3.0.test.ts`: "wiring
witnesses — each phase's call site, neutered > phase 1 preflight" timed out at
5023 ms, and an unnamed `beforeEach`/`afterEach` hook at 5938 ms. The machine
was awake, so this isn't the sleep problem: these tests spawn real migrations
and git, and sit close to bun's 5-second default. A gate that fails at random
trains people to retry or skip it.

## Definition of done

- [ ] The slow migration tests and their hooks have a timeout that fits what
      they do (or are made faster), and the gate passes repeatedly under the
      pre-commit hook's load.
