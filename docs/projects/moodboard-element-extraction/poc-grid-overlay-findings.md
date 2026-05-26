# PoC Findings — Grid Overlay for Coordinate Constraint

**Date:** 2026-05-23 **Source image:** `artifacts/tuskboard-brand-id_v02.jpg`
(1408×768)

## Hypothesis Under Test

Cole's idea: instead of asking Claude to report arbitrary pixel coordinates
(which the first PoC proved unreliable — bboxes came back quadrant-rough), draw
a labeled grid on top of the image and ask Claude to name the cells containing
each element. This converts a spatial-reasoning task into an OCR + cell-naming
task, which Claude is genuinely good at. The cell quantization becomes the slack
budget.

## Method

1. Generated a `7×4` grid overlay on the moodboard (`grid_overlay.py`). Cyan
   semi-transparent grid lines, large white-on-black labels (`A1`, `B1`, …,
   `G4`) in each cell corner. Cell size: ~201×192px.
2. As Claude (Opus 4.7, same model that previously fumbled the pixel-bbox task),
   I read the overlaid image and named the cells containing the same 5 elements
   I previously failed to localize.
3. `grid_crop.py` translated each cell range to pixel coordinates using the
   saved grid metadata and produced a crop.
4. Inspected each crop against the intended element.

## Result: hypothesis confirmed — 5/5 crops contain the target element

| Element        | Predicted range | Result                                                                         |
| -------------- | --------------- | ------------------------------------------------------------------------------ |
| wordmark       | `A1:D1`         | ✅ Full "Tuskboard" captured cleanly                                           |
| color_palette  | `A2:B2`         | ⚠️ Swatches present, but neighbor includes tagline + "New Color Palette" label |
| icon_mammoth   | `A3`            | ⚠️ Target icon present, plus part of palette row above + adjacent icons        |
| hero_mammoth   | `C3:D4`         | ✅ Full illustration; minor neighbor content (Mammoth Script text, side icons) |
| sticker_coffee | `E3`            | ✅ Full coffee-sticker captured, tight                                         |

Compare to the previous PoC at element-precise bboxes (`poc-findings.md`):
**0/5** crops contained the intended element. The grid approach got **5/5**
correct at cell granularity.

First attempt with a `14×8` grid (smaller cells, smaller labels) **failed 3/3
spot checks** — the labels became too small for the vision pass to read reliably
at typical downsample resolution. Labels need to be large; the heuristic that
worked was font size ≈ ⅓ of the shortest cell dimension.

A follow-up tried **scaling the source 2× before grid overlay** to see if
absolute label pixel size could compensate for grid density. It didn't: a `14×8`
grid on the 2× scaled image (2816×1536) still failed a spot-check on
`icon_mammoth`, returning a crop of color swatches instead of the icon. The
reason: Claude vision resizes input images internally; the model's effective
canvas is the same whether the source is 1× or 2×. Source-side upscaling is not
a substitute for grid density discipline. **What matters is the label-to-cell
ratio (and absolute cell size relative to the model's effective vision
resolution), not source pixel count.** This pushes the design toward the
hierarchical refinement approach below rather than denser initial grids.

A second follow-up tried **denser grid + much bigger labels** at original source
resolution: `14×8` grid (cells 100×96px) with 48pt labels (~50% of cell height,
occupying the top-left corner of each cell but leaving cell interiors visible).
Result was meaningfully better than the original 14×8 attempt — labels became
readable — but still less reliable than the coarse 7×4. Spot-checks:

- `hero_mammoth` (`E5:G8`) — ✅ tighter than 7×4 equivalent
- `icon_mammoth` (`B6`) — ⚠️ off by one row, got partial icon + gear neighbor
- `sticker_coffee` (`H5:I6`) — ❌ off by 1-2 columns, got hero-mammoth backpack
  instead of sticker

The failure mode shifted: at 7×4 I was confidently right about coarse cells; at
14×8 I read the labels but my mental model of "which exact cell is this element
in" was sloppy with 112 cells to pick from. **Bigger labels solve readability
but introduce the targeting-precision problem of denser grids.**

## Mechanism

Two factors made this work where direct bbox prediction failed:

1. **Discrete answer space.** Naming 1 of 28 labeled cells is fundamentally
   different from emitting 4 floating-point pixel coordinates. The constrained
   answer space transforms the cognitive task from spatial-precision reasoning
   (weak) to pattern-anchored cell identification (strong).
2. **Quantization as deliberate slack.** A cell-sized bbox is intentionally
   loose, but rectangular and aligned with the same grid the prompt resolved
   against. If the model says "C3:D4" and the actual element is anywhere in that
   2×2 cell block, the crop is correct. The error term is bounded by one cell
   width, which is tunable via grid density.

## Implications for the skill design

This is a credible **v2 mode** alongside the marker-mode v1. The architecture:

```
                ┌─→ marker mode: user draws rects → OpenCV detect → crop
extract.py  ─→ ─┤
                └─→ grid mode (v2): overlay grid → ask Claude → re-grid?  → crop
```

**Hierarchical refinement** is the natural escalation for tighter cropping:

1. Overlay coarse grid (e.g., 5×3 with very large labels).
2. Ask Claude for the cells containing each named element.
3. For elements where the cell-range is "loose enough that neighbors get
   included," crop to the cell-range region, overlay a finer grid on JUST that
   region, re-prompt.
4. Repeat until the crop is tight or a step budget is reached.
5. Optional: bg-removal pass cleans up uniform-background neighbor content (the
   tan canvas pixels around an icon disappear; nearby labels remain).

The marker-mode pipeline is still simpler and more deterministic — it's the
right v1. Grid-mode becomes the "I don't want to mark anything, just extract the
mammoth" path, with marker-mode as the precision fallback.

## Hierarchical refinement test (the "ENHANCE" pass)

Tested the natural escalation: take the loose `icon_mammoth` cell from the 7×4
step (`A3:B4`, region containing the 8-icon grid + label + bottom of palette),
zoom into that region (3.5× upscale to a 1400-long-side working canvas), overlay
a `4×3` sub-grid, identify the cell containing each individual icon, crop using
the sub-cell-to-source coordinate mapping.

After two iterations (initial 4×2 grid sub-row alignment was wrong; redone with
4×3), I correctly named the cell containing each icon I asked for. However the
crops weren't pixel-tight:

| Icon         | Sub-cell | Result                                                  |
| ------------ | -------- | ------------------------------------------------------- |
| icon_mammoth | `B2`     | Full mammoth + slice of gear icon on right edge         |
| icon_gear    | `C2`     | Full gear + slice of calendar icon on right edge        |
| icon_kanban  | `B3`     | Kanban + slice of people icon                           |
| icon_flag    | `D3`     | Only a fragment of the flag (content alignment was off) |

The diagnosis: this is a **content-alignment problem, not a model-precision
problem**. The grid is uniform but the icons aren't perfectly aligned to it —
each icon sits in the left portion of its sub-cell with the next icon's left
edge intruding from the right. The grid approach has a hard floor of "one cell"
precision. For tightly-packed uniform layouts (icon grids, color swatch strips),
additional refinement iterations help up to a point but never fully resolve the
alignment mismatch.

## Updated v2 design conclusion

The grid mode and marker mode are **complementary**, not competing:

- **Grid mode wins** for large well-spaced elements (mascots, stickers,
  dashboards, wordmarks). Zero user input needed — just an agent prompt.
- **Marker mode wins** for tightly-packed uniform layouts (8 icons in a 4×2
  grid, palette swatch strips). User intuition about element boundaries plus one
  marker drag per element is more efficient than iterative grid refinement and
  produces pixel-tight crops.

The v2 skill could route automatically: if the agent's first pass at the grid
identifies the elements as "tightly clustered," it asks the user to mark them;
otherwise it proceeds zero-touch.

A third hybrid worth considering: after a grid pass produces a rough crop, run
`rembg` on the crop, then trim to the resulting alpha bbox to auto-tighten
content edges. Works when neighbors are uniform background (tan canvas in this
moodboard); fails when neighbors are also opaque content (like the adjacent
icons here).

## Open questions for the v2 spike

- **Optimal initial grid density?** Coarser is more readable but quantizes
  larger; finer is tighter but harder to read. The validated `7×4` is a decent
  default for ~1500×800 images; needs calibration for other shapes.
- **How aggressive should refinement be?** Each refinement step is one extra
  vision read. Two-level (coarse → fine within named region) probably captures
  most of the win without runaway cost.
- **Should the grid use letters+numbers (A1) or pure numbers (1,1)?** A1-style
  matches spreadsheet convention and may benefit from training data exposure;
  worth A/B testing once we're in a position to measure.
- **Are there pathological cases?** Elements that span unusual cell shapes (long
  thin row, oddly placed), heavily overlapping elements, elements positioned
  exactly on a grid line. Tests on more diverse moodboards needed before
  committing to this as a default.
- **Interaction with the nano-banana auto-marker idea?** The grid approach and
  auto-marker approach now look like alternatives, not complements. Pick one for
  v2 based on follow-up evaluation.

## Artifacts

- `artifacts/grid_overlay.py` — grid synthesis tool with sidecar JSON
- `artifacts/grid_crop.py` — cell-range to pixel-coord cropping
- `artifacts/zoom_grid.py` — hierarchical-refinement helper (zoom + sub-grid)
- `artifacts/zoom_crop.py` — sub-cell-range to pixel-coord cropping
- `artifacts/tuskboard-grid-7x4.{png,json}` — the working coarse overlay +
  geometry
- `artifacts/grid_crops_7x4/*.png` — the 5 coarse-pass validation crops
- `artifacts/zoom-A3-B4-4x3.{png,json}` — the working hierarchical-refinement
  zoom (icon-grid region, 4×3 sub-grid) + geometry
- `artifacts/zoom_crops/icon_*_refined.png` — the 4 hierarchical-refinement icon
  crops

Failed-experiment artifacts (dense 14×8 grids, 2× source scaling, the misaligned
4×2 sub-grid attempt, synthetic detector test inputs) were removed in the
artifact-folder cleanup; the result tables above capture the evidence.
