# Moodboard Element Extraction — Investigation Through Shipped Magpie Skill

**Date:** 2026-05-23 (work spanned into the early hours of 2026-05-24)

## Context

Started from "the Tusk Board project needs `mascot.webp`, `mascot-large.webp`,
and `favicon.png` extracted from a branding board image" and grew into a broader
investigation of how an agent skill could automate the extraction step for any
composite/branding image. Ended the session with a new skill (`toolbox:magpie`)
shipped and the toolbox plugin at 1.6.0.

## What Happened

The session walked through five experimental approaches in sequence, each one
proving or disproving the next:

1. **Investigation document.** Spawned the `project-docs:investigator` subagent
   to scope the landscape. Came back with a recommended pipeline (Claude vision
   → SAM 2 → rembg) and an explicit kill criterion: if Claude bbox precision
   turned out quadrant-rough rather than element-rough, ship marker-mode v1 and
   defer NL selection.

2. **PoC #1 — direct Claude bbox.** Asked myself (Opus 4.7 via Read tool) to
   localize five canonical elements on the Tuskboard board. **0/5 correctly
   localized** — my bboxes routinely captured background corners or wrong
   elements entirely. Kill criterion fired.

3. **PoC #2 — marker mode.** Built `mark_detect.py` (OpenCV HSV thresholding
   - contour rect detection) and validated end-to-end against a real user-drawn
     marker image Cole produced (`tuskboard-brand-id_v02-marked-by-cole.png`).
     3/3 hand-drawn marker rectangles recovered with pixel accuracy. `rembg`
     produced clean alpha cutouts on the three sample elements. This was the
     proposed v1.

4. **PoC #3 — grid overlay (Cole's idea).** Hypothesis: overlay a labeled grid
   on the image, ask Claude to name cells. The discrete answer space converts a
   spatial-precision task into a pattern-anchored cell-naming task, which models
   are much better at. **5/5 in the correct cell** with a coarse 7×4 grid —
   dramatic improvement over PoC #1. Side experiments ruled out source-scaling
   as a path to tighter results and showed that hierarchical refinement (zoom
   into a cell, re-grid at higher density) helps but hits a content-alignment
   floor on tightly-packed uniform layouts like icon rows.

5. **PoC #4 — Gemini 3.5 Flash via OpenRouter.** Suggested by Cole. Google
   publishes a normalized `[0..1000]` bbox protocol that Gemini is trained
   against. Built `gemini_bbox.py` and `gemini_discover.py`. **5/5 pixel-tight
   crops** in named mode; **19/19 elements correctly identified and tightly
   cropped** in auto-discovery mode, with the model also classifying each
   element as wordmark / icon / sticker / illustration / palette / typography /
   screenshot. The classification turned out to be the routing signal for the
   next step.

6. **`rembg` routing follow-up.** Ran rembg over all 19 auto-discovered crops.
   Worked beautifully for illustrations/stickers/icons/wordmark; **destroyed**
   the color palette (treated swatches as background, kept 2/5) and the
   screenshot (stripped the white panel). This made the case for conditional
   bg-removal based on Gemini's `type` field — no second model call needed, the
   classification is already in hand.

After PoC #4 the path forward was obvious: ship Gemini-direct as the v1 mode.
Built the actual skill at `plugins/toolbox/skills/magpie/`:

- `discover.py` — OpenRouter call, returns manifest JSON with cost info
- `extract.py` — manifest → crops + conditional rembg + branded gallery.html
  - `<stem>-magpie-assets.zip`
- Magpie identity: extracted the wordmark + box-mascot stickers from the Magpie
  branding board (using Magpie itself — meta) and bundled them as
  `assets/wordmark.png` and `assets/mascot-box.png`. The gallery's brand palette
  (`#001117` ink, `#6366F1` indigo, `#20E0E0` cyan, Poppins + Inter) came
  directly from the branding board's documented identity.

Ran scaffold-update-checklist to keep the manifesto and dist/ in sync.

Independent code review (feature-dev:code-reviewer) flagged 3 blocking issues
(unclosed file handle, weak safe_filename, stale-PNG zip leak) and 3 hardening
items (no file-size guard, ungraceful response-shape error, unescaped
alpha_policy in HTML). All addressed before merge.

## Notable Discoveries

- **The grid-overlay idea was a genuinely clever workaround** that landed before
  we tried the obvious-in-retrospect Gemini path. The fact that it worked (5/5
  in correct cell) doesn't make it the right answer for v1 — Gemini-direct beats
  it on every axis — but it's the right fallback for any future "no API access"
  mode.

- **My (Claude's) bbox weakness vs Gemini's bbox strength** is documented in
  their training distributions — Google published the `[0..1000]` protocol and
  trains against it. The lesson: don't generalize "vision model" capabilities
  across providers; the specific training signal for a task matters.

- **Cost estimation went wrong by 20×.** I initially eyeballed Gemini calls at
  "fractions of a cent" but OpenRouter's `usage.cost` field showed the real
  number is 1–3¢ per board, dominated by reasoning tokens (Gemini 3.5 is a
  thinking model). Surfacing the actual cost in script output and in the
  manifest matters — both for honest accounting and for caching.

- **rembg's failure mode on flat-color content is severe enough to need
  routing.** Stripping 2/5 swatches from the palette would silently corrupt the
  asset. The `type` field Gemini already returns is the routing signal, which
  makes this a free downstream check.

- **The artifact cleanup midway through** (68 files → 27, after the user pointed
  out the bloat) was non-obvious but worth the time. Findings docs are the
  durable record; failed-experiment outputs are noise once the result is
  captured in prose.

## Changes Made

**New skill:**

- `plugins/toolbox/skills/magpie/SKILL.md` — frontmatter triggers + agent
  guidance, ~1100 words
- `plugins/toolbox/skills/magpie/scripts/discover.py` — OpenRouter call
- `plugins/toolbox/skills/magpie/scripts/extract.py` — crop + rembg + HTML
  gallery + zip
- `plugins/toolbox/skills/magpie/assets/wordmark.png`, `mascot-box.png` —
  bundled brand assets (extracted by Magpie from its own branding board)
- `dist/toolbox/skills/magpie/...` — mirrored cross-agent bundle
- `plugins/toolbox/.claude-plugin/plugin.json` — version 1.5.0 → 1.6.0

**Project artifacts (under `docs/projects/moodboard-element-extraction/`):**

- `proposal.md` — original (now stale; ship-state is documented in this
  session + the gemini-bbox findings doc)
- `poc-findings.md` — Claude direct bbox PoC (the failure)
- `poc-grid-overlay-findings.md` — grid + hierarchical refinement
- `poc-gemini-bbox-findings.md` — the winning approach, including the
  bg-removal-routing follow-up
- `artifacts/` — 27 files: 6 working Python scripts, source images, sample
  outputs proving each PoC's claims

**Scaffold:**

- `docs/PROJECT_MANIFESTO.md` toolbox skill list updated to include both magpie
  and taskboard (the latter was already missing).

## Follow-Ups

Filed implicitly via review and proposal:

- **No automated tests for magpie.** Consistent with the other toolbox skills
  (digestify, taskboard) but worth a small `test_safe_filename.py`
  - `test_parse_bboxes.py` to lock down the edge cases the reviewer flagged.
    Maybe 30 min of work.
- **Pre-existing YAML frontmatter validation error on taskboard SKILL.md.**
  Surface by the dist build script. A `:` inside the description's quoted string
  is interpreted as a mapping key. Cleanup commit, not in scope here.
- **Drag-and-drop browser surface (v2 Magpie).** Cole's suggested follow-up: a
  Bun-based duplex page where the user drops a moodboard, sees discovered bboxes
  overlaid, and can adjust / delete / draw custom ones before triggering
  extract. Architectural sibling of Taskboard. Worth its own project branch.
- **Proposal.md is now out of date.** It was written when marker-mode was the
  proposed v1; the actual shipped skill is Gemini-direct. Worth updating or
  marking superseded.
- **toolbox plugin has no README.md.** Other small plugins also don't, but if a
  convention emerges, the toolbox should get one.

## Final State

Branch: `feat/moodboard-element-extraction`, 13 commits, ready to merge to
develop after a single-commit squash. Code review verdict: Ready to merge, with
fixes (all addressed). Format check clean, skill validation clean (except the
pre-existing taskboard issue).
