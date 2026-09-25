"""Zoom into a named region of the source image, then overlay a fresh grid.

Hierarchical-refinement helper. Step 1 names a coarse cell range; step 2
crops that range from the source, upscales it to a usable working canvas
(~1500px on the long side), and overlays a finer grid for tighter naming.

Usage:
  python3 zoom_grid.py <source> <grid_meta.json> <cell_range> --sub-cols N --sub-rows M
"""

from __future__ import annotations
import argparse
import json
import re
import string
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

def col_idx(letters: str) -> int:
    n = 0
    for ch in letters.upper():
        n = n * 26 + (string.ascii_uppercase.index(ch) + 1)
    return n - 1

def col_label(idx: int) -> str:
    s = ""
    n = idx
    while True:
        s = string.ascii_uppercase[n % 26] + s
        n = n // 26 - 1
        if n < 0:
            break
    return s

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
    ap = argparse.ArgumentParser()
    ap.add_argument("src", type=Path)
    ap.add_argument("meta", type=Path, help="grid metadata json")
    ap.add_argument("cell_range", help="e.g. A3:B4")
    ap.add_argument("--sub-cols", type=int, default=4)
    ap.add_argument("--sub-rows", type=int, default=2)
    ap.add_argument("--target-long-side", type=int, default=1400)
    ap.add_argument("--label-fontsize", type=int, default=56)
    ap.add_argument("--out", type=Path, default=None)
    args = ap.parse_args()

    meta = json.loads(args.meta.read_text())
    cw, ch = meta["cell_w"], meta["cell_h"]
    src = Image.open(args.src).convert("RGB")
    c1, r1, c2, r2 = parse_range(args.cell_range)
    x1 = round(c1 * cw)
    y1 = round(r1 * ch)
    x2 = round((c2 + 1) * cw)
    y2 = round((r2 + 1) * ch)
    crop = src.crop((x1, y1, x2, y2))
    cw0, ch0 = crop.size

    scale = args.target_long_side / max(cw0, ch0)
    new_w = round(cw0 * scale)
    new_h = round(ch0 * scale)
    zoomed = crop.resize((new_w, new_h), Image.LANCZOS).convert("RGBA")
    overlay = Image.new("RGBA", zoomed.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    sub_cw = new_w / args.sub_cols
    sub_ch = new_h / args.sub_rows
    line_rgba = (0, 208, 255, 160)
    for c in range(1, args.sub_cols):
        x = round(c * sub_cw)
        draw.line([(x, 0), (x, new_h)], fill=line_rgba, width=2)
    for r in range(1, args.sub_rows):
        y = round(r * sub_ch)
        draw.line([(0, y), (new_w, y)], fill=line_rgba, width=2)

    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", args.label_fontsize)
    except OSError:
        font = ImageFont.load_default()

    for r in range(args.sub_rows):
        for c in range(args.sub_cols):
            label = f"{col_label(c)}{r + 1}"
            lx = round(c * sub_cw) + 8
            ly = round(r * sub_ch) + 4
            for dx, dy in [(-2, 0), (2, 0), (0, -2), (0, 2)]:
                draw.text((lx + dx, ly + dy), label, font=font, fill=(0, 0, 0, 220))
            draw.text((lx, ly), label, font=font, fill=(255, 255, 255, 240))

    out = zoomed.copy()
    out.alpha_composite(overlay)
    out_path = args.out or args.src.parent / f"zoom-{args.cell_range.replace(':','-')}-{args.sub_cols}x{args.sub_rows}.png"
    out.convert("RGB").save(out_path, optimize=True)

    sidecar = {
        "source": args.src.name,
        "parent_range": args.cell_range,
        "parent_bbox": [x1, y1, x2, y2],
        "zoomed_size": [new_w, new_h],
        "scale": scale,
        "sub_cols": args.sub_cols,
        "sub_rows": args.sub_rows,
        "sub_cell_w_src": (x2 - x1) / args.sub_cols,
        "sub_cell_h_src": (y2 - y1) / args.sub_rows,
    }
    sidecar_path = out_path.with_suffix(".json")
    sidecar_path.write_text(json.dumps(sidecar, indent=2))
    print(f"Wrote {out_path.name}")
    print(f"  parent bbox src=({x1},{y1},{x2},{y2}) size={cw0}x{ch0}")
    print(f"  zoomed to {new_w}x{new_h} (scale {scale:.2f}x)")
    print(f"  sub-grid {args.sub_cols}x{args.sub_rows}, sub-cell ~{sub_cw:.0f}x{sub_ch:.0f} px in zoom")
    print(f"  in source coords each sub-cell is {sidecar['sub_cell_w_src']:.1f}x{sidecar['sub_cell_h_src']:.1f}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
