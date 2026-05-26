"""Marker-mode detection PoC.

Algorithm:
  1. Load marked image, threshold in HSV for the marker colour (red).
  2. Close gaps in the marker outlines (dilation) so a thin hand-drawn rectangle
     becomes a closed contour.
  3. Find external contours; filter by area + 4-corner approx polygon.
  4. Get axis-aligned bounding box for each.
  5. Crop the INTERIOR of each rect from the clean source (one inset pixel
     past the marker thickness) so the output never contains red marker.

Usage:
  python3 mark_detect.py <marked.jpg> [--clean <clean.jpg>] [--out <dir>]

If --clean is omitted, crops come from the marked image with a larger inset
to push the crop window inside the marker lines.
"""

from __future__ import annotations
import argparse
import sys
from pathlib import Path

import cv2
import numpy as np

# HSV ranges for a bright red marker. Tight — moodboard contains warm browns
# and a muted orange swatch that we must NOT pick up. Marker is RGB(220,30,30),
# which in OpenCV HSV is H~0, S~218, V~220 — very saturated.
RED_LOW_1 = np.array([0, 170, 120])
RED_HIGH_1 = np.array([10, 255, 255])
RED_LOW_2 = np.array([170, 170, 120])
RED_HIGH_2 = np.array([180, 255, 255])

MIN_AREA = 3000          # ignore tiny noise rectangles
ASPECT_MIN = 0.15        # reject extremely thin slivers
ASPECT_MAX = 8.0
INTERIOR_INSET = 6       # px to crop INWARD from detected bbox edges

def detect_rects(marked_bgr: np.ndarray) -> list[tuple[int, int, int, int]]:
    """Return list of (x1, y1, x2, y2) rectangles detected from red markers."""
    hsv = cv2.cvtColor(marked_bgr, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, RED_LOW_1, RED_HIGH_1) | cv2.inRange(hsv, RED_LOW_2, RED_HIGH_2)

    # Tiny close to seal pixel-level corner gaps; deliberately small so we
    # don't bridge neighbouring rectangles into a single contour.
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)

    # Rectangle outlines are hollow → use RETR_LIST and rely on the contour
    # filter below. (RETR_EXTERNAL would only return the outer perimeter, which
    # for hollow rects is identical to RETR_LIST plus children, but we filter
    # by area anyway.)
    contours, _hier = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    rects: list[tuple[int, int, int, int]] = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if w * h < MIN_AREA:
            continue
        aspect = w / max(h, 1)
        if aspect < ASPECT_MIN or aspect > ASPECT_MAX:
            continue
        # Hollow-rectangle check using the MASK: count red pixels inside the
        # bbox. A hand-drawn rectangle outline covers only ~2*(w+h)*thickness
        # pixels, so the ratio of red pixels to bbox area is small (typically
        # <0.10 for a 4px-thick outline on a moderately-sized box). A filled
        # red blob would be near 1.0.
        red_pixels = int(cv2.countNonZero(mask[y:y + h, x:x + w]))
        fill_ratio = red_pixels / (w * h)
        if fill_ratio > 0.5:
            continue
        rects.append((x, y, x + w, y + h))

    # Sort top-to-bottom, then left-to-right, for stable numbering.
    rects.sort(key=lambda r: (r[1] // 20, r[0]))
    return rects

def crop_interior(img: np.ndarray, rect: tuple[int, int, int, int], inset: int) -> np.ndarray:
    h, w = img.shape[:2]
    x1, y1, x2, y2 = rect
    x1 = max(0, x1 + inset)
    y1 = max(0, y1 + inset)
    x2 = min(w, x2 - inset)
    y2 = min(h, y2 - inset)
    return img[y1:y2, x1:x2]

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("marked", type=Path, help="Path to marked-up image")
    ap.add_argument("--clean", type=Path, default=None, help="Optional clean source image")
    ap.add_argument("--out", type=Path, default=None, help="Output directory")
    args = ap.parse_args()

    marked = cv2.imread(str(args.marked))
    if marked is None:
        print(f"Could not read {args.marked}", file=sys.stderr)
        return 2

    clean = cv2.imread(str(args.clean)) if args.clean else marked
    if clean is None:
        print(f"Could not read {args.clean}", file=sys.stderr)
        return 2

    out_dir = args.out or args.marked.parent / "marker_crops"
    out_dir.mkdir(exist_ok=True)

    rects = detect_rects(marked)
    print(f"Detected {len(rects)} rectangles")

    for i, rect in enumerate(rects, start=1):
        crop = crop_interior(clean, rect, INTERIOR_INSET)
        out_path = out_dir / f"crop_{i:02d}.png"
        cv2.imwrite(str(out_path), crop)
        print(f"  {i:02d}: bbox={rect} size={crop.shape[1]}x{crop.shape[0]} -> {out_path.name}")

    return 0

if __name__ == "__main__":
    raise SystemExit(main())
