"""
build_particle_picker.py -- self-contained HTML for picking which
qi_orb_c9 particle variant to use in-game.

Layout:
  Left column: crystal image + tier name + pc/sc swatches
  One column per variant (C0-C15): animated orbs tinted with each tier's colors
  Click a column to select it
  Selection status shown at the top

Output: public/particle-picker.html

Usage:
    python scripts/build_particle_picker.py
"""

import base64, sys
from pathlib import Path

ROOT     = Path(__file__).parent.parent
PART_DIR = ROOT / "public/sprites/vfx/qi_particles"
CRYS_DIR = ROOT / "public/crystals"
OUT_HTML = ROOT / "public/particle-picker.html"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# ── Live tier tint colors (must match CRYSTAL_VFX_TIER_TINT in HomeScreen.jsx) ──

TIER_TINT = {
    1:  ('#778899', '#aabbcc'),
    2:  ('#3377aa', '#88bbdd'),
    3:  ('#00aaaa', '#aaffee'),
    4:  ('#0044bb', '#66bbff'),
    5:  ('#0022aa', '#5588ff'),
    6:  ('#5500bb', '#9966ff'),
    7:  ('#7700cc', '#bbaaff'),
    8:  ('#aa77dd', '#eeddff'),
    9:  ('#ffbb22', '#fffacc'),
   10:  ('#ff9900', '#ffe566'),
}

TIER_NAME = {
    1:  'Blue-grey',
    2:  'Blue',
    3:  'Cyan',
    4:  'Deep blue',
    5:  'Navy',
    6:  'Violet',
    7:  'Purple',
    8:  'Pale lilac',
    9:  'Gold',
   10:  'Orange-gold',
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def data_uri(path):
    raw = Path(path).read_bytes()
    return "data:image/png;base64," + base64.b64encode(raw).decode("ascii")

# ── Load assets ───────────────────────────────────────────────────────────────

print("Loading particle data URIs...")
VAR_URIS = {}
for n in range(16):
    stem = f"qi_orb_c9_{n}"
    orig = PART_DIR / f"{stem}.png"
    if not orig.exists():
        print(f"  skip {n} (not found)")
        continue
    VAR_URIS[n] = {
        "orig":      data_uri(PART_DIR / f"{stem}.png"),
        "primary":   data_uri(PART_DIR / f"{stem}_mask_primary.png"),
        "secondary": data_uri(PART_DIR / f"{stem}_mask_secondary.png"),
        "shine":     data_uri(PART_DIR / f"{stem}_mask_shine.png"),
    }
    print(f"  C{n} loaded")

print("\nLoading crystal data URIs...")
CRYS_URIS = {}
for tier in range(1, 11):
    p = CRYS_DIR / f"crystal_{tier}.png"
    if p.exists():
        CRYS_URIS[tier] = data_uri(p)
        print(f"  T{tier} loaded")
    else:
        print(f"  T{tier} not found")

VARIANTS = [n for n in range(16) if n in VAR_URIS]

# ── CSS: per-variant mask vars ────────────────────────────────────────────────

def variant_css(n):
    u = VAR_URIS[n]
    return (
        f'.v-{n} {{\n'
        f'  --mask-primary:   url("{u["primary"]}");\n'
        f'  --mask-secondary: url("{u["secondary"]}");\n'
        f'  --mask-shine:     url("{u["shine"]}");\n'
        f'  --orig-orb:       url("{u["orig"]}");\n'
        f'}}'
    )

ALL_VAR_CSS = "\n".join(variant_css(n) for n in VARIANTS)

# ── HTML builders ─────────────────────────────────────────────────────────────

# 5 orbs per cell: (dx from center in px, animation-delay in ms, base scale)
ORB_OFFSETS = [
    ( 0,    0,   1.00),
    (11,  350,   0.82),
    (-9,  700,   0.90),
    ( 6,  175,   0.75),
    (-4,  525,   0.87),
]

def orb_cell_html(variant_n, tier):
    pc, sc = TIER_TINT[tier]
    parts = []
    for dx, delay, scale in ORB_OFFSETS:
        parts.append(
            f'<div class="orb v-{variant_n}" '
            f'style="left:calc(50% + {dx}px);'
            f'--pc:{pc};--sc:{sc};'
            f'animation-delay:{delay}ms;'
            f'--base-scale:{scale}">'
            f'<div class="layer-p"></div>'
            f'<div class="layer-s"></div>'
            f'<div class="layer-g"></div>'
            f'</div>'
        )
    return f'<div class="orb-cell">{"".join(parts)}</div>'


def tier_cell_html(tier):
    pc, sc = TIER_TINT[tier]
    img_tag = (
        f'<img src="{CRYS_URIS[tier]}" class="crystal-img" alt="T{tier}">'
        if tier in CRYS_URIS else '<div class="crystal-placeholder"></div>'
    )
    return (
        f'<div class="tier-cell">'
        f'{img_tag}'
        f'<div class="tier-name">T{tier} · {TIER_NAME[tier]}</div>'
        f'<div class="tier-swatches">'
        f'<div class="sw" style="background:{pc}" title="primary {pc}"></div>'
        f'<div class="sw" style="background:{sc}" title="secondary {sc}"></div>'
        f'</div>'
        f'</div>'
    )


# Table header row
hdr_cells = ['<th class="corner-th"><span class="corner-label">Crystal ↓ &nbsp; Variant →</span></th>']
for n in VARIANTS:
    hdr_cells.append(
        f'<th class="var-th" id="hdr-{n}" onclick="pick({n})">'
        f'<div class="var-num">C{n}</div>'
        f'<img src="{VAR_URIS[n]["orig"]}" class="var-orig-img" alt="C{n}">'
        f'<div class="check-badge">&#10003; Selected</div>'
        f'</th>'
    )
HEADER_ROW = "\n".join(hdr_cells)

# Table body rows (one per tier)
body_rows_html = []
for tier in range(1, 11):
    cells = [f'<td class="tier-td">{tier_cell_html(tier)}</td>']
    for n in VARIANTS:
        cells.append(
            f'<td class="orb-td" id="c{n}t{tier}">'
            f'{orb_cell_html(n, tier)}'
            f'</td>'
        )
    body_rows_html.append(f'<tr>{"".join(cells)}</tr>')
BODY_ROWS = "\n".join(body_rows_html)

# ── Full HTML ─────────────────────────────────────────────────────────────────

HTML = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Particle Picker -- qi_orb_c9 x crystal tiers</title>
<style>
/* ── Reset + base ─────────────────────────────────────────────────────────── */
:root {{
  --bg:         #050a0e;
  --bg-cell:    rgba(14,22,30,.9);
  --bg-tier:    rgba(12,20,28,.95);
  --border:     rgba(80,160,140,.14);
  --border-hi:  rgba(68,170,255,.5);
  --text:       #cce0f5;
  --muted:      rgba(170,200,230,.5);
  --sel-color:  #44aaff;
  --sel-bg:     rgba(30,100,200,.18);
  --cell-w:     88px;
  --tier-w:     140px;
  --cell-h:     88px;
}}
*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
html, body {{
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
  -webkit-font-smoothing: antialiased;
}}

/* ── Top bar ──────────────────────────────────────────────────────────────── */
.top-bar {{
  position: sticky; top: 0; z-index: 200;
  background: rgba(5,10,14,.97);
  border-bottom: 1px solid var(--border);
  padding: 10px 18px;
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
}}
.top-bar h1 {{ font-size: 14px; font-weight: 700; color: #7adcc4; white-space: nowrap; }}
.top-bar p  {{ font-size: 11px; color: var(--muted); max-width: 560px; line-height: 1.5; }}
.sel-badge {{
  margin-left: auto; min-width: 210px; text-align: center;
  font-size: 12px; font-weight: 600;
  color: var(--sel-color);
  background: var(--sel-bg);
  border: 1px solid rgba(68,170,255,.3);
  padding: 7px 16px; border-radius: 6px;
}}

/* ── Scroll wrapper ───────────────────────────────────────────────────────── */
.outer {{ overflow-x: auto; padding: 0 0 40px; }}

/* ── Table ────────────────────────────────────────────────────────────────── */
table {{ border-collapse: separate; border-spacing: 3px; }}
thead tr th {{ position: sticky; top: 59px; z-index: 10; }}

/* ── Corner ───────────────────────────────────────────────────────────────── */
.corner-th {{
  width: var(--tier-w); min-width: var(--tier-w);
  background: var(--bg);
  vertical-align: bottom; padding-bottom: 8px;
}}
.corner-label {{ font-size: 10px; color: var(--muted); padding: 0 6px; }}

/* ── Variant header ───────────────────────────────────────────────────────── */
.var-th {{
  width: var(--cell-w); min-width: var(--cell-w);
  background: var(--bg-cell);
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  padding: 6px 4px 4px;
  text-align: center;
  vertical-align: bottom;
  cursor: pointer;
  transition: background .12s, border-color .12s;
  user-select: none;
}}
.var-th:hover {{
  background: rgba(24,40,58,.95);
  border-color: rgba(80,160,140,.3);
}}
.var-th.selected {{
  background: var(--sel-bg);
  border-color: var(--border-hi);
  border-bottom-color: transparent;
}}
.var-num {{ font-size: 10px; font-weight: 700; color: var(--muted); margin-bottom: 5px; }}
.var-orig-img {{
  width: 44px; height: 44px;
  display: block; margin: 0 auto 4px;
  image-rendering: pixelated;
  object-fit: contain;
  background: rgba(0,0,0,.4); border-radius: 3px;
}}
.check-badge {{
  display: none;
  font-size: 9px; font-weight: 700; letter-spacing: .03em;
  color: var(--sel-color); margin-top: 2px;
}}
.var-th.selected .check-badge {{ display: block; }}

/* ── Tier cell (left column) ──────────────────────────────────────────────── */
.tier-td {{
  background: var(--bg-tier);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px 10px;
  vertical-align: middle;
}}
.tier-cell {{ display: flex; flex-direction: column; align-items: center; gap: 5px; }}
.crystal-img, .crystal-placeholder {{
  width: 52px; height: 52px;
  object-fit: contain; image-rendering: pixelated;
}}
.crystal-placeholder {{ background: rgba(40,60,80,.4); border-radius: 4px; }}
.tier-name {{ font-size: 10px; color: var(--muted); text-align: center; line-height: 1.4; }}
.tier-swatches {{ display: flex; gap: 4px; }}
.sw {{ width: 16px; height: 16px; border-radius: 3px; border: 1px solid rgba(255,255,255,.1); flex-shrink: 0; }}

/* ── Orb data cells ───────────────────────────────────────────────────────── */
.orb-td {{
  width: var(--cell-w); min-width: var(--cell-w);
  height: var(--cell-h);
  background: var(--bg-cell);
  border: 1px solid var(--border);
  border-top: none;
  position: relative;
  overflow: hidden;
  transition: background .12s, border-color .12s;
  cursor: pointer;
  vertical-align: top;
  border-radius: 0;
}}
/* bottom-rounded corners only on last row */
tbody tr:last-child .orb-td {{ border-radius: 0 0 4px 4px; }}
.orb-td.selected {{ background: var(--sel-bg); border-color: rgba(68,170,255,.3); }}
.orb-td.selected-border {{ border-left-color: var(--border-hi); border-right-color: var(--border-hi); }}
/* last row of selected column gets bottom border highlight */
tbody tr:last-child .orb-td.selected {{ border-bottom-color: var(--border-hi); }}

/* ── Per-variant mask vars ────────────────────────────────────────────────── */
{ALL_VAR_CSS}

/* ── Orb + layers ─────────────────────────────────────────────────────────── */
.orb-cell {{ position: absolute; inset: 0; }}
.orb {{
  position: absolute;
  bottom: 2px;
  width: 44px; height: 44px;
  margin-left: -22px;
  animation: orb-float 1.7s ease-in-out infinite;
}}
.orb .layer-p,
.orb .layer-s,
.orb .layer-g {{
  position: absolute; inset: 0;
  -webkit-mask-size: contain; mask-size: contain;
  -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  -webkit-mask-position: center; mask-position: center;
}}
.orb .layer-p {{
  background-color: var(--pc, #778899);
  -webkit-mask-image: var(--mask-primary); mask-image: var(--mask-primary);
  -webkit-mask-mode: luminance; mask-mode: luminance;
}}
.orb .layer-s {{
  background-color: var(--sc, #aabbcc);
  -webkit-mask-image: var(--mask-secondary); mask-image: var(--mask-secondary);
  -webkit-mask-mode: luminance; mask-mode: luminance;
}}
.orb .layer-g {{
  background-image: var(--orig-orb);
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  -webkit-mask-image: var(--mask-shine); mask-image: var(--mask-shine);
}}

/* ── Float animation ──────────────────────────────────────────────────────── */
@keyframes orb-float {{
  0%   {{ transform: translateY(0)     scale(calc(var(--base-scale, 1) * 0.65)); opacity: 0;   }}
  14%  {{ opacity: 1;   }}
  82%  {{ opacity: 0.8; }}
  100% {{ transform: translateY(-76px) scale(calc(var(--base-scale, 1) * 1.06)); opacity: 0;   }}
}}
</style>
</head>
<body>

<div class="top-bar">
  <div>
    <h1>Particle Picker &nbsp;·&nbsp; qi_orb_c9 &#xd7; 10 crystal tiers</h1>
    <p>Click any variant column to select it.
       Particles animate with each tier's live colors from CRYSTAL_VFX_TIER_TINT.
       Left column shows the crystal + primary/secondary swatches.</p>
  </div>
  <div class="sel-badge" id="sel">Nothing selected yet</div>
</div>

<div class="outer">
<table>
<thead>
  <tr>
    {HEADER_ROW}
  </tr>
</thead>
<tbody>
  {BODY_ROWS}
</tbody>
</table>
</div>

<script>
const NUM_TIERS = 10;
let current = null;

function pick(n) {{
  // De-select previous column
  if (current !== null) {{
    const oldHdr = document.getElementById('hdr-' + current);
    if (oldHdr) oldHdr.classList.remove('selected');
    for (let t = 1; t <= NUM_TIERS; t++) {{
      const c = document.getElementById('c' + current + 't' + t);
      if (c) c.classList.remove('selected');
    }}
  }}

  current = n;

  const hdr = document.getElementById('hdr-' + n);
  if (hdr) hdr.classList.add('selected');
  for (let t = 1; t <= NUM_TIERS; t++) {{
    const c = document.getElementById('c' + n + 't' + t);
    if (c) {{
      c.classList.add('selected');
      // Wire click on cell to also trigger select
      c.onclick = () => pick(n);
    }}
  }}

  document.getElementById('sel').textContent =
    'Selected: C' + n + '  (qi_orb_c9_' + n + '.png)';
}}

// Wire cell clicks on load
for (let n = 0; n < 16; n++) {{
  for (let t = 1; t <= NUM_TIERS; t++) {{
    const c = document.getElementById('c' + n + 't' + t);
    if (c) c.onclick = () => pick(n);
  }}
}}
</script>
</body>
</html>
"""

OUT_HTML.write_text(HTML, encoding="utf-8")
sz = OUT_HTML.stat().st_size
print(f"\nWritten: {OUT_HTML.relative_to(ROOT)}  ({sz / 1024:.0f} KB)")
print("Open in browser: public/particle-picker.html")
