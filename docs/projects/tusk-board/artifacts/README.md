# Tusk Board — Artifacts

This folder is for **design references** that shape the project — not shippable
assets. Drop:

- `moodboard.*` — palette / style references (any image format works: PNG, JPG,
  WEBP, PDF, even a Figma export).
- `palette.*` — explicit color swatch reference if you want to lock the exact
  values.
- Anything else that helps capture the visual direction: rough mascot sketches,
  layout doodles, comparison shots.

## Where the SHIPPABLE assets go (not here)

The actual graphics the server serves at runtime live under:

```
plugins/toolbox/skills/tuskboard/assets/
  ├─ mascot.webp          # header mascot (~56×56 display, 2× recommended)
  ├─ mascot-large.webp    # empty-state hero (~280×280)
  └─ favicon.png          # browser-tab favicon (32×32)
```

That folder has its own README with format guidance and size targets.

Two separate homes because:

- `artifacts/` here = design process. Reference material, may include
  exploration, lives in `docs/projects/`. Not shipped in the plugin bundle.
- `plugins/.../assets/` = production. Final-form files only, bundled into
  `dist/` and shipped cross-agent.
