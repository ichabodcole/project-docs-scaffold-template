---
type: item
title: Investigate test performance and CI reliability
description:
  Measure test costs, investigate the Actions failure, and recommend faster
  execution with equivalent coverage.
status: draft
lifecycle: done
id: 01a0f880-d53a-76b4-a21d-be653c795179
kind: research
generated: { by: pdocs, at: 2026-10-01 }
---

# Investigate test performance and CI reliability

The full gate became a bottleneck during the Codex marketplace work. Determine
which costs come from unique regression coverage, duplicate discovery,
subprocess integration tests, and CI setup. Investigate the reported Actions
failure too.

The user requested this research on October 1, 2026. Work is on
`research/test-performance`; the marketplace PR remains unchanged.

## Definition of done

- [x] Identify the expensive suites using local and CI logs.
- [x] Benchmark source-only sequential and file-parallel execution.
- [x] Compare the failing Actions run with a passing run and older failures.
- [x] Recommend changes with coverage safeguards and file follow-up items.

## Outcome

See the [write-up](./write-up.md). The first optimization is to run each source
suite once. Two follow-ups hold implementation and CI fixture stabilization.
