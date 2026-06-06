"""
compose_blood_lotus_packs.py — Build pack icons from copies of the ORIGINAL
blood lotus instead of letting the AI redesign each one.

Reads: public/sprites/items/blood_lotus.png
Writes: public/sprites/items/blood_lotus_{1,2,3,4,5,6}.png

Each tier composites N scaled copies of the original lotus onto a transparent
canvas, with slight rotation and back-to-front layering so the cluster reads
as a bunch of flowers rather than a flat grid.

Tier escalation:
   60 (Handful)        : 1 lotus
  330 (Pouch)          : 2 lotuses
  980 (Chest)          : 3 lotuses (triangle)
 1980 (Vault)          : 4 lotuses (diamond)
 3280 (Treasury)       : 5 lotuses (quincunx)
 6480 (Heaven Fortune) : 7 lotuses (center + hex ring)

The shop displays these at 36×36 via .blood-lotus-shop-item-icon, so 144×144
canvas gives ~4× supersampling for crispness on high-DPI displays.

DEPENDENCIES:
  pip install Pillow
"""

import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ITEMS_DIR = Path(__file__).parent.parent / "public/sprites/items"
SRC       = ITEMS_DIR / "blood_lotus.png"

# Canvas size — supersampled for the 36×36 shop display.
CANVAS = 144

# Per-tier config:
#   scale:        lotus scale relative to original
#   placements:   list of (dx, dy, rotation_deg) — offsets from canvas centre
#                 Later entries draw on TOP of earlier ones (back-to-front)
#   glow_color:   (r, g, b) of the warm radial glow behind the cluster, None = no glow
#   glow_radius:  pixel radius of the glow disc (before blur)
#   glow_alpha:   peak alpha of the glow (0-255)
#   glow_blur:    Gaussian blur radius applied to soften the glow edges
TIERS = {
    "blood_lotus_1": dict(
        scale=1.00,
        placements=[
            (0, 0, 0),
        ],
        glow_color=None,
    ),
    "blood_lotus_2": dict(
        scale=0.78,
        placements=[
            (-20, -2, -8),   # left, slightly back
            ( 20,  2,  8),   # right, slightly forward (drawn last)
        ],
        glow_color=None,  # count alone is enough
    ),
    "blood_lotus_3": dict(
        scale=0.62,
        placements=[
            (-26,  14, -6),  # bottom-left
            ( 26,  14,  6),  # bottom-right
            (  0, -20,  0),  # top centre (drawn last → in front)
        ],
        glow_color=None,  # count alone is enough
    ),
    "blood_lotus_4": dict(
        scale=0.55,
        placements=[
            (  0, -28, -4),  # top
            (-28,   0,  6),  # left
            ( 28,   0, -6),  # right
            (  0,  28,  4),  # bottom (drawn last → front)
        ],
        glow_color=(235, 130, 70),  # warm red shifting toward gold
        glow_radius=26,
        glow_alpha=80,
        glow_blur=10,
    ),
    "blood_lotus_5": dict(
        scale=0.48,
        placements=[
            (-28, -28, -10), # back-left
            ( 28, -28,  10), # back-right
            (-28,  28,  -6), # front-left
            ( 28,  28,   6), # front-right
            (  0,   0,   0), # centre (drawn last → on top)
        ],
        glow_color=(250, 180, 70),  # gold-orange
        glow_radius=32,
        glow_alpha=100,
        glow_blur=12,
    ),
    "blood_lotus_6": dict(
        scale=0.42,
        placements=[
            # Hex ring around centre (6 around + 1 centre)
            (  0, -34, -8),   # top
            ( 30, -17,  4),   # upper-right
            ( 30,  17, -4),   # lower-right
            (  0,  34,  8),   # bottom
            (-30,  17, -4),   # lower-left
            (-30, -17,  4),   # upper-left
            (  0,   0,  0),   # centre (drawn last → front)
        ],
        glow_color=(255, 215, 90),  # divine bright gold
        glow_radius=36,
        glow_alpha=130,
        glow_blur=13,
    ),
}


def make_glow(canvas_size, color, radius, peak_alpha, blur_radius):
    """Build a soft radial-glow layer: filled disc → gaussian blur → vignette mask.

    The vignette is applied after blur to GUARANTEE the glow alpha hits 0 well
    before the canvas edge — prevents the "tan square" rectangular bleed that
    happens when gaussian tails leak to the canvas corners.
    """
    glow = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    cx, cy = canvas_size // 2, canvas_size // 2
    r, g, b = color
    # Draw a filled circle in the centre with the glow color at peak alpha.
    draw.ellipse(
        (cx - radius, cy - radius, cx + radius, cy + radius),
        fill=(r, g, b, peak_alpha),
    )
    # Gaussian-blur softens the edge into a smooth radial falloff.
    glow = glow.filter(ImageFilter.GaussianBlur(radius=blur_radius))

    # Vignette mask: full alpha within `inner_r`, smooth falloff to 0 at `outer_r`.
    # Hard-zero outside `outer_r`. Picked so the falloff lives well inside the canvas.
    inner_r = radius + blur_radius // 2
    outer_r = min(canvas_size // 2 - 4, radius + blur_radius * 2 + 6)
    pixels = glow.load()
    falloff_span = max(1, outer_r - inner_r)
    for y in range(canvas_size):
        for x in range(canvas_size):
            dx = x - cx
            dy = y - cy
            d  = (dx * dx + dy * dy) ** 0.5
            if d <= inner_r:
                continue  # keep alpha as-is
            if d >= outer_r:
                if pixels[x, y][3] > 0:
                    pixels[x, y] = (0, 0, 0, 0)
                continue
            # Smooth cosine falloff inner_r → outer_r
            t = (d - inner_r) / falloff_span
            mult = (1.0 + (-1.0) * t)  # linear 1 → 0
            old = pixels[x, y]
            pixels[x, y] = (old[0], old[1], old[2], int(old[3] * mult))
    return glow


def compose_tier(name, lotus_src, cfg):
    """Composite glow + N lotuses onto a transparent CANVAS×CANVAS canvas."""
    scale = cfg["scale"]
    placements = cfg["placements"]

    w, h = lotus_src.size
    # Scale the lotus once for this tier — same scale for all copies.
    sw, sh = max(1, int(w * scale)), max(1, int(h * scale))
    scaled = lotus_src.resize((sw, sh), Image.LANCZOS)

    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    cx, cy = CANVAS // 2, CANVAS // 2

    # Glow layer (if any) goes UNDER the lotuses.
    if cfg.get("glow_color"):
        glow = make_glow(
            CANVAS,
            cfg["glow_color"],
            cfg["glow_radius"],
            cfg["glow_alpha"],
            cfg["glow_blur"],
        )
        canvas.alpha_composite(glow)

    for (dx, dy, rot) in placements:
        # Rotate (keeps transparency, expands canvas so corners don't clip).
        if rot:
            rotated = scaled.rotate(rot, resample=Image.BICUBIC, expand=True)
        else:
            rotated = scaled
        rw, rh = rotated.size
        # Top-left so the lotus is centred at (cx+dx, cy+dy).
        ox = cx + dx - rw // 2
        oy = cy + dy - rh // 2
        canvas.alpha_composite(rotated, (ox, oy))

    return canvas


def main():
    """Build all pack icons. NO transparent-edge cropping — every output stays a
    full square CANVAS×CANVAS so the CSS 36×36 display doesn't distort aspect
    ratio across tiers."""
    if not SRC.exists():
        raise FileNotFoundError(f"Original lotus not found: {SRC}")

    lotus = Image.open(SRC).convert("RGBA")
    print(f"Source: {SRC.name}  ({lotus.size[0]}×{lotus.size[1]})")
    print(f"Canvas: {CANVAS}×{CANVAS} (kept square — no edge crop)")
    print()

    for tier_id, cfg in TIERS.items():
        composite = compose_tier(tier_id, lotus, cfg)
        out_path  = ITEMS_DIR / f"{tier_id}.png"
        composite.save(str(out_path))
        glow_label = "no glow" if cfg.get("glow_color") is None else f"glow rgb{cfg['glow_color']}"
        n = len(cfg["placements"])
        print(f"  {tier_id:<22}  {n} lotus(es), {glow_label}  →  {composite.size[0]}×{composite.size[1]}")

    print()
    print("Done. Reload the shop to see the new pack icons.")


if __name__ == "__main__":
    main()
