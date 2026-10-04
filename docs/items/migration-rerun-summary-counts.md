---
type: item
title: A completing re-run's summary counts only its own plan
description:
  After a stop, the run that completes v2.10-to-v3.0 prints '0 move(s), 0
  document(s) written', counting only its own plan rather than the migration's.
status: draft
lifecycle: backlog
id: 01a0e3c5-8b05-72d0-af59-19961bd11b60
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-27 }
tags: [migrations]
scope: migrations
from: items/spellbook-feedback-round-2/sessions/2026-09-27-v3-migration-spellbook-round-2.md
priority: low
---

# A completing re-run's summary counts only its own plan

Found by the implementer of `fix/v3-migration-spellbook-round-2`. When
v2.10-to-v3.0 completes on a re-run after a stop, its last line counts only that
run's plan ("0 move(s), 0 document(s) written"), which reads as if the migration
did nothing. The behaviour predates that branch.

## Definition of done

- [ ] A completing re-run's last line reports the migration's totals from its
      record, with a test that stops, re-runs and checks the line.

## Related Documents

- [v3 migration, Spellbook round 2 — 2026-09-27](./spellbook-feedback-round-2/sessions/2026-09-27-v3-migration-spellbook-round-2.md)
