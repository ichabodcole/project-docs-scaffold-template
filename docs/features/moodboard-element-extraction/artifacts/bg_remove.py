"""Run rembg on one crop to validate the bg-removal stage of the pipeline."""

import sys
from pathlib import Path
from rembg import remove
from PIL import Image

def main() -> int:
    if len(sys.argv) < 2:
        print("usage: bg_remove.py <input.png> [output.png]")
        return 2
    inp = Path(sys.argv[1])
    outp = Path(sys.argv[2]) if len(sys.argv) > 2 else inp.with_name(inp.stem + "_alpha.png")
    img = Image.open(inp)
    cut = remove(img)
    cut.save(outp)
    print(f"{inp.name} -> {outp.name}  size={cut.size}  mode={cut.mode}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
