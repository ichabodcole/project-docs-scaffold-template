# PoC Findings — Gemini 3.5 Flash bbox via OpenRouter

**Date:** 2026-05-23 **Source image:** `artifacts/tuskboard-brand-id_v02.jpg`
(1408×768) **Model:** `google/gemini-3.5-flash` via OpenRouter

## Hypothesis Under Test

Earlier PoCs established that Claude Opus 4.7 cannot reliably emit pixel-precise
bboxes on a multi-element moodboard (kill criterion fired: 0/5 elements
correctly localized). Google publishes a normalized `[0..1000]` bounding-box
coordinate protocol for vision-capable Gemini models and routinely demonstrates
bbox tasks in their docs. Cole's hypothesis: **Gemini's training signal for bbox
emission is meaningfully better than Claude's, and accessible cheaply via
OpenRouter.**

## Method

1. Built `gemini_bbox.py` — a Python script that base64-encodes the source
   image, posts to `https://openrouter.ai/api/v1/chat/completions` with
   `model=google/gemini-3.5-flash`, and prompts for a JSON array of
   `{name, box_2d: [y_min, x_min, y_max, x_max]}` using Gemini's documented
   coordinate convention.
2. Translated normalized cells to source pixel coordinates and cropped each
   bbox.
3. Inspected each crop against the intended element. Same 5 elements used in
   prior PoCs (the canonical comparison set).

## Result: hypothesis decisively confirmed — 5/5 pixel-tight crops

| Element        | Returned `box_2d`      | Crop quality                                               |
| -------------- | ---------------------- | ---------------------------------------------------------- |
| wordmark       | `[58, 42, 287, 499]`   | ✅ Pixel-tight, no clipping                                |
| color_palette  | `[443, 42, 554, 295]`  | ✅ Just the 5 swatches, no label, no margin                |
| icon_mammoth   | `[675, 43, 789, 101]`  | ✅ Just the mammoth icon, no neighbors                     |
| hero_mammoth   | `[551, 369, 912, 593]` | ✅ Just the full illustration                              |
| sticker_coffee | `[534, 624, 723, 724]` | ✅ Just the coffee-sticker, white sticker outline included |

Comparison across all approaches tested on this canonical 5-element set:

| Approach                                  | Correctly localized | Tight                     |
| ----------------------------------------- | ------------------- | ------------------------- |
| Claude Opus 4.7 direct bbox               | 0/5                 | 0/5                       |
| Grid overlay 7×4 (coarse)                 | 5/5                 | 3/5                       |
| Grid overlay 14×8 (dense + bigger labels) | partial             | partial                   |
| Hierarchical refinement (zoom + sub-grid) | depends             | content-alignment limited |
| Marker mode (user-drawn rects, OpenCV)    | 3/3 user marked     | 3/3                       |
| **Gemini 3.5 Flash bbox via OpenRouter**  | **5/5**             | **5/5**                   |

## Practical envelope

- **Latency:** single round-trip, sub-second to ~1-2 seconds for one image with
  five elements.
- **Cost (actual, from OpenRouter's `usage.cost` field):**
  - 5-element named-bbox call: **$0.0082** (1283 prompt + 702 completion tokens,
    of which 517 were reasoning tokens)
  - 19-element auto-discovery call: **$0.0221** (1332 prompt + 2253 completion
    tokens, of which 1428 were reasoning tokens)

  Gemini 3.5 Flash is a thinking model — the cost is dominated by reasoning
  tokens, which scale with task complexity (a board with 50 elements would cost
  more than one with 19). My earlier "fractions of a cent" estimate was off by
  ~20×; the right mental model is **~1-3¢ per board** depending on density.
  Still cheap enough that an interactive flow with re-prompts costs single-digit
  cents total per board.

- **Setup:** one env var (`OPENROUTER_API_KEY`), one HTTP call. No model
  download. No GPU. Works the same on any machine.
- **Caveat the user flagged:** Gemini 3.5 Flash is a general chat-vision model,
  not a bbox-specialized model like Florence-2 or Grounding DINO. The strong
  result here suggests Google's bbox protocol is well-baked into the general
  training distribution. Whether the strength generalizes to noisy / dense /
  adversarial moodboards remains untested.

## Implications for the skill design

This changes the v2 (and arguably v1) design substantially:

1. **Gemini-bbox mode is the new default zero-touch path.** Single round-trip,
   no overlays, no recursion, sub-cent per call, pixel-tight output. It
   collapses the grid + refinement complexity to "post image, read JSON, crop."
2. **Marker mode is still useful but for different reasons** — privacy/no API
   spend, deterministic output, working offline, working on elements Gemini
   doesn't recognize (specialized art styles, very small or unusual shapes). It
   becomes the precision fallback, not the primary mode.
3. **Grid mode is mostly obsoleted.** It served as a clever workaround for
   Claude's bbox weakness; with Gemini that weakness doesn't apply. Worth
   preserving the `grid_overlay.py` / `grid_crop.py` tooling for cases where API
   access isn't available, but the architecture's main path should be
   Gemini-direct.
4. **Hierarchical refinement also obsoleted** for the same reason — the ENHANCE
   pass was needed only because the initial pass was loose.

## Open questions for v2 spike continuation

- **Robustness across diverse moodboards.** This was a single image. Need to
  test: photo-realistic compositions, very dense layouts (50+ elements),
  hand-drawn boards, low-contrast elements, partial occlusion, overlapping
  elements, very small elements (favicon size at 32×32 within a large board).
- **How does it handle ambiguous element names?** "the icon" when there are
  eight icons; "the mammoth" when there are six mammoths. Probably needs the
  prompt to invite multiple matches or require descriptive names from the agent.
- **How does it compare to other vision models on the same task?** Worth running
  the same prompt against GPT-4o, Claude Sonnet, Llama vision, and
  Florence-2-via-Replicate, on a small benchmark of 5-10 boards. Likely reveals
  tradeoffs (cost, latency, quality).
- **The nano-banana auto-marker idea** is now an alternative path: have Gemini
  2.5 Flash Image _draw_ rectangles on the source, then run our existing
  `mark_detect.py`. May be more robust for cases where bbox-out is shaky but
  draw-on-image is clean. Worth a side-by-side once we have a harder benchmark
  image.
- **Cache key strategy for the skill.** Same image + same element list →
  deterministic bbox response (Gemini is set to `temperature=0`). Worth caching
  responses by image-hash + prompt-hash to keep iteration free once the user has
  run once.

## Follow-up: rembg routing depends on element type

Ran `rembg` over the 19 auto-discovered crops to validate the crop-then-cutout
pipeline end-to-end with the Gemini path. Results split clearly by element type:

- **Works well (rembg leaves a clean alpha):** illustrations, stickers, icons,
  wordmarks (rembg correctly identifies foreground graphics on a uniform
  canvas).
- **Breaks (rembg destroys the asset):**
  - `palette_colors` — rembg treated the flat-color swatches as background and
    kept only 2 of 5; the palette IS the asset, there's nothing to "remove."
  - `screenshot_dashboard` — rembg stripped the dashboard's white panel, leaving
    widgets floating on alpha; the screenshot rectangle is the asset.
- **Marginal:** the tagline-style text crops sometimes have a thin band of
  source canvas left behind.

**Design implication for the skill:** bg-removal must be conditional on the
element `type` field that Gemini already returns in discovery mode. The routing
rule that fits this evidence:

- Auto-apply rembg to: `illustration`, `sticker`, `icon`, `wordmark`
- Never apply rembg to: `palette`, `screenshot`, `typography`
- Confirm with user for: `tagline`, `other`

This makes the type field a first-class part of the protocol — Gemini's
classification doesn't just name things, it tells the pipeline which downstream
stages to run.

## Artifacts

- `artifacts/gemini_bbox.py` — named-element calling script
- `artifacts/gemini_discover.py` — auto-discovery calling script
- `artifacts/gemini_crops/*.png` — the 5 named-bbox crops + raw response
- `artifacts/gemini_discover_crops/*.png` — the 19 auto-discovered crops plus
  `*_alpha.png` variants for the bg-removal-safe types (raw response in
  `_raw_response.json`)
