"""
split_shard.py -- split a multi-piece shard PNG into separate single-fragment
PNGs by connected-component labelling on the alpha channel.

Each fully-separated blob (a crystal piece + its glow) becomes its own cropped
RGBA file, so a "cluster" sprite can be orbited as independent fragments.

Usage:
    python scripts/split_shard.py <src.png> <out_dir> <prefix> [alpha_thresh] [min_area]
"""

import sys
from pathlib import Path
from collections import deque
from PIL import Image


def split(src_path, out_dir, prefix, alpha_thresh=16, min_area=150):
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    px = img.load()

    inmask = [[px[x, y][3] > alpha_thresh for x in range(w)] for y in range(h)]
    seen = [[False] * w for _ in range(h)]
    comps = []

    for y in range(h):
        for x in range(w):
            if inmask[y][x] and not seen[y][x]:
                q = deque([(x, y)])
                seen[y][x] = True
                pts = []
                while q:
                    cx, cy = q.popleft()
                    pts.append((cx, cy))
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < w and 0 <= ny < h and inmask[ny][nx] and not seen[ny][nx]:
                                seen[ny][nx] = True
                                q.append((nx, ny))
                if len(pts) >= min_area:
                    comps.append(pts)

    comps.sort(key=len, reverse=True)
    print(f"Source {Path(src_path).name} {w}x{h}: found {len(comps)} pieces "
          f"(alpha>{alpha_thresh}, area>={min_area}) sizes={[len(c) for c in comps]}")

    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    saved = []
    for i, pts in enumerate(comps):
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        l, r, t, b = min(xs), max(xs), min(ys), max(ys)
        cw, ch = r - l + 1, b - t + 1
        out = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        op = out.load()
        for (cx, cy) in pts:
            op[cx - l, cy - t] = px[cx, cy]
        p = out_dir / f"{prefix}_{i}.png"
        out.save(str(p))
        saved.append(p)
        print(f"  piece {i}: {cw}x{ch}  bbox=({l},{t},{r},{b}) -> {p.name}")
    return saved


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python scripts/split_shard.py <src.png> <out_dir> <prefix> [alpha_thresh] [min_area]")
        sys.exit(1)
    src, out_dir, prefix = sys.argv[1], sys.argv[2], sys.argv[3]
    at = int(sys.argv[4]) if len(sys.argv) > 4 else 16
    ma = int(sys.argv[5]) if len(sys.argv) > 5 else 150
    split(src, out_dir, prefix, at, ma)
