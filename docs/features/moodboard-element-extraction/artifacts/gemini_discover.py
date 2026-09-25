"""Ask Gemini to *discover* all extractable elements in a moodboard.

Variation on gemini_bbox.py — no element names provided. Gemini decides
what counts as a distinct extractable element, names each, and returns
bboxes.
"""

from __future__ import annotations
import argparse
import base64
import json
import os
import re
import sys
from pathlib import Path
from urllib import request, error

from PIL import Image

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "google/gemini-3.5-flash"

PROMPT = """Identify every distinct extractable visual element in this image. \
"Distinct extractable" means: a single visually-coherent asset a designer would \
want to pull out as its own file — a logo, an icon, a sticker, a color swatch \
row, a piece of cover art, a UI screenshot. Do NOT include background or texture.

For each element, return a bounding box using Google's normalized coordinate \
system (image is [0, 1000] on both axes, 0,0 top-left) in the documented order: \
[y_min, x_min, y_max, x_max].

Return ONLY a JSON array, no prose, in this exact shape:
[
  {"name": "<short_snake_case_name>", "type": "<one of: wordmark, tagline, icon, illustration, sticker, palette, typography, screenshot, other>", "box_2d": [y_min, x_min, y_max, x_max]}
]

Use distinctive snake_case names; if there are multiple of the same kind, \
differentiate them (e.g. icon_mammoth, icon_gear, sticker_coffee, sticker_skateboard).
"""

def encode_image_data_url(path: Path) -> str:
    mime = "image/jpeg" if path.suffix.lower() in {".jpg", ".jpeg"} else "image/png"
    b64 = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{b64}"

def parse_bboxes(content: str) -> list[dict]:
    s = content.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)\s*```", s, re.DOTALL)
    if fence:
        s = fence.group(1)
    return json.loads(s)

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("image", type=Path)
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--out", type=Path, default=None)
    args = ap.parse_args()

    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        print("ERROR: OPENROUTER_API_KEY env var not set", file=sys.stderr)
        return 2

    src = Image.open(args.image)
    W, H = src.size
    print(f"Source: {args.image.name} ({W}×{H})")
    print(f"Model:  {args.model}\n")

    body = {
        "model": args.model,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": PROMPT},
                {"type": "image_url", "image_url": {"url": encode_image_data_url(args.image)}},
            ],
        }],
        "temperature": 0,
    }
    req = request.Request(
        OPENROUTER_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/anthropics/project-docs",
            "X-Title": "moodboard-extractor PoC",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except error.HTTPError as e:
        raise SystemExit(f"OpenRouter {e.code}: {e.read().decode('utf-8', errors='replace')}")

    content = data["choices"][0]["message"]["content"]

    usage = data.get("usage", {})
    cost = usage.get("cost")
    pt = usage.get("prompt_tokens", 0)
    ct = usage.get("completion_tokens", 0)
    reasoning = usage.get("completion_tokens_details", {}).get("reasoning_tokens", 0)
    cost_str = f"${cost:.6f}" if cost is not None else "(not reported)"
    print(f"Cost: {cost_str}  |  Tokens: prompt={pt}, completion={ct} (reasoning={reasoning})\n")

    try:
        bboxes = parse_bboxes(content)
    except json.JSONDecodeError as ex:
        print(f"Failed to parse JSON:\n{content}\n\nError: {ex}", file=sys.stderr)
        return 1

    out_dir = args.out or args.image.parent / "gemini_discover_crops"
    out_dir.mkdir(exist_ok=True)
    (out_dir / "_raw_response.json").write_text(json.dumps({
        "model": args.model,
        "prompt": PROMPT,
        "response": data,
        "parsed": bboxes,
    }, indent=2))

    print(f"Gemini discovered {len(bboxes)} elements:\n")
    for entry in bboxes:
        name = entry.get("name", "unknown")
        kind = entry.get("type", "?")
        box = entry.get("box_2d")
        if box is None:
            print(f"  {name} ({kind}): no box")
            continue
        y1, x1, y2, x2 = box
        px1 = max(0, round(x1 / 1000 * W))
        py1 = max(0, round(y1 / 1000 * H))
        px2 = min(W, round(x2 / 1000 * W))
        py2 = min(H, round(y2 / 1000 * H))
        crop = src.crop((px1, py1, px2, py2))
        out_path = out_dir / f"{name}.png"
        crop.save(out_path)
        print(f"  {name} ({kind}): src=({px1},{py1},{px2},{py2}) size={crop.size}")

    print(f"\nSaved to {out_dir}/")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
