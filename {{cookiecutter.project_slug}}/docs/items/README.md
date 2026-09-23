# Work Items

A work item is one piece of work: a task, a bug, a chore, or a research
question. It is a single file until it owns documents, then a folder.

## Layout

```
items/
├── <slug>.md             # a single-file item
├── <slug>/
│   ├── item.md           # the item, once it owns documents
│   ├── write-up.md       # a research item's answer
│   ├── sessions/
│   ├── reports/
│   └── artifacts/
└── _archive/             # done or dropped items only
```

## Rules

- An item carries `type: item`, a lowercase UUID `id`, a `kind`
  (`task · bug · chore · research`) and a `lifecycle` from the item states in
  [SCHEMA.md](../SCHEMA.md#state-groups).
- Items created by agents start in `triage`.
- An item leaves the tree only after it reaches `dropped`; the lint checks it.
- Only an item in `done` or `dropped` may sit in `_archive/`.
- The template is [ITEM.template.md](../TEMPLATES/ITEM.template.md).
