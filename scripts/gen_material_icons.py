#!/usr/bin/env python3
"""
Generate placeholder pixel art icons (64×64 RGBA) for all MartialArtsIdle materials.
Draws at 16×16 logical pixels, scales up with nearest-neighbour → true pixel-art feel.
Output: public/materials/<id>.png
"""
from PIL import Image
from pathlib import Path

SIZE  = 16   # logical grid
SCALE = 4    # → 64×64 output
OUT   = Path(__file__).parent.parent / "public/sprites/items"
OUT.mkdir(parents=True, exist_ok=True)

# ── Color helpers ─────────────────────────────────────────────────────────────
def c(h):
    h = h.lstrip('#')
    return (int(h[0:2],16), int(h[2:4],16), int(h[4:6],16), 255)

K    = c('#0d0d1a')   # outline / near-black
STEM = c('#2d5a27')   # herb stem dark
STHL = c('#4a8038')   # herb stem highlight
LEAF = c('#3d6a2d')   # herb leaf
LFHL = c('#6aab44')   # herb leaf highlight
ROOT = c('#5c3a1a')   # root

RARITY = {
    'iron':   {'m': c('#9ca3af'), 'd': c('#6b7280'), 'l': c('#d1d5db')},
    'bronze': {'m': c('#cd7f32'), 'd': c('#8b5e1a'), 'l': c('#e8a84c')},
    'silver': {'m': c('#c0c0c0'), 'd': c('#808080'), 'l': c('#f0f0f0')},
    'gold':   {'m': c('#f5c842'), 'd': c('#c49a0a'), 'l': c('#fde68a')},
    'trans':  {'m': c('#c084fc'), 'd': c('#7c3aed'), 'l': c('#e9d5ff')},
}

# ── Pixel-level drawing helpers ───────────────────────────────────────────────
def pp(img, x, y, col):
    if 0 <= x < SIZE and 0 <= y < SIZE:
        img.putpixel((x, y), col)

def hline(img, y, x0, x1, col):
    for x in range(x0, x1 + 1): pp(img, x, y, col)

def vline(img, x, y0, y1, col):
    for y in range(y0, y1 + 1): pp(img, x, y, col)

def frect(img, x0, y0, x1, y1, col):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            pp(img, x, y, col)

def orect(img, x0, y0, x1, y1, col):
    hline(img, y0, x0, x1, col)
    hline(img, y1, x0, x1, col)
    vline(img, x0, y0, y1, col)
    vline(img, x1, y0, y1, col)

def disk(img, cx, cy, r, fill, border=None):
    for y in range(max(0, cy - r), min(SIZE, cy + r + 1)):
        for x in range(max(0, cx - r), min(SIZE, cx + r + 1)):
            d2 = (x - cx) ** 2 + (y - cy) ** 2
            in_disk   = d2 <= r * r
            on_border = (r - 1) ** 2 < d2 <= r * r
            if in_disk:
                pp(img, x, y, border if (border and on_border) else fill)

def diamond(img, cx, cy, rx, ry, fill, border=None):
    for y in range(cy - ry, cy + ry + 1):
        dy   = abs(y - cy)
        span = round(rx * (1 - dy / max(ry, 1)))
        frect(img, cx - span, y, cx + span, y, fill)
    if border:
        for y in range(cy - ry, cy + ry + 1):
            dy   = abs(y - cy)
            span = round(rx * (1 - dy / max(ry, 1)))
            pp(img, cx - span, y, border)
            pp(img, cx + span, y, border)

def finish(img16, name):
    big = img16.resize((SIZE * SCALE, SIZE * SCALE), Image.NEAREST)
    big.save(str(OUT / f"{name}.png"))
    print(f"  {name}.png")

def new():
    return Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

# ── Material type draw functions ───────────────────────────────────────────────

def draw_herb(img, pal, bloom=1):
    """
    bloom styles:
      1 = round blob         (iron grass / simple)
      2 = cross petals       (bronze flower)
      3 = flat lotus petals  (silver lotus)
      4 = thorned spike      (gold vine thorn / blood-reed)
      5 = glow aura          (transcendent)
    """
    # Stem — two columns, x=7 highlight / x=8 dark
    vline(img, 7, 6, 13, STHL)
    vline(img, 8, 6, 13, STEM)
    vline(img, 6, 6, 13, K)
    vline(img, 9, 6, 13, K)
    pp(img, 7, 5, STHL); pp(img, 8, 5, STEM)  # join to bloom

    # Leaves (symmetrical, y 7-10)
    leaf_pts_L = [(3,7),(4,7),(5,7),(3,8),(4,8),(3,9),(4,9),(5,9)]
    leaf_pts_R = [(11,7),(12,7),(13,7),(11,8),(12,8),(11,9),(12,9),(13,9)]
    for (x,y) in leaf_pts_L: pp(img, x, y, LEAF)
    for (x,y) in leaf_pts_R: pp(img, x, y, LEAF)
    # Leaf highlights
    pp(img, 4, 7, LFHL); pp(img, 12, 7, LFHL)
    # Leaf outlines
    for (x,y) in [(2,7),(2,8),(2,9),(2,10),(3,10),(4,10),(5,10),(6,10)]:
        pp(img, x, y, K)
    for (x,y) in [(14,7),(14,8),(14,9),(14,10),(13,10),(12,10),(11,10),(10,10)]:
        pp(img, x, y, K)

    # Root (y=13-15)
    hline(img, 14, 5, 10, ROOT)
    pp(img, 5, 15, ROOT); pp(img, 10, 15, ROOT)
    pp(img, 4, 14, K); pp(img, 11, 14, K)
    pp(img, 4, 15, K); pp(img, 5, 16 if False else 15, K)  # guard

    # --- Bloom ---
    if bloom == 1:  # round blob
        disk(img, 7, 3, 3, pal['m'], K)
        pp(img, 6, 2, pal['l']); pp(img, 7, 2, pal['l'])

    elif bloom == 2:  # cross-petal flower
        # center
        frect(img, 6, 3, 9, 5, pal['m'])
        # petals (N S W E)
        frect(img, 6, 1, 9, 2, pal['m'])    # top
        frect(img, 6, 6, 9, 6, pal['m'])    # bottom
        frect(img, 4, 3, 5, 5, pal['m'])    # left
        frect(img, 10, 3, 11, 5, pal['m'])  # right
        # centre highlight
        pp(img, 7, 4, pal['l']); pp(img, 8, 3, pal['l'])
        # outline
        for pt in [(5,0),(6,0),(7,0),(8,0),(9,0),(10,1),(12,2),(12,3),(12,4),(12,5),
                   (10,6),(9,7),(8,7),(7,7),(6,7),(5,6),(3,5),(3,4),(3,3),(3,2),(5,0)]:
            pp(img, pt[0], pt[1], K)

    elif bloom == 3:  # lotus (wide flat petals)
        frect(img, 5, 3, 10, 5, pal['m'])    # centre band
        frect(img, 6, 1, 9, 2, pal['m'])     # top petal
        frect(img, 3, 3, 4, 5, pal['m'])     # left petal
        frect(img, 11, 3, 12, 5, pal['m'])   # right petal
        frect(img, 5, 6, 10, 6, pal['m'])    # bottom
        # highlights
        pp(img, 7, 3, pal['l']); pp(img, 8, 3, pal['l'])
        pp(img, 7, 2, pal['l'])
        # outline
        orect(img, 3, 1, 12, 6, K)
        hline(img, 0, 6, 9, K)
        pp(img, 5, 1, K); pp(img, 10, 1, K)

    elif bloom == 4:  # thorned spike (gold / blood-red)
        # spike
        for y,x0,x1 in [(1,7,8),(2,6,9),(3,5,10),(4,5,10),(5,5,10)]:
            frect(img, x0, y, x1, y, pal['m'])
        # thorns protruding
        pp(img, 4, 2, pal['d']); pp(img, 11, 2, pal['d'])
        pp(img, 3, 4, pal['d']); pp(img, 12, 4, pal['d'])
        # highlight
        pp(img, 7, 2, pal['l']); pp(img, 7, 3, pal['l'])
        # outline
        for pt in [(6,0),(7,0),(8,0),(9,1),(10,1),(12,2),(13,3),(13,4),(13,5),
                   (11,6),(10,6),(9,6),(8,6),(7,6),(6,6),(5,6),(4,6),(3,5),
                   (2,4),(2,3),(2,2),(4,1),(5,1)]:
            pp(img, pt[0], pt[1], K)

    elif bloom == 5:  # glow aura (transcendent)
        # outer glow ring
        disk(img, 7, 3, 4, pal['d'])
        # mid glow
        disk(img, 7, 3, 3, pal['m'])
        # bright core
        disk(img, 7, 3, 2, pal['l'])
        # sparkle
        pp(img, 7, 1, (255,255,255,220))
        pp(img, 5, 1, pal['m']); pp(img, 9, 1, pal['m'])
        pp(img, 4, 3, pal['d']); pp(img, 10, 3, pal['d'])
        # outline just the outer ring
        disk(img, 7, 3, 4, pal['d'], K)

# ── Ore ───────────────────────────────────────────────────────────────────────

def draw_ore(img, pal, style=1):
    """
    style 1: single tall crystal shard
    style 2: double shard cluster
    """
    if style == 1:
        # Shard: narrow top, wide middle, taper bottom
        pts = [
            (1, 7,  7),   # top point (y, x0, x1)
            (2, 6,  8),
            (3, 5,  9),
            (4, 4, 10),
            (5, 4, 11),
            (6, 3, 12),
            (7, 3, 12),
            (8, 3, 12),
            (9, 4, 11),
            (10, 5, 10),
            (11, 6,  9),
            (12, 7,  8),
            (13, 7,  8),
        ]
        for (y, x0, x1) in pts:
            frect(img, x0, y, x1, y, pal['m'])
        # Left-face highlight
        for (y, x0, x1) in pts[:8]:
            pp(img, x0, y, pal['l'])
            pp(img, x0+1, y, pal['l'])
        # Right-face shadow
        for (y, x0, x1) in pts:
            pp(img, x1, y, pal['d'])
        # Outline
        for (y, x0, x1) in pts:
            pp(img, x0 - 1, y, K)
            pp(img, x1 + 1, y, K)
        hline(img, 0, 7, 7, K)
        hline(img, 14, 7, 8, K)
        # Tiny sparkle at top-left facet
        pp(img, 6, 3, (255,255,255,200))

    elif style == 2:
        # Two overlapping shards
        for (off, top_y) in [(-2, 2), (2, 4)]:
            cx = 7 + off
            for dy in range(0, 10):
                y   = top_y + dy
                wid = min(dy, 3, 9 - dy)
                frect(img, cx - wid, y, cx + wid, y, pal['m'])
            # shadow side
            for dy in range(2, 10):
                y = top_y + dy
                pp(img, cx + min(dy, 3, 9 - dy), y, pal['d'])
        # Shared highlight
        pp(img, 5, 3, pal['l']); pp(img, 6, 4, pal['l'])
        pp(img, 8, 5, pal['l']); pp(img, 9, 6, pal['l'])
        # Outline bounding box
        orect(img, 2, 1, 13, 14, K)
        pp(img, 5, 3, pal['l'])  # re-apply after outline
        # Sparkles
        pp(img, 4, 3, (255,255,255,200))
        pp(img, 9, 5, (255,255,255,170))

# ── Blood Core ────────────────────────────────────────────────────────────────

def draw_blood_core(img, pal, style=1):
    """
    style 1: clean glowing orb
    style 2: orb with inner cross / rune mark
    """
    # Outer ring
    disk(img, 7, 7, 6, pal['d'], K)
    # Mid fill
    disk(img, 7, 7, 5, pal['m'])
    # Inner glow
    disk(img, 7, 7, 3, pal['l'])
    # Bright core
    disk(img, 7, 7, 1, (255,255,255,200))
    # Highlight dot (top-left)
    pp(img, 5, 5, (255,255,255,230))
    pp(img, 4, 5, (255,255,255,160))

    if style == 2:
        # Veins / rune lines radiating from center
        for dx in range(-4, 5):
            pp(img, 7 + dx, 7, pal['d'])
        for dy in range(-4, 5):
            pp(img, 7, 7 + dy, pal['d'])
        # Diagonal marks
        for i in range(-2, 3):
            pp(img, 7 + i, 7 + i, pal['d'])
            pp(img, 7 + i, 7 - i, pal['d'])
        # Redraw inner glow over the veins
        disk(img, 7, 7, 2, pal['m'])
        pp(img, 7, 7, pal['l'])
        # Re-apply highlight
        pp(img, 5, 5, (255,255,255,220))

# ── Qi Stone ─────────────────────────────────────────────────────────────────

def draw_qi_stone(img, pal, style=1):
    """
    style 1: faceted hexagonal gem (pointed top)
    style 2: rounded gem (more circular)
    """
    if style == 1:
        # Hexagonal gem: rows define shape
        rows = [
            (1,  7,  8),
            (2,  5, 10),
            (3,  4, 11),
            (4,  3, 12),
            (5,  3, 12),
            (6,  3, 12),
            (7,  3, 12),
            (8,  3, 12),
            (9,  3, 12),
            (10, 4, 11),
            (11, 5, 10),
            (12, 6,  9),
            (13, 7,  8),
        ]
        for (y, x0, x1) in rows:
            frect(img, x0, y, x1, y, pal['m'])

        # Top-left facet (lighter)
        top_facet = [
            (1,  7,  7),
            (2,  5,  7),
            (3,  4,  7),
            (4,  3,  7),
            (5,  3,  7),
            (6,  3,  7),
        ]
        for (y, x0, x1) in top_facet:
            frect(img, x0, y, x1, y, pal['l'])

        # Bottom-right facet (darker)
        bot_facet = [
            (8,  9, 12),
            (9,  9, 12),
            (10, 9, 11),
            (11, 9, 10),
            (12, 8,  9),
        ]
        for (y, x0, x1) in bot_facet:
            frect(img, x0, y, x1, y, pal['d'])

        # Outline
        for (y, x0, x1) in rows:
            pp(img, x0 - 1, y, K)
            pp(img, x1 + 1, y, K)
        hline(img, 0, 7, 8, K)
        hline(img, 14, 7, 8, K)

        # Specular highlight
        pp(img, 5, 3, (255,255,255,200))
        pp(img, 5, 4, (255,255,255,130))

    elif style == 2:
        # Rounder gem
        disk(img, 7, 7, 6, pal['m'], K)
        # Top-left quarter lighter
        for y in range(2, 8):
            for x in range(2, 8):
                if (x-7)**2 + (y-7)**2 <= 36:
                    pp(img, x, y, pal['l'])
        # Bottom-right quarter darker
        for y in range(8, 13):
            for x in range(8, 13):
                if (x-7)**2 + (y-7)**2 <= 36:
                    pp(img, x, y, pal['d'])
        # Facet lines
        for i in range(-4, 5):
            pp(img, 7 + i, 7, pal['d'])   # horizontal divider
        for i in range(-4, 5):
            pp(img, 7, 7 + i, pal['d'])   # vertical divider
        # Redraw outline ring
        disk(img, 7, 7, 6, pal['m'], K)
        # Specular
        pp(img, 5, 5, (255,255,255,220))
        pp(img, 4, 5, (255,255,255,140))

# ── Icon manifest ─────────────────────────────────────────────────────────────

ICONS = [
    # (id,                         type,         rarity,   style)
    # Herbs
    ('iron_herb_1',                'herb',        'iron',   1),
    ('iron_herb_2',                'herb',        'iron',   4),
    ('bronze_herb_1',              'herb',        'bronze', 2),
    ('bronze_herb_2',              'herb',        'bronze', 2),
    ('silver_herb_1',              'herb',        'silver', 3),
    ('silver_herb_2',              'herb',        'silver', 4),
    ('gold_herb_1',                'herb',        'gold',   3),
    ('gold_herb_2',                'herb',        'gold',   4),
    ('transcendent_herb_1',        'herb',        'trans',  5),
    ('transcendent_herb_2',        'herb',        'trans',  5),
    # Ores
    ('iron_mineral_1',             'ore',         'iron',   1),
    ('iron_mineral_2',             'ore',         'iron',   2),
    ('bronze_mineral_1',           'ore',         'bronze', 1),
    ('bronze_mineral_2',           'ore',         'bronze', 2),
    ('silver_mineral_1',           'ore',         'silver', 1),
    ('silver_mineral_2',           'ore',         'silver', 2),
    ('gold_mineral_1',             'ore',         'gold',   1),
    ('gold_mineral_2',             'ore',         'gold',   2),
    ('transcendent_mineral_1',     'ore',         'trans',  1),
    ('transcendent_mineral_2',     'ore',         'trans',  2),
    # Blood Cores
    ('iron_blood_core_1',          'blood_core',  'iron',   1),
    ('iron_blood_core_2',          'blood_core',  'iron',   2),
    ('bronze_blood_core_1',        'blood_core',  'bronze', 1),
    ('bronze_blood_core_2',        'blood_core',  'bronze', 2),
    ('silver_blood_core_1',        'blood_core',  'silver', 1),
    ('silver_blood_core_2',        'blood_core',  'silver', 2),
    ('gold_blood_core_1',          'blood_core',  'gold',   1),
    ('gold_blood_core_2',          'blood_core',  'gold',   2),
    ('transcendent_blood_core_1',  'blood_core',  'trans',  1),
    ('transcendent_blood_core_2',  'blood_core',  'trans',  2),
    # Qi Stones
    ('iron_cultivation_1',         'qi_stone',    'iron',   1),
    ('iron_cultivation_2',         'qi_stone',    'iron',   2),
    ('bronze_cultivation_1',       'qi_stone',    'bronze', 1),
    ('bronze_cultivation_2',       'qi_stone',    'bronze', 2),
    ('silver_cultivation_1',       'qi_stone',    'silver', 1),
    ('silver_cultivation_2',       'qi_stone',    'silver', 2),
    ('gold_cultivation_1',         'qi_stone',    'gold',   1),
    ('gold_cultivation_2',         'qi_stone',    'gold',   2),
    ('transcendent_cultivation_1', 'qi_stone',    'trans',  1),
    ('transcendent_cultivation_2', 'qi_stone',    'trans',  2),
]

# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print(f"Generating {len(ICONS)} material icons -> {OUT}\n")
    for (icon_id, itype, rarity, style) in ICONS:
        img = new()
        pal = RARITY[rarity]
        if   itype == 'herb':       draw_herb(img, pal, style)
        elif itype == 'ore':        draw_ore(img, pal, style)
        elif itype == 'blood_core': draw_blood_core(img, pal, style)
        elif itype == 'qi_stone':   draw_qi_stone(img, pal, style)
        finish(img, icon_id)
    print(f"\nDone - {len(ICONS)} icons written to {OUT}")
