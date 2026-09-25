"""Gemini-via-OpenRouter bbox extraction PoC.

Asks Gemini to localize each named element in the moodboard, returning bboxes
in Google's documented [0..1000] normalized coordinate system. Translates to
source pixels and writes one crop per element. Optionally runs rembg on each
crop for a bg-removed alpha variant.

Usage:
  export OPENROUTER_API_KEY=...
  python3 gemini_bbox.py <image> <element1> [<element2> ...]
  # or
  python3 gemini_bbox.py <image> --model google/gemini-2.5-flash --out gemini_crops/

Output: <image_dir>/gemini_crops/<element>.png plus a JSON sidecar with
the raw model response for forensic comparison.
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

PROMPT_TEMPLATE = """Identify the location of each of the following elements in this image. \
For each element, return a bounding box using Google's normalized coordinate system \
where the image is [0, 1000] on both axes (0,0 is top-left; 1000,1000 is bottom-right). \
Bbox format: [y_min, x_min, y_max, x_max] — this is Gemini's documented convention.

Return ONLY a JSON array, no prose, in this exact shape:
[
  {{"name": "<element_name>", "box_2d": [y_min, x_min, y_max, x_max]}}
]

If an element is not in the image, return its name with box_2d set to null.

Elements to locate:
{elements}
"""

def encode_image_data_url(path: Path) -> str:
    mime = "image/jpeg" if path.suffix.lower() in {".jpg", ".jpeg"} else "image/png"
    b64 = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{b64}"

def call_openrouter(api_key: str, model: str, image_data_url: str, prompt: str) -> dict:
    body = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_data_url}},
                ],
            }
        ],
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
            return json.loads(resp.read().decode("utf-8"))
    except error.HTTPError as e:
        body_text = e.read().decode("utf-8", errors="replace")
        raise SystemExit(f"OpenRouter {e.code}: {body_text}") from None

def parse_bboxes_from_content(content: str) -> list[dict]:
    """Gemini sometimes wraps JSON in ```json fences; strip them."""
    s = content.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)\s*```", s, re.DOTALL)
    if fence:
        s = fence.group(1)
    return json.loads(s)

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("image", type=Path)
    ap.add_argument("elements", nargs="+")
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
    print(f"Model:  {args.model}")
    print(f"Elements ({len(args.elements)}): {', '.join(args.elements)}")
    print()

    image_url = encode_image_data_url(args.image)
    elements_block = "\n".join(f"- {e}" for e in args.elements)
    prompt = PROMPT_TEMPLATE.format(elements=elements_block)

    resp = call_openrouter(api_key, args.model, image_url, prompt)
    content = resp["choices"][0]["message"]["content"]

    usage = resp.get("usage", {})
    cost = usage.get("cost")
    pt = usage.get("prompt_tokens", 0)
    ct = usage.get("completion_tokens", 0)
    reasoning = usage.get("completion_tokens_details", {}).get("reasoning_tokens", 0)
    cost_str = f"${cost:.6f}" if cost is not None else "(not reported)"
    print(f"Cost: {cost_str}  |  Tokens: prompt={pt}, completion={ct} (reasoning={reasoning})")
    print()

    try:
        bboxes = parse_bboxes_from_content(content)
    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON from model response:\n{content}\n\nError: {e}", file=sys.stderr)
        return 1

    out_dir = args.out or args.image.parent / "gemini_crops"
    out_dir.mkdir(exist_ok=True)
    raw_path = out_dir / "_raw_response.json"
    raw_path.write_text(json.dumps({
        "model": args.model,
        "prompt": prompt,
        "response": resp,
        "parsed_bboxes": bboxes,
    }, indent=2))

    for entry in bboxes:
        name = entry.get("name", "unknown")
        box = entry.get("box_2d")
        if box is None:
            print(f"{name}: not found by model")
            continue
        y1, x1, y2, x2 = box
        px1 = round(x1 / 1000 * W)
        py1 = round(y1 / 1000 * H)
        px2 = round(x2 / 1000 * W)
        py2 = round(y2 / 1000 * H)
        px1, py1 = max(0, px1), max(0, py1)
        px2, py2 = min(W, px2), min(H, py2)
        crop = src.crop((px1, py1, px2, py2))
        out_path = out_dir / f"{name}.png"
        crop.save(out_path)
        print(f"{name}: normalized={box} src=({px1},{py1},{px2},{py2}) size={crop.size}")

    print(f"\nSaved crops + raw response to {out_dir}/")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
