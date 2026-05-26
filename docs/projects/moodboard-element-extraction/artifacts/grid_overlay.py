"""Overlay a labeled grid on an image so Claude can name cells instead of pixels.

Cells are labelled `<letter><number>` with letters across (columns) and numbers
down (rows), top-left = A1. The label sits in the top-left corner of each cell
in a readable font, with a thin semi-transparent grid line drawn over the
underlying image.

Output two artifacts:
  1. The grid-overlaid image (PNG)
  2. A small JSON sidecar with the grid geometry so the caller can translate
     cell labels back to source pixel coordinates.
"""

from __future__ import annotations
import argparse
import json
import string
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

def col_label(idx: int) -> str:
    """0 -> A, 25 -> Z, 26 -> AA, ..."""
    s = ""
    n = idx
    while True:
        s = string.ascii_uppercase[n % 26] + s
        n = n // 26 - 1
        if n < 0:
            break
    return s

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("src", type=Path)
    ap.add_argument("--cols", type=int, default=14)
    ap.add_argument("--rows", type=int, default=8)
    ap.add_argument("--out", type=Path, default=None)
    ap.add_argument("--line-color", default="#00d0ff")  # cyan — none of the moodboard uses it
    ap.add_argument("--line-alpha", type=int, default=140)
    ap.add_argument("--label-fontsize", type=int, default=18)
    args = ap.parse_args()

    src = Image.open(args.src).convert("RGBA")
    w, h = src.size
    cell_w = w / args.cols
    cell_h = h / args.rows

    overlay = Image.new("RGBA", src.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Build colour with alpha
    lc = args.line_color.lstrip("#")
    line_rgba = (int(lc[0:2], 16), int(lc[2:4], 16), int(lc[4:6], 16), args.line_alpha)

    # Vertical lines
    for c in range(1, args.cols):
        x = round(c * cell_w)
        draw.line([(x, 0), (x, h)], fill=line_rgba, width=1)
    # Horizontal lines
    for r in range(1, args.rows):
        y = round(r * cell_h)
        draw.line([(0, y), (w, y)], fill=line_rgba, width=1)

    # Labels — try to use a real font; fall back to default.
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", args.label_fontsize)
    except OSError:
        font = ImageFont.load_default()

    for r in range(args.rows):
        for c in range(args.cols):
            label = f"{col_label(c)}{r + 1}"
            x = round(c * cell_w) + 4
            y = round(r * cell_h) + 2
            # White text with a 1px black halo, semi-transparent so it
            # disturbs the underlying image less.
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                draw.text((x + dx, y + dy), label, font=font, fill=(0, 0, 0, 200))
            draw.text((x, y), label, font=font, fill=(255, 255, 255, 230))

    out = src.copy()
    out.alpha_composite(overlay)
    out_path = args.out or args.src.with_name(args.src.stem + "-grid.png")
    out.convert("RGB").save(out_path, optimize=True)

    sidecar = {
        "source": args.src.name,
        "width": w,
        "height": h,
        "cols": args.cols,
        "rows": args.rows,
        "cell_w": cell_w,
        "cell_h": cell_h,
    }
    sidecar_path = out_path.with_suffix(".json")
    sidecar_path.write_text(json.dumps(sidecar, indent=2))
    print(f"Wrote {out_path.name} and {sidecar_path.name}")
    print(f"  {args.cols} cols x {args.rows} rows; cell ~{cell_w:.1f}x{cell_h:.1f}px")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
