"""
build_particle_mask_mockup.py — self-contained particle-mask demo HTML.
All PNGs inlined as base64; works on file:// double-click.

Architecture (the key insight):
  Three SIBLING divs inside a wrapper — each has its own independent mask.
  ::before / ::after pseudo-elements inherit the parent's mask, so they
  cannot escape it. Siblings are the only CSS-only way to stack layers
  with truly independent masks.

  Layer 1  .layer-p  -- primary body (L < 180), luminance mask -> --pc
  Layer 2  .layer-s  -- secondary zone (L 180-219), luminance mask -> --sc
  Layer 3  .layer-g  -- shine (L >= 220), alpha mask on ORIGINAL PNG pixels
                        (no CSS colour var -- always the original baked colour)

Per-particle mask switching:
  CSS vars --mask-primary / --mask-secondary / --mask-shine / --orig-orb are
  set on :root for the default (qi_orb_bright) particle. For other particles
  the same .layer-p/s/g classes work unchanged -- just override those four
  vars on the wrapper div via inline style. CSS inheritance does the rest.
"""

import base64
from pathlib import Path

ROOT     = Path(__file__).parent.parent
PART_DIR = ROOT / "public/sprites/vfx/qi_particles"
OUT_HTML = ROOT / "public/mockup-particle-mask.html"

# qi_orb_bright -- original cyan particle (baseline / approach comparisons)
ASSETS_ORB = {
    "orig":      "qi_orb_bright.png",
    "alpha":     "qi_orb_bright_mask_alpha.png",
    "lum":       "qi_orb_bright_mask_lum.png",
    "primary":   "qi_orb_bright_mask_primary.png",
    "secondary": "qi_orb_bright_mask_secondary.png",
    "shine":     "qi_orb_bright_mask_shine.png",
}

# crystal9_orb -- new particle with violet/amber/white-yellow zone structure
ASSETS_C9 = {
    "orig":      "crystal9_orb.png",
    "primary":   "crystal9_orb_mask_primary.png",
    "secondary": "crystal9_orb_mask_secondary.png",
    "shine":     "crystal9_orb_mask_shine.png",
    "lum":       "crystal9_orb_mask_lum.png",
    "alpha":     "crystal9_orb_mask_alpha.png",
}

def data_uri(path: Path) -> str:
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode("ascii")

uris     = {key: data_uri(PART_DIR / name) for key, name in ASSETS_ORB.items()}
uris_c9  = {key: data_uri(PART_DIR / name) for key, name in ASSETS_C9.items()}

# ── Per-tier colours ──────────────────────────────────────────────────────────
# primary: main body tint  |  secondary: inner glow / accent
TIERS = [
    (1,  "#8899bb", "#b0bfd8", "blue-grey"),
    (2,  "#4488bb", "#7ab2d8", "blue"),
    (3,  "#00bbcc", "#55d8e8", "cyan"),
    (4,  "#508cf0", "#88b4f8", "deep blue"),
    (5,  "#505fdc", "#8a96ee", "indigo"),
    (6,  "#8c3cdc", "#c480f0", "violet"),
    (7,  "#aa46e6", "#d488ff", "purple"),
    (8,  "#cc99ff", "#e8ccff", "pale lilac"),
    (9,  "#ffcc44", "#ffe899", "gold"),
    (10, "#ffaa22", "#ffcc88", "orange-gold"),
]

# Crystal 9 natural colours: violet body, amber inner glow
C9_PC = "#a040c8"
C9_SC = "#ffcc44"

# hue-rotate values from HomeScreen.jsx CRYSTAL_VFX_TIER_TINT
HR_FILTERS = {
    1:  "hue-rotate(0deg)    saturate(0.40)",
    2:  "hue-rotate(0deg)    saturate(0.90)",
    3:  "hue-rotate(-15deg)  saturate(1.10)",
    4:  "hue-rotate(10deg)   saturate(1.10)",
    5:  "hue-rotate(20deg)   saturate(1.15)",
    6:  "hue-rotate(55deg)   saturate(1.20)",
    7:  "hue-rotate(85deg)   saturate(1.25)",
    8:  "hue-rotate(100deg)  saturate(1.10)",
    9:  "hue-rotate(-130deg) saturate(1.35)",
    10: "hue-rotate(-140deg) saturate(1.40)",
}

# Two-tone showcase -- cross-family combos
DUO = [
    ("#8c3cdc", "#f5af14", "Violet + gold (crystal 8 feel)"),
    ("#222a36", "#7adcc4", "Onyx + jade"),
    ("#be123c", "#fde68a", "Crimson + cream"),
    ("#0c4a6e", "#f59e0b", "Ocean + amber"),
    ("#166534", "#ffd700", "Forest + gold"),
    ("#1e1b4b", "#f43f5e", "Midnight + rose"),
]


# ── CSS var override string for crystal9 wrappers ────────────────────────────
# Sets the four mask vars on the wrapper so inherited .layer-p/s/g children
# pick up c9 masks instead of the :root defaults (qi_orb_bright).
C9_MASK_OVERRIDE = (
    "--mask-primary:var(--c9-mask-primary);"
    "--mask-secondary:var(--c9-mask-secondary);"
    "--mask-shine:var(--c9-mask-shine);"
    "--orig-orb:var(--c9-orig-orb);"
)


# ── HTML fragment builders ────────────────────────────────────────────────────

def tri_orb(pc, sc, size="64px", c9=False):
    """Three-sibling layer stack.
    c9=True: overrides mask vars on the wrapper to use crystal9_orb masks."""
    extra = C9_MASK_OVERRIDE if c9 else ""
    return (
        f'<div class="tri-wrap" style="width:{size};height:{size};--pc:{pc};--sc:{sc};{extra}">'
        f'<div class="layer-p"></div>'
        f'<div class="layer-s"></div>'
        f'<div class="layer-g"></div>'
        f'</div>'
    )

def tier_cell_hr(t, label):
    return (
        f'<div class="tier-cell">'
        f'<div class="stage"><div class="hr-orb" style="filter:{HR_FILTERS[t]};"></div></div>'
        f'<div class="label">T{t}</div><div class="hex">{label}</div>'
        f'</div>'
    )

def tier_cell_tri(t, pc, sc, label, c9=False):
    return (
        f'<div class="tier-cell">'
        f'<div class="stage">{tri_orb(pc, sc, c9=c9)}</div>'
        f'<div class="label">T{t}</div>'
        f'<div class="hex"><span style="color:{pc}">{pc}</span>'
        f'<br><span style="color:{sc};font-size:9px">{sc}</span></div>'
        f'</div>'
    )

def duo_cell(pc, sc, label, c9=False):
    return (
        f'<div class="duo-cell">'
        f'<div class="duo-stage">{tri_orb(pc, sc, "96px", c9=c9)}</div>'
        f'<div class="duo-label">{label}</div>'
        f'<div class="duo-hex">'
        f'<span style="color:{pc}">&#9632; {pc}</span><br>'
        f'<span style="color:{sc}">&#9632; {sc}</span>'
        f'</div>'
        f'</div>'
    )

hr_cells       = "\n".join(tier_cell_hr(t, l)               for t, pc, sc, l in TIERS)
tri_cells      = "\n".join(tier_cell_tri(t, pc, sc, l)      for t, pc, sc, l in TIERS)
tri_cells_c9   = "\n".join(tier_cell_tri(t, pc, sc, l, c9=True) for t, pc, sc, l in TIERS)
duo_cells      = "\n".join(duo_cell(pc, sc, l)              for pc, sc, l in DUO)
duo_cells_c9   = "\n".join(duo_cell(pc, sc, l, c9=True)     for pc, sc, l in DUO)


HTML = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Particle Mask — 3-layer material (primary + secondary + shine)</title>
<style>
  :root {{
    /* qi_orb_bright (default / baseline) */
    --orig-orb:       url("{uris['orig']}");
    --mask-alpha:     url("{uris['alpha']}");
    --mask-lum:       url("{uris['lum']}");
    --mask-primary:   url("{uris['primary']}");
    --mask-secondary: url("{uris['secondary']}");
    --mask-shine:     url("{uris['shine']}");

    /* crystal9_orb -- referenced explicitly by c9 wrappers */
    --c9-orig-orb:       url("{uris_c9['orig']}");
    --c9-mask-primary:   url("{uris_c9['primary']}");
    --c9-mask-secondary: url("{uris_c9['secondary']}");
    --c9-mask-shine:     url("{uris_c9['shine']}");
    --c9-mask-lum:       url("{uris_c9['lum']}");
    --c9-mask-alpha:     url("{uris_c9['alpha']}");

    --bg-page:   rgba(4, 10, 14, 0.97);
    --bg-cell:   rgba(20, 28, 36, 0.80);
    --bg-cell-d: rgba(10, 16, 22, 0.95);
    --border-c:  rgba(110, 200, 180, 0.18);
    --text-pri:  #d8eaff;
    --text-mut:  rgba(220, 230, 240, 0.65);
    --text-soft: rgba(180, 200, 220, 0.45);
    --cyan:      #7adcc4;
    --gold:      #f5af14;
    --warn:      #f57a1a;
    --ok:        #7adcc4;
    --violet:    #cc88ff;
  }}
  * {{ box-sizing: border-box; }}
  html, body {{ margin:0; padding:0; background:var(--bg-page); color:var(--text-pri);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
    -webkit-font-smoothing:antialiased; }}

  header {{ padding:16px 24px 12px; border-bottom:1px solid var(--border-c); }}
  header h1 {{ margin:0 0 4px; font-size:18px; font-weight:700; }}
  header p  {{ margin:0; font-size:13px; color:var(--text-mut); max-width:820px; line-height:1.55; }}
  header em {{ color:var(--cyan); font-style:normal; font-weight:700; }}
  header strong {{ color:var(--gold); }}

  section {{ padding:18px 24px 22px; border-bottom:1px solid var(--border-c); }}
  section h2 {{ margin:0 0 4px; font-size:14px; font-weight:700; color:var(--cyan); letter-spacing:.02em; }}
  section.c9-section h2 {{ color:var(--violet); }}
  section h2 .kbd {{ font-size:11px; color:var(--text-soft); font-weight:500; margin-left:8px; }}
  .pill {{ display:inline-block; margin-left:7px; padding:1px 8px; border-radius:10px;
           font-size:10px; font-weight:700; }}
  .pill-warn   {{ background:rgba(245,122,26,.15); color:var(--warn); }}
  .pill-ok     {{ background:rgba(122,220,196,.15); color:var(--ok); }}
  .pill-violet {{ background:rgba(204,136,255,.12); color:var(--violet); }}
  section > p.lede {{ margin:0 0 14px; font-size:12.5px; color:var(--text-mut);
                      max-width:820px; line-height:1.55; }}
  section > p.lede code {{ background:rgba(0,0,0,.35); padding:1px 6px; border-radius:3px;
                            font-size:11.5px; color:var(--cyan); }}
  section > p.lede strong {{ color:var(--gold); }}
  .sub-h {{ margin:18px 0 8px; font-size:12px; font-weight:700; color:var(--text-mut);
            text-transform:uppercase; letter-spacing:.05em; }}

  /* ── Assets row ──────────────────────────────────────────────────────────── */
  .asset-row {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr));
               gap:12px; max-width:1050px; }}
  .asset-cell {{ background:var(--bg-cell); border:1px solid var(--border-c); border-radius:6px;
                 padding:12px; display:flex; flex-direction:column; align-items:center; gap:7px; }}
  .asset-swatch {{
    width:96px; height:96px; display:flex; align-items:center; justify-content:center;
    background: linear-gradient(45deg,rgba(255,255,255,.04) 25%,transparent 25%,transparent 75%,rgba(255,255,255,.04) 75%),
                linear-gradient(45deg,rgba(255,255,255,.04) 25%,transparent 25%,transparent 75%,rgba(255,255,255,.04) 75%),
                var(--bg-cell-d);
    background-size:14px 14px; background-position:0 0,7px 7px;
    border-radius:4px; border:1px solid rgba(255,255,255,.05);
  }}
  .asset-swatch .png {{ width:64px; height:64px; background-size:contain;
                        background-repeat:no-repeat; background-position:center; }}
  .asset-label {{ font-size:11px; font-weight:700; color:var(--text-pri); }}
  .asset-desc  {{ font-size:10px; color:var(--text-soft); text-align:center; line-height:1.4; }}

  /* ── Tier grid ───────────────────────────────────────────────────────────── */
  .tier-grid {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(84px,1fr)); gap:9px; }}
  @media(min-width:1100px) {{ .tier-grid {{ grid-template-columns:repeat(10,minmax(0,1fr)); }} }}
  .tier-cell {{ background:var(--bg-cell); border:1px solid var(--border-c); border-radius:6px;
                padding:9px 5px 7px; display:flex; flex-direction:column; align-items:center; gap:5px; }}
  .tier-cell .stage {{ width:100%; aspect-ratio:1/1; display:flex; align-items:center;
                       justify-content:center; background:var(--bg-cell-d); border-radius:4px; }}
  .tier-cell .label {{ font-size:10.5px; font-weight:700; color:var(--text-pri); }}
  .tier-cell .hex   {{ font-size:9px; color:var(--text-soft);
                       font-family:ui-monospace,"Cascadia Mono","Consolas",monospace; line-height:1.4; text-align:center; }}

  /* ── Compare row (before/after) ──────────────────────────────────────────── */
  .compare-row {{ display:flex; gap:16px; flex-wrap:wrap; align-items:flex-start; margin-bottom:18px; }}
  .compare-cell {{ background:var(--bg-cell); border:1px solid var(--border-c); border-radius:6px;
                   padding:14px 12px; display:flex; flex-direction:column; align-items:center; gap:8px;
                   min-width:120px; }}
  .compare-stage {{ width:128px; height:128px; display:flex; align-items:center; justify-content:center;
                    background:var(--bg-cell-d); border-radius:4px; }}
  .compare-label {{ font-size:11px; font-weight:700; color:var(--text-pri); }}
  .compare-note  {{ font-size:10px; color:var(--text-soft); text-align:center; line-height:1.4;
                    font-family:ui-monospace,"Cascadia Mono","Consolas",monospace; }}

  /* ── Approach A: hue-rotate ──────────────────────────────────────────────── */
  .hr-orb {{ width:64px; height:64px; background-image:var(--orig-orb); background-size:contain;
             background-repeat:no-repeat; background-position:center; }}

  /* ── 3-sibling layer stack ───────────────────────────────────────────────── */
  /* CRITICAL: siblings, NOT ::before/::after. Pseudo-elements inherit the
     parent's mask and cannot render above it. Each sibling owns its own mask. */
  .tri-wrap {{ position:relative; /* width/height set inline */ }}
  .tri-wrap .layer-p,
  .tri-wrap .layer-s,
  .tri-wrap .layer-g {{ position:absolute; inset:0;
    -webkit-mask-size:contain; mask-size:contain;
    -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat;
    -webkit-mask-position:center; mask-position:center; }}

  /* Layer 1: primary body -- L < 180, luminance mode */
  .tri-wrap .layer-p {{
    background-color: var(--pc, #508cf0);
    -webkit-mask-image:var(--mask-primary); mask-image:var(--mask-primary);
    -webkit-mask-mode:luminance; mask-mode:luminance;
  }}
  /* Layer 2: secondary accent -- L 180-219, luminance mode */
  .tri-wrap .layer-s {{
    background-color: var(--sc, #88b4f8);
    -webkit-mask-image:var(--mask-secondary); mask-image:var(--mask-secondary);
    -webkit-mask-mode:luminance; mask-mode:luminance;
  }}
  /* Layer 3: shine -- L >= 220, alpha mode on ORIGINAL PNG.
     No color variable. Always shows the original baked pixel colours. */
  .tri-wrap .layer-g {{
    background-image:var(--orig-orb);
    background-size:contain; background-repeat:no-repeat; background-position:center;
    -webkit-mask-image:var(--mask-shine); mask-image:var(--mask-shine);
    /* alpha mode (default) -- white pixels in shine mask reveal the original image */
  }}

  /* ── Duo grid ────────────────────────────────────────────────────────────── */
  .duo-grid {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; max-width:1100px; }}
  .duo-cell {{ background:var(--bg-cell); border:1px solid var(--border-c); border-radius:6px;
               padding:14px 10px 12px; display:flex; flex-direction:column; align-items:center; gap:8px; }}
  .duo-stage {{ width:100%; aspect-ratio:1/1; display:flex; align-items:center; justify-content:center;
                background:var(--bg-cell-d); border-radius:4px; }}
  .duo-label {{ font-size:11px; font-weight:700; color:var(--text-pri); text-align:center; }}
  .duo-hex   {{ font-size:10px; line-height:1.6; color:var(--text-soft);
                font-family:ui-monospace,"Cascadia Mono","Consolas",monospace; text-align:center; }}

  /* ── Live picker ─────────────────────────────────────────────────────────── */
  .picker-row {{ display:grid; grid-template-columns:1fr; gap:20px; align-items:center; max-width:960px; }}
  @media(min-width:700px) {{ .picker-row {{ grid-template-columns:240px 1fr; }} }}
  .picker-controls {{ background:var(--bg-cell); border:1px solid var(--border-c); border-radius:6px;
                      padding:16px; display:flex; flex-direction:column; gap:14px; }}
  .picker-controls .grp {{ display:flex; flex-direction:column; gap:5px; }}
  .picker-controls .grp-lbl {{ font-size:10px; color:var(--text-soft); text-transform:uppercase;
                                letter-spacing:.06em; font-weight:700; }}
  .picker-controls input[type="color"] {{ width:100%; height:34px; background:transparent;
    border:1px solid var(--border-c); border-radius:4px; cursor:pointer; }}
  .picker-controls input[type="text"] {{ width:100%; padding:6px 8px; background:var(--bg-cell-d);
    color:var(--text-pri); border:1px solid var(--border-c); border-radius:4px;
    font-family:ui-monospace,"Cascadia Mono","Consolas",monospace; font-size:11.5px; }}
  .picker-controls .shine-row {{ display:flex; align-items:center; gap:8px;
    padding:8px 10px; background:var(--bg-cell-d); border:1px solid var(--border-c); border-radius:4px; }}
  .picker-controls .shine-dot {{ width:18px; height:18px; border-radius:50%;
    background:linear-gradient(135deg,#fff 40%,#c8eeff 100%); flex-shrink:0; }}
  .picker-controls .shine-note {{ font-size:10.5px; color:var(--text-soft); line-height:1.4; }}
  .picker-stage {{ background:var(--bg-cell); border:1px solid var(--border-c); border-radius:6px;
                   padding:20px; display:flex; align-items:center; justify-content:center; }}

  .footer {{ padding:18px 24px 30px; font-size:12px; color:var(--text-mut); max-width:900px; line-height:1.6; }}
  .footer strong {{ color:var(--gold); }}
  .footer code {{ background:rgba(0,0,0,.35); padding:1px 6px; border-radius:3px;
                  font-size:11.5px; color:var(--cyan); }}
</style>
</head>
<body>

<header>
  <h1>Particle Mask — 3-layer material</h1>
  <p>
    <em>primary</em> (body) + <em>secondary</em> (inner accent) + <em>shine</em> (original pixel colours, locked).
    Three sibling divs -- not pseudo-elements -- so each layer's mask is truly independent.
    Same particle, any colour combination, no new art required.
    <strong>CSS var inheritance</strong> means any new particle only needs 4 vars overridden on the wrapper.
  </p>
</header>


<!-- =====================================================================
     SECTION: Crystal 9 orb -- new particle pipeline demo
     ===================================================================== -->

<section class="c9-section">
  <h2>Crystal 9 orb <span class="pill pill-violet">new particle</span></h2>
  <p class="lede">
    Generated at 64x64 using <code>qi_orb_bright</code> as shape reference.
    Palette zones: violet outer body (#a040c8), amber-gold inner ring (#ffcc44), white-yellow shine core.
    The pipeline splits these automatically by luminance: primary (L&lt;180), secondary (L 180-219), shine (L&ge;220).
  </p>

  <div class="sub-h">Assets</div>
  <div class="asset-row">
    <div class="asset-cell">
      <div class="asset-swatch"><div class="png" style="background-image:var(--c9-orig-orb);"></div></div>
      <div class="asset-label">Original</div>
      <div class="asset-desc">Generated pixel art. As painted.</div>
    </div>
    <div class="asset-cell">
      <div class="asset-swatch"><div class="png" style="background-image:var(--c9-mask-primary);"></div></div>
      <div class="asset-label">Primary (L&lt;180)</div>
      <div class="asset-desc">Outer violet body. Tint with --pc.</div>
    </div>
    <div class="asset-cell">
      <div class="asset-swatch"><div class="png" style="background-image:var(--c9-mask-secondary);"></div></div>
      <div class="asset-label">Secondary (L 180-219)</div>
      <div class="asset-desc">Inner amber ring. Tint with --sc.</div>
    </div>
    <div class="asset-cell">
      <div class="asset-swatch"><div class="png" style="background-image:var(--c9-mask-shine);"></div></div>
      <div class="asset-label">Shine (L&ge;220)</div>
      <div class="asset-desc">Core pixels. Original colour, locked.</div>
    </div>
    <div class="asset-cell">
      <div class="asset-swatch"><div class="png" style="background-image:var(--c9-mask-lum);"></div></div>
      <div class="asset-label">Lum (reference)</div>
      <div class="asset-desc">Full grayscale -- not used in pipeline.</div>
    </div>
  </div>

  <div class="sub-h">Before / after pipeline</div>
  <div class="compare-row">
    <div class="compare-cell">
      <div class="compare-stage">
        <div style="width:96px;height:96px;background-image:var(--c9-orig-orb);
             background-size:contain;background-repeat:no-repeat;background-position:center;"></div>
      </div>
      <div class="compare-label">Original</div>
      <div class="compare-note">Generated colours<br>as-is from PixelLab</div>
    </div>
    <div class="compare-cell">
      <div class="compare-stage">
        {tri_orb(C9_PC, C9_SC, "96px", c9=True)}
      </div>
      <div class="compare-label">Crystal 9 natural</div>
      <div class="compare-note" style="color:var(--violet)">--pc: {C9_PC}<br>
        <span style="color:var(--gold)">--sc: {C9_SC}</span></div>
    </div>
    <div class="compare-cell">
      <div class="compare-stage">
        {tri_orb("#be123c", "#fde68a", "96px", c9=True)}
      </div>
      <div class="compare-label">Crimson + cream</div>
      <div class="compare-note" style="color:#be123c">--pc: #be123c<br>
        <span style="color:#fde68a">--sc: #fde68a</span></div>
    </div>
    <div class="compare-cell">
      <div class="compare-stage">
        {tri_orb("#0c4a6e", "#f59e0b", "96px", c9=True)}
      </div>
      <div class="compare-label">Ocean + amber</div>
      <div class="compare-note" style="color:#38bdf8">--pc: #0c4a6e<br>
        <span style="color:#f59e0b">--sc: #f59e0b</span></div>
    </div>
    <div class="compare-cell">
      <div class="compare-stage">
        {tri_orb("#166534", "#ffd700", "96px", c9=True)}
      </div>
      <div class="compare-label">Forest + gold</div>
      <div class="compare-note" style="color:#4ade80">--pc: #166534<br>
        <span style="color:#ffd700">--sc: #ffd700</span></div>
    </div>
    <div class="compare-cell">
      <div class="compare-stage">
        {tri_orb("#1e1b4b", "#f43f5e", "96px", c9=True)}
      </div>
      <div class="compare-label">Midnight + rose</div>
      <div class="compare-note" style="color:#a5b4fc">--pc: #1e1b4b<br>
        <span style="color:#f43f5e">--sc: #f43f5e</span></div>
    </div>
  </div>

  <div class="sub-h">All 10 tiers on crystal9_orb</div>
  <div class="tier-grid">
{tri_cells_c9}
  </div>

  <div class="sub-h" style="margin-top:22px">Live picker -- crystal9_orb</div>
  <p class="lede" style="margin-bottom:12px;">
    Dial in any combination. Shine core always shows original baked colour.
  </p>
  <div class="picker-row">
    <div class="picker-controls">
      <div class="grp">
        <div class="grp-lbl">Primary -- outer body (L &lt; 180)</div>
        <input type="color" id="c9-pc-picker" value="{C9_PC}">
        <input type="text"  id="c9-pc-hex"    value="{C9_PC}" maxlength="9">
      </div>
      <div class="grp">
        <div class="grp-lbl">Secondary -- inner ring (L 180-219)</div>
        <input type="color" id="c9-sc-picker" value="{C9_SC}">
        <input type="text"  id="c9-sc-hex"    value="{C9_SC}" maxlength="9">
      </div>
      <div class="shine-row">
        <div class="shine-dot"></div>
        <div class="shine-note">Shine (L &ge; 220) always shows<br>original pixel colour -- not configurable.</div>
      </div>
    </div>
    <div class="picker-stage">
      <div class="tri-wrap" id="live-orb-c9"
           style="width:192px;height:192px;--pc:{C9_PC};--sc:{C9_SC};{C9_MASK_OVERRIDE}">
        <div class="layer-p"></div>
        <div class="layer-s"></div>
        <div class="layer-g"></div>
      </div>
    </div>
  </div>
</section>


<!-- =====================================================================
     SECTION: Original qi_orb_bright assets (reference / baseline)
     ===================================================================== -->

<section>
  <h2>qi_orb_bright assets <span class="pill pill-ok">baseline</span></h2>
  <p class="lede">
    Original cyan particle. Baseline for approach comparison below.
    <code>primary</code> and <code>secondary</code> are luminance-mode masks.
    <code>shine</code> is an alpha-mode mask paired with the <strong>original PNG</strong> as
    background -- the shine pixels always render their baked colour.
  </p>
  <div class="asset-row">
    <div class="asset-cell">
      <div class="asset-swatch"><div class="png" style="background-image:var(--orig-orb);"></div></div>
      <div class="asset-label">Original</div>
      <div class="asset-desc">Baked cyan colour. Untouched.</div>
    </div>
    <div class="asset-cell">
      <div class="asset-swatch"><div class="png" style="background-image:var(--mask-alpha);"></div></div>
      <div class="asset-label">Alpha mask</div>
      <div class="asset-desc">Full silhouette, hard fill.</div>
    </div>
    <div class="asset-cell">
      <div class="asset-swatch"><div class="png" style="background-image:var(--mask-lum);"></div></div>
      <div class="asset-label">Lum mask</div>
      <div class="asset-desc">Full grayscale (reference only).</div>
    </div>
    <div class="asset-cell">
      <div class="asset-swatch"><div class="png" style="background-image:var(--mask-primary);"></div></div>
      <div class="asset-label">Primary (L&lt;180)</div>
      <div class="asset-desc">Dark outer body. Tint with --pc.</div>
    </div>
    <div class="asset-cell">
      <div class="asset-swatch"><div class="png" style="background-image:var(--mask-secondary);"></div></div>
      <div class="asset-label">Secondary (L 180-219)</div>
      <div class="asset-desc">Inner glow ring. Tint with --sc.</div>
    </div>
    <div class="asset-cell">
      <div class="asset-swatch"><div class="png" style="background-image:var(--mask-shine);"></div></div>
      <div class="asset-label">Shine (L&ge;220)</div>
      <div class="asset-desc">Specular pixels. Original colour, locked.</div>
    </div>
  </div>
</section>

<section>
  <h2>Approach A -- hue-rotate <span class="pill pill-warn">current production</span></h2>
  <p class="lede">Today's production approach.</p>
  <div class="tier-grid">
{hr_cells}
  </div>
</section>

<section>
  <h2>Approach C -- 3 sibling layers on qi_orb_bright <span class="pill pill-ok">the fix</span></h2>
  <p class="lede">
    Three sibling <code>div</code>s inside a wrapper. Each has its own independent mask --
    no parent mask interference. Shine layer uses the <strong>original PNG as
    background-image</strong>, revealing its baked near-white pixels exactly as painted.
    Primary + secondary are fully configurable CSS variables.
  </p>
  <div class="tier-grid">
{tri_cells}
  </div>
</section>

<section>
  <h2>Two-tone -- cross-family combos on qi_orb_bright <span class="pill pill-ok">secondary is any colour</span></h2>
  <p class="lede">
    The secondary zone is the inner glow ring (L 180-219). It can be a lighter shade of
    primary (same family) or a completely different hue. Shine is still original in all cases.
  </p>
  <div class="duo-grid">
{duo_cells}
  </div>
</section>

<section>
  <h2>Live picker -- qi_orb_bright (primary + secondary)</h2>
  <div class="picker-row">
    <div class="picker-controls">
      <div class="grp">
        <div class="grp-lbl">Primary -- body (L &lt; 180)</div>
        <input type="color" id="pc-picker" value="#8c3cdc">
        <input type="text"  id="pc-hex"    value="#8c3cdc" maxlength="9">
      </div>
      <div class="grp">
        <div class="grp-lbl">Secondary -- inner glow (L 180-219)</div>
        <input type="color" id="sc-picker" value="#f5af14">
        <input type="text"  id="sc-hex"    value="#f5af14" maxlength="9">
      </div>
      <div class="shine-row">
        <div class="shine-dot"></div>
        <div class="shine-note">Shine (L &ge; 220) always shows<br>original pixel colour -- not configurable.</div>
      </div>
    </div>
    <div class="picker-stage">
      <div class="tri-wrap" id="live-orb" style="width:192px;height:192px;--pc:#8c3cdc;--sc:#f5af14;">
        <div class="layer-p"></div>
        <div class="layer-s"></div>
        <div class="layer-g"></div>
      </div>
    </div>
  </div>
</section>

<div class="footer">
  <strong>Architecture note.</strong>
  The three-sibling pattern is the web equivalent of layered material channels in Unreal.
  Per-particle mask switching costs zero new CSS -- set 4 vars on the wrapper div and every
  child layer resolves to that particle's masks automatically via CSS inheritance.
  To add a new particle to the system: generate it, run <code>gen_particle_mask.py</code>,
  add 4 CSS vars to <code>:root</code>, done.
  <br><br>
  <strong>Threshold tuning.</strong>
  Run <code>gen_particle_mask.py &lt;name&gt; --mid N --shine N</code> to shift the zone boundaries.
  The right values depend on the particle's luminance distribution -- check the buckets first.
</div>

<script>
  function bindLivePicker(orbId, pcPickerId, pcHexId, scPickerId, scHexId) {{
    const orb      = document.getElementById(orbId);
    const pcPicker = document.getElementById(pcPickerId);
    const pcHex    = document.getElementById(pcHexId);
    const scPicker = document.getElementById(scPickerId);
    const scHex    = document.getElementById(scHexId);

    function setPC(c) {{ orb.style.setProperty('--pc', c); }}
    function setSC(c) {{ orb.style.setProperty('--sc', c); }}

    function bindPair(picker, hex, setter) {{
      picker.addEventListener('input', e => {{ hex.value = e.target.value; setter(e.target.value); }});
      hex.addEventListener('input', e => {{
        const v = e.target.value.trim();
        if (/^#?[0-9a-fA-F]{{3,8}}$/.test(v)) {{
          const c = v.startsWith('#') ? v : '#' + v;
          if (c.length === 7) picker.value = c;
          setter(c);
        }}
      }});
    }}
    bindPair(pcPicker, pcHex, setPC);
    bindPair(scPicker, scHex, setSC);
  }}

  bindLivePicker('live-orb',    'pc-picker',    'pc-hex',    'sc-picker',    'sc-hex');
  bindLivePicker('live-orb-c9', 'c9-pc-picker', 'c9-pc-hex', 'c9-sc-picker', 'c9-sc-hex');
</script>

</body>
</html>
"""

OUT_HTML.write_text(HTML, encoding="utf-8")
print(f"Written: {OUT_HTML.relative_to(ROOT)} ({len(HTML):,} chars)")
