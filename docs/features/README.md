# Features

A feature is a body of work big enough to plan: its folder holds the feature
itself and every document the work produces.

## Layout

```
features/
├── <slug>/
│   ├── feature.md        # the feature: what it proposes, and its state
│   ├── plan.md           # optional
│   ├── design-resolution.md
│   ├── test-plan.md
│   ├── sessions/         # dated session notes
│   ├── reports/          # dated evidence
│   └── artifacts/        # anything else
└── _archive/<slug>/      # done or dropped features only
```

## Rules

- `feature.md` carries `type: feature` and a `lifecycle` from the feature states
  in [SCHEMA.md](../SCHEMA.md#state-groups). A feature never takes `triage`: it
  arrives already accepted.
- Templates live in [TEMPLATES/](../TEMPLATES/FEATURE.template.md).
- Only a feature in `done` or `dropped` may sit in `_archive/`, and the lint
  checks it.
