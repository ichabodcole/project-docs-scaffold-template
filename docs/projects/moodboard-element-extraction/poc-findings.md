# PoC Findings — Claude Vision Bbox Precision

**Date:** 2026-05-23 **Source image:** `artifacts/tuskboard-brand-id_v02.jpg`
(1408×768)

## Hypothesis Under Test

From the investigation's recommended pipeline: _can Claude's own vision return
bounding boxes precise enough to feed directly into a crop + bg-removal stage,
skipping a dedicated grounding model (Florence-2 / Grounding DINO)?_ The
investigation predicted "loose-but-correct" boxes that bg-removal slack (~30px)
would absorb. The explicit kill criterion was: "if Claude bboxes come back
quadrant-rough rather than element-rough, ship markers-only v1."

## Method

Looking at the 1408×768 source moodboard, I (Claude Opus 4.7, viewing the image
through Read) proposed pixel bboxes for 19 distinct elements: wordmark, tagline,
dashboard mockup, color palette, typography sample, 8 icons in a 4×2 grid, the
hero mammoth illustration, and 5 sticker mammoths. Crops were produced with PIL
(`artifacts/poc_crop.py`) and inspected one-by-one against the actual element
positions.

## Result: hypothesis fails — boxes are quadrant-rough, not element-rough

Spot-checked four crops covering different element categories and image regions:

| Crop                | Proposed bbox          | What the crop actually contained                                            |
| ------------------- | ---------------------- | --------------------------------------------------------------------------- |
| `01_wordmark`       | x: 35–495, y: 25–165   | Left half of "Tuskboard" only — width clipped at "b"                        |
| `04_color_palette`  | x: 35–360, y: 240–295  | A blank tan strip from the **tagline area**, no swatches at all             |
| `06_icon_mammoth`   | x: 35–115, y: 365–450  | Empty background corner — actual icon is elsewhere                          |
| `14_hero_mammoth`   | x: 410–720, y: 305–660 | Typography sample (top) + part of the icons grid (left) + mammoth head only |
| `15_sticker_coffee` | x: 740–880, y: 320–465 | Tail of "Tasks" word + start of "New Stickers" label                        |

Pattern: vertical coordinates are systematically off (my mental model placed
elements ~50–100px higher than actual on the right half of the image), and
horizontal extents are routinely under-estimated. Errors are well beyond the
~30px slack that bg-removal could absorb.

## Implications for the skill design

1. **The Claude-direct path from the investigation is invalidated for v1.** A
   crop based on Claude's raw bboxes cannot be trusted as input to bg-removal —
   the crop would frequently not contain the intended element at all.
2. **The fallback in the investigation was correct.** Ship the **marker-mode
   v1** (user draws colored rectangles on the image, OpenCV HSV+contour extracts
   them). This is deterministic, fast, and doesn't depend on spatial reasoning
   from any model.
3. **NL mode needs a grounding model after all.** If natural-language selection
   is wanted, the investigation's deferred option becomes the right one:
   Florence-2 or Grounding DINO produce a bbox from a text prompt, optionally
   refined by SAM 2, then cropped + bg-removed. The two-model pipeline is back
   on the table.
4. **A possible middle path worth testing later:** Claude proposes a _region
   description_ ("the mammoth icon, top row, leftmost") and a grounding model
   resolves it to pixel coordinates. This could let Claude orchestrate without
   needing pixel-precise vision, while keeping the heavy lifting in a model
   designed for it.

## Recommendation

Update the proposal scope: **v1 = marker mode only.** Park NL mode behind a
grounding-model spike that uses Florence-2 (local, Apple Silicon-friendly) on a
test image; only commit to NL mode in the skill if that spike produces
element-tight boxes.

## Artifacts

- `artifacts/tuskboard-brand-id_v02.jpg` — source image

The crop script and 19 generated crops were deleted in the artifact-folder
cleanup after the experiment concluded; the result tables above capture the
evidence.
