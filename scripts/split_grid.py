"""
split_grid.py - Split a 2x2 candidate grid image into 4 separate PNGs.

Useful for PixelLab outputs that come back as a single 2x2 grid of candidates.

Usage:
  python scripts/split_grid.py <input.png> [output_dir]

Outputs (next to the input, or in output_dir):
  <name>_0.png  top-left
  <name>_1.png  top-right
  <name>_2.png  bottom-left
  <name>_3.png  bottom-right
"""

import sys
from pathlib import Path
from PIL import Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/split_grid.py <input.png> [output_dir]")
        return

    src = Path(sys.argv[1])
    if not src.exists():
        print(f"Input not found: {src}")
        return

    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else src.parent
    out_dir.mkdir(parents=True, exist_ok=True)

    img = Image.open(src).convert("RGBA")
    w, h = img.size
    hw, hh = w // 2, h // 2

    # (left, upper, right, lower) for each quadrant
    boxes = [
        (0,  0,  hw, hh),   # 0 top-left
        (hw, 0,  w,  hh),   # 1 top-right
        (0,  hh, hw, h),    # 2 bottom-left
        (hw, hh, w,  h),    # 3 bottom-right
    ]

    stem = src.stem
    for i, box in enumerate(boxes):
        out = out_dir / f"{stem}_{i}.png"
        img.crop(box).save(str(out))
        print(f"  cand {i}: {out.name}  ({box[2] - box[0]}x{box[3] - box[1]})")

    print(f"Done. Split {w}x{h} grid into 4 quadrants in {out_dir}")


if __name__ == "__main__":
    main()
