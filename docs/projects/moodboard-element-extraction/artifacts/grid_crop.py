"""Crop a source image based on cell-range predictions from a grid overlay.

Usage:
  python3 grid_crop.py <source> <grid.json> <range1:label1> [range2:label2 ...]

Cell ranges follow A1:E2 syntax (inclusive). A single cell like A5 is also OK.
"""

from __future__ import annotations
import json
import string
import sys
import re
from pathlib import Path

from PIL import Image

def col_idx(letters: str) -> int:
    n = 0
    for ch in letters.upper():
        n = n * 26 + (string.ascii_uppercase.index(ch) + 1)
    return n - 1

def parse_cell(cell: str) -> tuple[int, int]:
    m = re.match(r"^([A-Z]+)(\d+)$", cell.upper())
    if not m:
        raise ValueError(f"bad cell: {cell}")
    return col_idx(m.group(1)), int(m.group(2)) - 1

def parse_range(rng: str) -> tuple[int, int, int, int]:
    if ":" in rng:
        a, b = rng.split(":")
    else:
        a = b = rng
    c1, r1 = parse_cell(a)
    c2, r2 = parse_cell(b)
    return min(c1, c2), min(r1, r2), max(c1, c2), max(r1, r2)

def main() -> int:
    if len(sys.argv) < 4:
        print(__doc__)
        return 2
    src_path = Path(sys.argv[1])
    grid_meta = json.loads(Path(sys.argv[2]).read_text())
    cw, ch = grid_meta["cell_w"], grid_meta["cell_h"]
    W, H = grid_meta["width"], grid_meta["height"]

    img = Image.open(src_path)
    out_dir = src_path.parent / "grid_crops"
    out_dir.mkdir(exist_ok=True)

    for spec in sys.argv[3:]:
        rng, _, label = spec.partition(":")
        if not label:
            label = rng.replace(":", "-")
        # If spec has 3+ colons (e.g. "A1:E2:wordmark"), split differently
        if rng.count(":") == 0 and ":" in spec:
            # Already split correctly above
            pass
        # Heuristic: handle A1:E2:wordmark
        parts = spec.split(":")
        if len(parts) == 3:
            rng = f"{parts[0]}:{parts[1]}"
            label = parts[2]
        c1, r1, c2, r2 = parse_range(rng)
        x1 = round(c1 * cw)
        y1 = round(r1 * ch)
        x2 = round((c2 + 1) * cw)
        y2 = round((r2 + 1) * ch)
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(W, x2), min(H, y2)
        crop = img.crop((x1, y1, x2, y2))
        out_path = out_dir / f"{label}.png"
        crop.save(out_path)
        print(f"{label}: {rng} -> bbox=({x1},{y1},{x2},{y2}) size={crop.size}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
