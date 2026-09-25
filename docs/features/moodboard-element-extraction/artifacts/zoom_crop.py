"""Crop from source using a sub-grid cell range (from zoom_grid.py output)."""

from __future__ import annotations
import json
import string
import re
import sys
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
        print("usage: zoom_crop.py <source> <zoom_meta.json> <range>[:label] [more...]")
        return 2
    src = Image.open(sys.argv[1])
    meta = json.loads(Path(sys.argv[2]).read_text())
    px1, py1, px2, py2 = meta["parent_bbox"]
    sw = meta["sub_cell_w_src"]
    sh = meta["sub_cell_h_src"]
    out_dir = Path(sys.argv[1]).parent / "zoom_crops"
    out_dir.mkdir(exist_ok=True)
    for spec in sys.argv[3:]:
        parts = spec.split(":")
        if len(parts) == 3:
            rng = f"{parts[0]}:{parts[1]}"
            label = parts[2]
        elif len(parts) == 2:
            # could be A1:B2 OR A1:label
            if re.match(r"^[A-Z]+\d+$", parts[1]):
                rng = spec
                label = spec.replace(":", "-")
            else:
                rng = parts[0]
                label = parts[1]
        else:
            rng = parts[0]
            label = parts[0]
        c1, r1, c2, r2 = parse_range(rng)
        x1 = round(px1 + c1 * sw)
        y1 = round(py1 + r1 * sh)
        x2 = round(px1 + (c2 + 1) * sw)
        y2 = round(py1 + (r2 + 1) * sh)
        crop = src.crop((x1, y1, x2, y2))
        out = out_dir / f"{label}.png"
        crop.save(out)
        print(f"{label}: {rng} -> src=({x1},{y1},{x2},{y2}) size={crop.size}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
