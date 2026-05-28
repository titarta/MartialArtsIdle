"""
build_candidate_comparison.py -- batch-process all crystal9_orb candidates,
auto-extract primary + secondary colours from each crystal tier PNG, and
build a self-contained comparison HTML.

Reads:   tmp/qi_particles/crystal9_orb_cand_N.png  (N=0..15)
Reads:   public/crystals/crystal_N.png              (N=1..10)
Writes:  tmp/qi_particles/ -- mask PNGs per candidate
Writes:  public/mockup-candidate-compare.html

Crystal colour extraction uses k-means (k=2) in RGB space on the colored
opaque pixels of each crystal image (outline + shine excluded).
Primary = darker cluster, secondary = brighter cluster.
"""

import sys
import base64
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from gen_particle_mask import process_one, _is_shine

from PIL import Image

ROOT      = Path(__file__).parent.parent
TMP_DIR   = ROOT / "tmp/qi_particles"
CRYS_DIR  = ROOT / "public/crystals"
OUT_HTML  = ROOT / "public/mockup-candidate-compare.html"

MID_LO         = 180
SHINE_LUM_LO   = 200
SHINE_SPREAD   = 80


# ── Crystal palette extraction ────────────────────────────────────────────────

def _lum(r, g, b):
    return 0.299 * r + 0.587 * g + 0.114 * b

def _dist_sq(c1, c2):
    return sum((a - b) ** 2 for a, b in zip(c1, c2))

def _avg_rgb(pixels):
    n = len(pixels)
    return (sum(p[0] for p in pixels) // n,
            sum(p[1] for p in pixels) // n,
            sum(p[2] for p in pixels) // n)

def _to_hex(c):
    return f"#{c[0]:02x}{c[1]:02x}{c[2]:02x}"

def extract_crystal_palette(img_path):
    """K-means (k=2) on the colored opaque pixels of a crystal PNG.
    Excludes: fully-transparent, very dark outline (L<25), near-white shine (L>240, spread<40).
    Returns (primary_hex, secondary_hex) where primary is the darker cluster."""
    img = Image.open(img_path).convert("RGBA")
    px  = img.load()
    w, h = img.size

    pixels = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 30:
                continue
            l = _lum(r, g, b)
            if l < 25:
                continue                             # outline / shadow
            if l > 240 and (max(r,g,b) - min(r,g,b)) < 40:
                continue                             # near-white shine
            pixels.append((r, g, b))

    if not pixels:
        return "#808080", "#b0b0b0"

    # Initialise k=2 at 25th and 75th luminance percentiles
    by_lum = sorted(pixels, key=lambda p: _lum(*p))
    n  = len(by_lum)
    c1 = by_lum[n // 4]
    c2 = by_lum[3 * n // 4]

    for _ in range(40):
        cl1, cl2 = [], []
        for p in pixels:
            (cl1 if _dist_sq(p, c1) <= _dist_sq(p, c2) else cl2).append(p)
        nc1 = _avg_rgb(cl1) if cl1 else c1
        nc2 = _avg_rgb(cl2) if cl2 else c2
        if nc1 == c1 and nc2 == c2:
            break
        c1, c2 = nc1, nc2

    # Ensure primary = darker cluster
    if _lum(*c1) > _lum(*c2):
        c1, c2 = c2, c1

    return _to_hex(c1), _to_hex(c2)


# ── Asset helpers ─────────────────────────────────────────────────────────────

def data_uri(path):
    raw = Path(path).read_bytes()
    return "data:image/png;base64," + base64.b64encode(raw).decode("ascii")


# ── Step 1: process all candidates ───────────────────────────────────────────

print("Processing candidates...")
CANDS = []
for n in range(16):
    src = TMP_DIR / f"crystal9_orb_cand_{n}.png"
    if not src.exists():
        continue
    # Always regenerate with the updated shine algorithm
    process_one(src, MID_LO, SHINE_LUM_LO, SHINE_SPREAD, out_dir=TMP_DIR)
    CANDS.append(n)
print(f"  {len(CANDS)} candidates processed")


# ── Step 2: extract crystal palette per tier ──────────────────────────────────

print("Extracting crystal palettes...")
CRYSTAL_COLORS = {}
for tier in range(1, 11):
    p = CRYS_DIR / f"crystal_{tier}.png"
    if p.exists():
        pc, sc = extract_crystal_palette(p)
        CRYSTAL_COLORS[tier] = (pc, sc)
        print(f"  T{tier:2d}: primary={pc}  secondary={sc}")
    else:
        CRYSTAL_COLORS[tier] = ("#808080", "#b0b0b0")
        print(f"  T{tier:2d}: crystal_{tier}.png not found, using grey fallback")


# ── Step 3: build data URIs ───────────────────────────────────────────────────

print("Loading data URIs...")
CAND_URIS = {}
for n in CANDS:
    stem = f"crystal9_orb_cand_{n}"
    CAND_URIS[n] = {
        "orig":      data_uri(TMP_DIR / f"{stem}.png"),
        "primary":   data_uri(TMP_DIR / f"{stem}_mask_primary.png"),
        "secondary": data_uri(TMP_DIR / f"{stem}_mask_secondary.png"),
        "shine":     data_uri(TMP_DIR / f"{stem}_mask_shine.png"),
    }

# Crystal images for the palette reference strip
CRYS_URIS = {}
for tier in range(1, 11):
    p = CRYS_DIR / f"crystal_{tier}.png"
    if p.exists():
        CRYS_URIS[tier] = data_uri(p)


# ── Step 4: HTML generation helpers ──────────────────────────────────────────

def tri_orb_inline(n, pc, sc, size="64px"):
    """Three-sibling orb using candidate n's masks (set via CSS class .c-N)."""
    return (
        f'<div class="tri-wrap c-{n}" style="width:{size};height:{size};--pc:{pc};--sc:{sc};">'
        f'<div class="layer-p"></div>'
        f'<div class="layer-s"></div>'
        f'<div class="layer-g"></div>'
        f'</div>'
    )

# Build per-candidate CSS classes (override --mask-* vars)
def cand_css(n, uris):
    return (
        f'.c-{n} {{\n'
        f'  --mask-primary:   url("{uris["primary"]}");\n'
        f'  --mask-secondary: url("{uris["secondary"]}");\n'
        f'  --mask-shine:     url("{uris["shine"]}");\n'
        f'  --orig-orb:       url("{uris["orig"]}");\n'
        f'}}'
    )

ALL_CAND_CSS = "\n".join(cand_css(n, CAND_URIS[n]) for n in CANDS)

# Crystal palette reference strip
def crys_row(tier):
    pc, sc = CRYSTAL_COLORS[tier]
    img = f'<img src="{CRYS_URIS.get(tier,"")}" style="width:48px;height:48px;object-fit:contain;">' if tier in CRYS_URIS else ""
    swatch_pc = f'<div class="swatch" style="background:{pc};" title="{pc}"></div>'
    swatch_sc = f'<div class="swatch" style="background:{sc};" title="{sc}"></div>'
    # Pick first available candidate to show palette on a particle
    demo_n = CANDS[0] if CANDS else 0
    orb = tri_orb_inline(demo_n, pc, sc, "40px")
    return (
        f'<div class="crys-row">'
        f'<div class="crys-tier">T{tier}</div>'
        f'<div class="crys-img">{img}</div>'
        f'<div class="crys-swatches">{swatch_pc}{swatch_sc}</div>'
        f'<div class="crys-hex"><span style="color:{pc}">{pc}</span>'
        f' <span style="color:{sc};font-size:10px">{sc}</span></div>'
        f'<div class="crys-demo">{orb}</div>'
        f'</div>'
    )

CRYS_ROWS = "\n".join(crys_row(t) for t in range(1, 11))

# Pick 4 representative tiers to show per candidate
SHOW_TIERS = [1, 3, 6, 9]

def cand_card(n):
    orig_uri = CAND_URIS[n]["orig"]
    tier_orbs = "".join(
        f'<div class="cand-combo">'
        f'{tri_orb_inline(n, CRYSTAL_COLORS[t][0], CRYSTAL_COLORS[t][1], "56px")}'
        f'<div class="combo-lbl">T{t}</div>'
        f'</div>'
        for t in SHOW_TIERS
    )
    return (
        f'<div class="cand-card">'
        f'<div class="cand-header">Cand {n}</div>'
        f'<div class="cand-body">'
        f'<div class="cand-combo">'
        f'<img src="{orig_uri}" class="cand-orig-img">'
        f'<div class="combo-lbl">original</div>'
        f'</div>'
        f'{tier_orbs}'
        f'</div>'
        f'</div>'
    )

CAND_CARDS = "\n".join(cand_card(n) for n in CANDS)


# ── Step 5: write HTML ────────────────────────────────────────────────────────

HTML = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Candidate comparison -- crystal9_orb x 10-tier palette</title>
<style>
  :root {{
    --bg-page:   #040a0e;
    --bg-cell:   rgba(20,28,36,.85);
    --bg-dark:   rgba(10,16,22,.95);
    --border-c:  rgba(110,200,180,.18);
    --text-pri:  #d8eaff;
    --text-mut:  rgba(220,230,240,.65);
    --text-soft: rgba(180,200,220,.45);
    --cyan:      #7adcc4;
    --gold:      #f5af14;
    --violet:    #cc88ff;
    --warn:      #f57a1a;
  }}
  * {{ box-sizing:border-box; }}
  html,body {{ margin:0; padding:0; background:var(--bg-page); color:var(--text-pri);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
    -webkit-font-smoothing:antialiased; }}

  header {{ padding:14px 20px 10px; border-bottom:1px solid var(--border-c); }}
  header h1 {{ margin:0 0 3px; font-size:16px; font-weight:700; }}
  header p  {{ margin:0; font-size:12px; color:var(--text-mut); max-width:800px; }}

  section {{ padding:14px 20px 18px; border-bottom:1px solid var(--border-c); }}
  section h2 {{ margin:0 0 10px; font-size:13px; font-weight:700; color:var(--cyan);
                letter-spacing:.03em; text-transform:uppercase; }}
  .note {{ font-size:11px; color:var(--text-soft); margin:0 0 12px; line-height:1.5; max-width:800px; }}
  .note code {{ background:rgba(0,0,0,.4); padding:1px 5px; border-radius:3px;
                font-size:10.5px; color:var(--cyan); }}

  /* ── Crystal palette strip ───────────────────────────────────────────────── */
  .crys-strip {{ display:flex; flex-direction:column; gap:6px; max-width:700px; }}
  .crys-row   {{ display:grid; grid-template-columns:28px 56px 60px 1fr 48px;
                 align-items:center; gap:10px;
                 background:var(--bg-cell); border:1px solid var(--border-c);
                 border-radius:5px; padding:6px 10px; }}
  .crys-tier  {{ font-size:11px; font-weight:700; color:var(--text-pri); }}
  .crys-img img {{ display:block; image-rendering:pixelated; }}
  .crys-swatches {{ display:flex; gap:5px; }}
  .swatch     {{ width:22px; height:22px; border-radius:3px; border:1px solid rgba(255,255,255,.1); }}
  .crys-hex   {{ font-size:10px; font-family:ui-monospace,"Cascadia Mono",monospace; color:var(--text-soft); }}
  .crys-demo  {{ display:flex; justify-content:center; }}

  /* ── Candidate grid ──────────────────────────────────────────────────────── */
  .cand-grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:10px; }}
  .cand-card {{ background:var(--bg-cell); border:1px solid var(--border-c); border-radius:6px;
                padding:10px; }}
  .cand-header {{ font-size:11px; font-weight:700; color:var(--text-mut);
                  margin-bottom:8px; text-align:center; letter-spacing:.04em; }}
  .cand-body   {{ display:flex; gap:8px; align-items:center; justify-content:center; flex-wrap:wrap; }}
  .cand-combo  {{ display:flex; flex-direction:column; align-items:center; gap:4px; }}
  .cand-orig-img {{ width:56px; height:56px; object-fit:contain; image-rendering:pixelated;
                    background:var(--bg-dark); border-radius:3px; }}
  .combo-lbl   {{ font-size:9px; color:var(--text-soft); text-align:center;
                  font-family:ui-monospace,monospace; }}

  /* ── Three-layer particle renderer ──────────────────────────────────────── */
  /* Per-candidate mask vars -- set on .c-N; inherited by .layer-p/s/g children */
{ALL_CAND_CSS}

  .tri-wrap {{ position:relative; }}
  .tri-wrap .layer-p,
  .tri-wrap .layer-s,
  .tri-wrap .layer-g {{
    position:absolute; inset:0;
    -webkit-mask-size:contain; mask-size:contain;
    -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat;
    -webkit-mask-position:center; mask-position:center;
  }}
  .tri-wrap .layer-p {{
    background-color:var(--pc,#508cf0);
    -webkit-mask-image:var(--mask-primary); mask-image:var(--mask-primary);
    -webkit-mask-mode:luminance; mask-mode:luminance;
  }}
  .tri-wrap .layer-s {{
    background-color:var(--sc,#88b4f8);
    -webkit-mask-image:var(--mask-secondary); mask-image:var(--mask-secondary);
    -webkit-mask-mode:luminance; mask-mode:luminance;
  }}
  .tri-wrap .layer-g {{
    background-image:var(--orig-orb);
    background-size:contain; background-repeat:no-repeat; background-position:center;
    -webkit-mask-image:var(--mask-shine); mask-image:var(--mask-shine);
  }}
</style>
</head>
<body>

<header>
  <h1>Candidate comparison -- crystal9_orb</h1>
  <p>
    16 candidates x improved pipeline (shine v2: lum &ge; {SHINE_LUM_LO} AND spread &le; {SHINE_SPREAD}).
    Crystal tier colours auto-extracted via k-means from each <code>crystal_N.png</code>.
    Each card shows the original + T1/T3/T6/T9 applied.
  </p>
</header>

<section>
  <h2>Crystal tier palette (auto-extracted)</h2>
  <p class="note">
    Primary = darker cluster, secondary = brighter cluster.
    Excludes outline pixels (L &lt; 25) and shine pixels from clustering.
    The mini-orb shows how the first candidate looks with that tier's colours.
  </p>
  <div class="crys-strip">
{CRYS_ROWS}
  </div>
</section>

<section>
  <h2>All 16 candidates -- T1 / T3 / T6 / T9 applied</h2>
  <p class="note">
    Shine layer uses the candidate's original baked pixels (near-white highlight, uncoloured).
    Primary and secondary respond to the extracted tier colours.
  </p>
  <div class="cand-grid">
{CAND_CARDS}
  </div>
</section>

</body>
</html>
"""

OUT_HTML.write_text(HTML, encoding="utf-8")
print(f"\nWritten: {OUT_HTML.relative_to(ROOT)}  ({len(HTML):,} chars)")
