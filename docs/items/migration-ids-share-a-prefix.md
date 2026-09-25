---
type: item
title: v2.10-to-v3.0 mints ids that share their 12-character prefix
description:
  The migration mints every id in one burst, so all share the 12 characters
  pdocs displays (D18) and a short id identifies nothing.
status: draft # OKF §5.4: draft | stable | deprecated. Nothing else.
lifecycle: done
id: 01a0da5f-ca2a-7268-a49e-67d8a4f4c55c
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-25 }
scope: migrations
---

# v2.10-to-v3.0 mints ids that share their 12-character prefix

Found in the dogfood run: all 48 items the migration filed here start
`01a0da55-e3a`, so `pdocs view` lists the same short id on every line and a
12-character prefix resolves to nothing unique. D18 assumed ids filed about 16
ms apart. Mint each migrated item's UUIDv7 from its own document's date
(`generated.at`, or the first commit), so ids sort by filing date and their
displayed prefixes differ. Ids already written are never edited; this is for
consumers who have not run the migration yet. Done when a migrated fixture's
items show distinct 12-character prefixes.
