---
type: item
title: Audit lifecycle before v3.0 in a multi-hop upgrade
description:
  A multi-hop upgrade audits lifecycle after v3.0 has already mapped stale
  values into feature and item states.
status: draft
lifecycle: triage
id: 01a0ff09-ea1e-710b-a207-961dbc275c12
kind: chore
generated: { by: claude-opus-5-5, at: 2026-10-02 }
source: "#194"
---

# Audit lifecycle before v3.0 in a multi-hop upgrade

In a multi-hop upgrade, the v2.6→v2.7 guide puts the `lifecycle` audit in its
"After the script" backfill, but v2.10→v3.0 maps each `lifecycle` into a feature
or item state as it finds it. Run in the documented order, the audit comes after
v3.0 has already turned `draft` proposals for shipped work into `backlog`
features. operator-mono's upgrade caught it by reading the v3.0 mapping table,
and found two shipped features still `draft`.

Reported in
[#194](https://github.com/ichabodcole/project-docs-scaffold-template/issues/194).

## Definition of done

- [ ] update-project-docs Step 4 says: when v2.10-to-v3.0 is in the run, audit
      `lifecycle` (blanks and stale values) after v2.6-to-v2.7 and before v3.0;
      the description backfill can wait until the end.
