"""
gen_particle_mask.py -- convert a coloured qi particle PNG into colour-neutral
mask variants for the CSS mask-image + background-color dynamic tinting pipeline.

Material model:
  primary   layer -- outer body pixels. Tint with --primary-color.
  secondary layer -- inner accent ring (brighter colored pixels). Tint with --secondary-color.
  shine     layer -- specular highlight pixels (bright AND near-white). Always
                     renders the original baked pixel colour via background-image.

Shine detection (v2):
  Old: if L >= shine_lo (pure luminance threshold).
  New: if L >= shine_lum_lo AND spread(R,G,B) <= shine_spread_max.

  Spread = max(R,G,B) - min(R,G,B). Low spread = near-white / near-grey.
  High spread = saturated colour.

  This correctly excludes bright COLOURED pixels (amber at L=220, spread=130)
  from the shine zone while capturing genuine near-white specular highlights
  regardless of exact luminance. Excluded bright coloured pixels fall into the
  secondary zone instead, so they respond to --secondary-color as intended.

Outputs alongside the source (suffix-based, originals preserved):
  <stem>_mask_alpha.png     -- flat white-on-transparent silhouette (alpha mode)
  <stem>_mask_lum.png       -- full grayscale (debug / reference)
  <stem>_mask_primary.png   -- non-shine pixels with L < mid_lo (luminance mode)
  <stem>_mask_secondary.png -- non-shine pixels with L >= mid_lo (luminance mode)
  <stem>_mask_shine.png     -- near-white bright pixels, white-on-transparent (alpha mode)

Usage:
    python scripts/gen_particle_mask.py qi_orb_bright
    python scripts/gen_particle_mask.py qi_orb_bright qi_spark_star

Optional overrides:
    --mid N           primary/secondary luminance split (default 180)
    --shine-lum N     minimum luminance to be a shine candidate (default 200)
    --shine-spread N  maximum RGB spread for shine pixels (default 80)
    --shine N         legacy alias for --shine-lum
    --dir PATH        directory to read source PNGs from (default: public/sprites/vfx/qi_particles)
    --out PATH        directory to write masks to (default: same as source dir)
"""

import sys
from pathlib import Path
from PIL import Image

ROOT     = Path(__file__).parent.parent
PART_DIR = ROOT / "public/sprites/vfx/qi_particles"


# ── Low-level helpers ─────────────────────────────────────────────────────────

def _lum(r, g, b):
    return int(0.299 * r + 0.587 * g + 0.114 * b)


def _is_shine(r, g, b, shine_lum_lo, shine_spread_max):
    """True when the pixel is a specular highlight: bright enough AND near-white.

    Near-white is measured by RGB spread (max - min). Spread = 0 is pure grey/white.
    Spread = 255 is maximally saturated. Threshold 80 lets in soft warm/cool whites
    (e.g. white-yellow core at spread ~50) while excluding coloured accents
    (e.g. amber at spread ~130, violet at spread ~120)."""
    return _lum(r, g, b) >= shine_lum_lo and (max(r, g, b) - min(r, g, b)) <= shine_spread_max


# ── Mask generators ───────────────────────────────────────────────────────────

def make_alpha_mask(src: Image.Image) -> Image.Image:
    """White-on-transparent silhouette. Alpha = original alpha."""
    rgba = src.convert("RGBA")
    a    = rgba.split()[3]
    out  = Image.new("RGBA", rgba.size, (255, 255, 255, 0))
    px   = out.load()
    ap   = a.load()
    for y in range(out.height):
        for x in range(out.width):
            if ap[x, y] > 0:
                px[x, y] = (255, 255, 255, ap[x, y])
    return out


def make_luminance_mask(src: Image.Image) -> Image.Image:
    """Full grayscale of the original. Debug / reference -- not used in the live pipeline."""
    rgba       = src.convert("RGBA")
    r, g, b, a = rgba.split()
    lum        = Image.merge("RGB", (r, g, b)).convert("L")
    return Image.merge("RGBA", (lum, lum, lum, a))


def make_primary_zone_mask(src: Image.Image,
                            mid_lo: int,
                            shine_lum_lo: int,
                            shine_spread_max: int) -> Image.Image:
    """Non-shine pixels with L < mid_lo, stored at native luminance.
    Use with mask-mode: luminance. Tint with --primary-color.

    Native luminance preserves the outer edge fade and subtle volume shading."""
    rgba = src.convert("RGBA")
    px   = rgba.load()
    out  = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    op   = out.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if _is_shine(r, g, b, shine_lum_lo, shine_spread_max):
                continue
            lum = _lum(r, g, b)
            if lum < mid_lo:
                op[x, y] = (lum, lum, lum, a)
    return out


def make_secondary_zone_mask(src: Image.Image,
                               mid_lo: int,
                               shine_lum_lo: int,
                               shine_spread_max: int) -> Image.Image:
    """Non-shine pixels with L >= mid_lo, stored at native luminance.
    Use with mask-mode: luminance. Tint with --secondary-color.

    Covers the inner-glow accent ring. For same-hue skins use a lighter shade;
    for cross-hue skins (e.g. violet body + amber accents) use the accent hue."""
    rgba = src.convert("RGBA")
    px   = rgba.load()
    out  = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    op   = out.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if _is_shine(r, g, b, shine_lum_lo, shine_spread_max):
                continue
            lum = _lum(r, g, b)
            if lum >= mid_lo:
                op[x, y] = (lum, lum, lum, a)
    return out


def make_shine_mask(src: Image.Image,
                    shine_lum_lo: int,
                    shine_spread_max: int) -> Image.Image:
    """Near-white bright pixels as white-on-transparent (alpha mode).
    Pair with background-image: <original-png> in CSS so these pixels always
    render their baked colour -- the artist's specular highlight, unchanged."""
    rgba = src.convert("RGBA")
    px   = rgba.load()
    out  = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    op   = out.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if _is_shine(r, g, b, shine_lum_lo, shine_spread_max):
                op[x, y] = (255, 255, 255, a)
    return out


# ── Public entry point ────────────────────────────────────────────────────────

def process_one(src_path,
                mid_lo: int,
                shine_lum_lo: int,
                shine_spread_max: int,
                out_dir=None) -> None:
    """Generate all 5 mask variants for a single particle PNG.

    src_path  -- full Path (or str) to the source PNG
    out_dir   -- where to write masks; defaults to src_path.parent
    """
    src_path = Path(src_path)
    if not src_path.exists():
        print(f"  ! missing: {src_path}")
        return

    out_base = Path(out_dir) if out_dir else src_path.parent
    stem     = src_path.stem
    src      = Image.open(src_path)

    make_alpha_mask(src).save(                                     out_base / f"{stem}_mask_alpha.png")
    make_luminance_mask(src).save(                                 out_base / f"{stem}_mask_lum.png")
    make_primary_zone_mask(src, mid_lo, shine_lum_lo, shine_spread_max).save(
                                                                   out_base / f"{stem}_mask_primary.png")
    make_secondary_zone_mask(src, mid_lo, shine_lum_lo, shine_spread_max).save(
                                                                   out_base / f"{stem}_mask_secondary.png")
    make_shine_mask(src, shine_lum_lo, shine_spread_max).save(     out_base / f"{stem}_mask_shine.png")

    def rp(p):
        try:    return Path(p).relative_to(ROOT)
        except: return Path(p)

    print(f"  + {rp(out_base / (stem + '_mask_primary.png'))}"
          f"    (non-shine, L<{mid_lo})")
    print(f"  + {rp(out_base / (stem + '_mask_secondary.png'))}"
          f" (non-shine, L>={mid_lo})")
    print(f"  + {rp(out_base / (stem + '_mask_shine.png'))}"
          f"    (lum>={shine_lum_lo} AND spread<={shine_spread_max})")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    mid_lo           = 180
    shine_lum_lo     = 200
    shine_spread_max = 80
    src_dir  = None
    out_dir  = None
    names    = []
    i = 0
    while i < len(args):
        if args[i] == "--mid" and i + 1 < len(args):
            mid_lo = int(args[i + 1]);           i += 2
        elif args[i] in ("--shine-lum", "--shine") and i + 1 < len(args):
            shine_lum_lo = int(args[i + 1]);     i += 2
        elif args[i] == "--shine-spread" and i + 1 < len(args):
            shine_spread_max = int(args[i + 1]); i += 2
        elif args[i] == "--dir" and i + 1 < len(args):
            src_dir = Path(args[i + 1]);         i += 2
        elif args[i] == "--out" and i + 1 < len(args):
            out_dir = Path(args[i + 1]);         i += 2
        else:
            names.append(args[i]); i += 1

    if not names:
        print("usage: python scripts/gen_particle_mask.py <name> [<name>...] "
              "[--mid N] [--shine-lum N] [--shine-spread N] [--dir PATH] [--out PATH]")
        sys.exit(1)

    base = src_dir or PART_DIR
    for n in names:
        print(f"[gen_particle_mask] {n}  "
              f"(mid={mid_lo}, shine_lum>={shine_lum_lo}, spread<={shine_spread_max})")
        stem = n.removesuffix(".png")
        process_one(base / f"{stem}.png", mid_lo, shine_lum_lo, shine_spread_max, out_dir)


if __name__ == "__main__":
    main()
