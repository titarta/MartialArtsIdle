"""
gen_crystals.py — Qi crystal sprite generation pipeline for MartialArtsIdle.

Generates 11 crystal variants:
  crystal_locked   — chained, dormant, matches tier 1 base shape
  crystal_1        — unchained raw crystal (same shape as locked)
  crystal_2–10     — progressive evolution: more facets, glow, form changes

WORKFLOW (2 steps per crystal):
  1. Generate candidates:
       python gen_crystals.py generate <crystal_id>
       → saves candidates to tmp/crystal_gen/
       → review, pick the best

  2. Finalize chosen candidate:
       python gen_crystals.py finalize <crystal_id> <cand_number>
       → crops transparent edges, saves to public/crystals/<crystal_id>.png

  Batch-generate all:
       python gen_crystals.py generate-all

PALETTE IDENTITY:
  Crystals use cool blues / purples / whites — intentionally contrasting with
  the cultivation screen's warm red lacquer + gold palette.

DEPENDENCIES:
  pip install Pillow
"""

import json, base64, time, sys
from pathlib import Path
import urllib.request, urllib.error
from PIL import Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

API_KEY  = "886d28c4-fb31-429d-832e-1242e312160e"
BASE_URL = "https://api.pixellab.ai/v2"
OUT_DIR  = Path(__file__).parent.parent / "public/crystals"
TMP_DIR  = Path(__file__).parent.parent / "tmp/crystal_gen"
OUT_DIR.mkdir(parents=True, exist_ok=True)
TMP_DIR.mkdir(parents=True, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# HTTP helpers
# ─────────────────────────────────────────────────────────────────────────────

def _headers():
    return {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

def api_post(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(f"{BASE_URL}{path}", data=data, headers=_headers())
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.load(resp)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code} on {path}: {e.read().decode()[:600]}") from e

def api_get(path):
    req = urllib.request.Request(f"{BASE_URL}{path}", headers=_headers())
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)

def poll_job(job_id, max_wait=600):
    print(f"    polling {job_id[:8]}...", end="", flush=True)
    for _ in range(max_wait // 5):
        time.sleep(5)
        r = api_get(f"/background-jobs/{job_id}")
        if r.get("status") == "completed":
            print(" done")
            return r
        if r.get("status") == "failed":
            raise RuntimeError(f"Job failed: {r}")
        print(".", end="", flush=True)
    raise TimeoutError(f"Job {job_id} timed out after {max_wait}s")

def decode_b64(b64):
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    return base64.b64decode(b64)

def save_image(img_obj, path):
    if img_obj.get("type") == "rgba_bytes":
        Image.frombytes(
            "RGBA", (img_obj["width"], img_obj["height"]),
            decode_b64(img_obj["base64"])
        ).save(str(path))
    else:
        Path(path).write_bytes(decode_b64(img_obj["base64"]))

# ─────────────────────────────────────────────────────────────────────────────
# Art style anchor
# ─────────────────────────────────────────────────────────────────────────────

S = (
    "Xianxia cultivation fantasy pixel art game object. "
    "16-bit style, limited palette. "
    "NO hard dark outline — the crystal edges should fade softly into transparency via glow and light. "
    "The crystal silhouette is defined by its own luminosity and facet highlights, not by an outline stroke. "
    "Fully transparent background — the crystal floats in empty space. "
    "Portrait orientation, crystal centred in frame with room for glow effects. "
    "No western fantasy aesthetics, no UI chrome, no text, no ground shadow."
)

# ─────────────────────────────────────────────────────────────────────────────
# Crystal definitions
# ─────────────────────────────────────────────────────────────────────────────

CRYSTALS = {

    # ── Locked — same rough shape as crystal_1 but dormant and chained ────────
    "crystal_locked": {
        "size": (128, 128),
        "desc": (
            "A pixel art qi crystal, dormant and sealed. "
            "Shape: a rough, irregular natural mineral cluster — jagged asymmetric shards jutting at odd angles, "
            "like raw uncut gemstone pulled from the earth. No perfect geometry, no clean prism. "
            "This rough shape is IDENTICAL to the unchained tier 1 version of this crystal. "
            "Color: dull dead grey with a faint cold-blue undertone — completely inert, no glow. "
            "Surface: clouded and opaque, like a gemstone with all qi drained from it. Faint cracks. "
            "Sealed by two heavy iron chains crossing diagonally over the crystal body in an X pattern. "
            "Chains: thick dark-iron pixel chains with chunky oval links, visibly heavy and oppressive. "
            "A single iron padlock at the chain crossing point, rusted dark metal. "
            "The chains wrap around and behind the crystal, clearly binding it. "
            "Palette: dark charcoal, dead slate-grey, cold blue-grey undertone, iron-black chain, rust-brown lock. "
            "No glow, no radiance, no energy — completely sealed and inert. "
            f"{S}"
        ),
    },

    # ── Tier 1 — unchained, same rough shape as locked ────────────────────────
    "crystal_1": {
        "size": (128, 128),
        "desc": (
            "A pixel art qi crystal, newly unchained — raw and barely awakened. "
            "Shape: a rough, irregular natural mineral cluster — jagged asymmetric shards jutting at odd angles, "
            "like raw uncut gemstone. No perfect geometry. "
            "This is the SAME rough shape as the locked version, just without chains. "
            "Color: pale grey-blue with the very first hint of translucency — like a cloudy piece of raw quartz. "
            "A single faint cold glimmer deep in the core, barely visible through the clouded surface. "
            "Surface: slightly translucent in places, rough and unpolished, minor cracks. "
            "No aura, no orbiting effects — just the faintest awakening. "
            "Palette: cool slate-blue (#8899bb range), pale ice-white core glimmer (#ddeeff), dark blue-grey outline. "
            f"{S}"
        ),
    },

    # ── Tier 2 ────────────────────────────────────────────────────────────────
    "crystal_2": {
        "size": (128, 128),
        "desc": (
            "A pixel art qi crystal at tier 2 — the same raw stone, cold light awakening inside it. "
            "CRITICAL: same crystal as the reference, evolved — same rough shape, no new elements added around it. "
            "Just the crystal itself, isolated, no orbiting fragments, no effects outside the stone. "
            "The grey cloudiness of tier 1 is thinning — clean icy blue is coming through. "
            "The stone is more translucent now, facet edges catching cold light. "
            "A soft inner glow pulses from the core, just barely reaching the surface. "
            "Palette: ice blue (#4488bb), cold white-blue inner glow (#cceeff), no hard outline. "
            f"{S}"
        ),
    },

    # ── Tier 3 ────────────────────────────────────────────────────────────────
    "crystal_3": {
        "size": (128, 128),
        "desc": (
            "A pixel art qi crystal at tier 3 — the same stone, now clearly luminous and teal. "
            "CRITICAL: same crystal as the reference, evolved — same rough jagged shape, nothing added outside it. "
            "Just the crystal, isolated. No orbiting fragments, no external effects. "
            "The color has shifted from icy blue to vivid cyan-teal — a clear step. "
            "The stone is visibly translucent, inner cold-white core shining through the facets. "
            "The glow is stronger — the crystal surface itself is luminous, not just the core. "
            "Palette: vivid cyan-teal (#00bbcc), bright cold-white inner core (#aaffee), soft teal glow on surface. "
            f"{S}"
        ),
    },

    # ── Tier 4 ────────────────────────────────────────────────────────────────
    "crystal_4": {
        "size": (128, 128),
        "desc": (
            "A pixel art qi crystal at tier 4 — the same stone, deepening into azure blue power. "
            "CRITICAL: same crystal as the reference, evolved — same rough shape, nothing outside it. "
            "Just the crystal, isolated. No orbiting shards, no external effects whatsoever. "
            "Color has shifted from teal to deep azure blue — vivid and saturated. "
            "The stone is highly translucent, internal radiance blazing through every facet. "
            "Bright cold rays stab outward from the sharpest tips — light escaping the stone. "
            "The glow emanates from the crystal itself, not from anything around it. "
            "Palette: deep azure (#1155cc), bright cyan at sharp tips (#55ddff), blazing white inner core. "
            f"{S}"
        ),
    },

    # ── Tier 5 ────────────────────────────────────────────────────────────────
    "crystal_5": {
        "size": (128, 128),
        "desc": (
            "A pixel art qi crystal at tier 5 — the same stone, now rich indigo and deeply powerful. "
            "CRITICAL: same crystal as the reference, evolved — same rough shape, nothing outside it. "
            "Just the crystal, isolated. No orbiting shards, no sparks, no external effects. "
            "Color has shifted from azure to rich deep indigo-blue — darker, more saturated, more imposing. "
            "The stone is growing — visibly larger and more imposing than tier 4. "
            "Electric blue light bleeds along the natural fracture lines of the stone from within. "
            "The interior blazes intensely white-blue — the stone feels like it is barely containing it. "
            "Palette: deep indigo (#2233aa), electric blue fracture glow (#6699ff), blazing white-blue core. "
            f"{S}"
        ),
    },

    # ── Tier 6 ────────────────────────────────────────────────────────────────
    "crystal_6": {
        "size": (128, 128),
        "desc": (
            "A pixel art qi crystal at tier 6 — the same stone, now radiating pure violet light. "
            "CRITICAL: same crystal as the reference, evolved — same rough shape, nothing outside it. "
            "Just the crystal, isolated. No orbiting shards, no rings, no external effects. "
            "Clean powerful beauty — not evil, not dark, just pure intensifying energy. "
            "Color: rich violet-purple, a warm and vivid shift from the indigo of tier 5. "
            "The stone is bigger and more luminous — inner white light bleeds through semi-transparent purple facets. "
            "Every facet catches light cleanly, the crystal looks precious and powerful. "
            "Palette: rich violet (#6600cc), bright blue-violet facet shimmer (#9966ff), brilliant white inner core. "
            f"{S}"
        ),
    },

    # ── Tier 7 ────────────────────────────────────────────────────────────────
    "crystal_7": {
        "size": (128, 128),
        "desc": (
            "A pixel art qi crystal at tier 7 — the same stone, blazing with pure cold amethyst light. "
            "CRITICAL: same crystal as the reference, evolved — same rough shape, nothing outside it. "
            "Just the crystal, isolated. No external effects of any kind. "
            "Clean ascending power — beautiful and bright, not dark or ominous. "
            "Color: vivid amethyst, a clear step up from tier 6's violet — brighter and more saturated. "
            "The stone is larger, its walls growing thinner and more translucent under the pressure of inner light. "
            "The core blazes brilliant white, the body glows amethyst, the tips shimmer ice-blue — pure layered cold light. "
            "Palette: vivid amethyst (#8800dd), cold ice-blue tips (#aaddff), blazing white core. "
            f"{S}"
        ),
    },

    # ── Tier 8 ────────────────────────────────────────────────────────────────
    "crystal_8": {
        "size": (128, 128),
        "desc": (
            "A pixel art qi crystal at tier 8 — the same stone, a warm golden light kindling inside the amethyst. "
            "CRITICAL: same crystal as the reference, evolved — same rough shape, nothing outside it. Just the crystal, isolated. "
            "The exterior is still recognizably amethyst-purple from tier 7, but something has changed inside: "
            "a warm golden-white glow is now visible deep in the core — like a flame just igniting within cold stone. "
            "The crystal is slightly larger. The interior has two layers of light visible through the translucent stone: "
            "the outer glow is still cool violet, but the very core burns warm golden-white. "
            "The warmth is subtle but unmistakable — the divine heat is waking up inside the crystal. "
            "Palette: amethyst exterior (#8800cc), warm golden-white inner core (#fff0aa), violet-to-gold transition inside. "
            f"{S}"
        ),
    },

    # ── Tier 9 ────────────────────────────────────────────────────────────────
    "crystal_9": {
        "size": (128, 128),
        "desc": (
            "A pixel art qi crystal at tier 9 — the same stone, warm solar energy bursting through the cracks. "
            "CRITICAL: same crystal as the reference, evolved — same rough shape, grown larger. "
            "The cold amethyst exterior is cracking — warm golden-white light blazes through the fracture lines. "
            "Stone is transitioning: pale violet outer edges, burning amber-gold toward the centre, blazing white-yellow core. "
            "NEW: small warm golden particles — tiny bright pixel sparks in amber and gold — drift just outside the crystal surface, "
            "as if the core energy is leaking out and escaping into the air around it. "
            "The particles match the warm core color: golden-white (#ffe88a), soft amber (#ffcc44). "
            "They are few and subtle — 6 to 10 tiny pixel specks floating close to the crystal, not far away. "
            "The feeling: the core is so hot it is beginning to radiate outward. "
            "Palette: pale violet edges (#cc88ff), warm amber-gold midtone (#ffcc44), blazing white-yellow core (#fffacc), warm particle sparks. "
            f"{S}"
        ),
    },

    # ── Tier 10 — max ascension ────────────────────────────────────────────────
    "crystal_10": {
        "size": (128, 128),
        "desc": (
            "A pixel art qi crystal at tier 10 — the same stone, fully ascended into a divine solar form. "
            "CRITICAL: same crystal as the reference, at its ultimate form — the rough cluster shape still faintly visible. "
            "The crystal IS the sun now — blazing white-yellow-orange divine light in crystal form. "
            "The stone silhouette is barely visible, outlined only by the faintest warm-gold edge. "
            "The interior is pure blazing white at the core, fading to brilliant yellow, then warm orange at the edges. "
            "NEW: warm golden-orange particles burst outward from the crystal — more numerous and energetic than tier 9. "
            "15 to 20 tiny pixel sparks in solar orange (#ffaa22), golden yellow (#ffe566), and bright white (#ffffff) "
            "radiate outward from the crystal surface in all directions, as if the sun itself is erupting. "
            "The particles are the same warm colors as the core — it feels like the crystal is shedding pure divine energy. "
            "Fills the frame. Overwhelmingly luminous. Sacred. Godly. "
            "Palette: blazing white core (#ffffff), divine yellow (#ffe566), warm solar orange (#ffaa22), particle sparks in the same tones. "
            "The pinnacle — the same crystal, now a divine sun shedding its light into the world. "
            f"{S}"
        ),
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Post-processing
# ─────────────────────────────────────────────────────────────────────────────

def crop_transparent_edges(img):
    """Trim fully-transparent border rows/columns from a RGBA image."""
    w, h = img.size
    px = img.load()

    def col_has_content(x):
        return any(px[x, y][3] > 10 for y in range(h))

    def row_has_content(y):
        return any(px[x, y][3] > 10 for x in range(w))

    left  = next((x for x in range(w)           if col_has_content(x)), 0)
    right = next((x for x in range(w-1, -1, -1) if col_has_content(x)), w - 1)
    top   = next((y for y in range(h)           if row_has_content(y)), 0)
    bot   = next((y for y in range(h-1, -1, -1) if row_has_content(y)), h - 1)

    cropped = img.crop((left, top, right + 1, bot + 1))
    print(f"  Cropped: {w}x{h} → {cropped.size[0]}x{cropped.size[1]}")
    return cropped

# ─────────────────────────────────────────────────────────────────────────────
# Pipeline steps
# ─────────────────────────────────────────────────────────────────────────────

CRYSTAL_ORDER = [
    "crystal_locked", "crystal_1", "crystal_2", "crystal_3", "crystal_4",
    "crystal_5", "crystal_6", "crystal_7", "crystal_8", "crystal_9", "crystal_10",
]

def _prev_finalized(crystal_id):
    """Return the finalized PNG path of the previous crystal in the chain, if it exists."""
    idx = CRYSTAL_ORDER.index(crystal_id) if crystal_id in CRYSTAL_ORDER else -1
    if idx <= 0:
        return None
    prev_id = CRYSTAL_ORDER[idx - 1]
    path = OUT_DIR / f"{prev_id}.png"
    return path if path.exists() else None


def run_generate(crystal_id, ref_path=None):
    if crystal_id not in CRYSTALS:
        raise ValueError(f"Unknown crystal '{crystal_id}'. Known: {list(CRYSTALS)}")

    cfg = CRYSTALS[crystal_id]
    w, h = cfg["size"]

    # Auto-detect previous finalized crystal as reference if none supplied
    if ref_path is None:
        ref_path = _prev_finalized(crystal_id)

    print(f"\n{'='*60}")
    print(f"  Generating: {crystal_id}  ({w}x{h})")
    if ref_path:
        print(f"  Reference:  {ref_path.name}")
    print(f"{'='*60}")

    body = {
        "description": cfg["desc"],
        "image_size":  {"width": w, "height": h},
        "no_background": True,
    }

    if ref_path and ref_path.exists():
        ref_b64  = base64.b64encode(ref_path.read_bytes()).decode()
        ref_img  = {"type": "base64", "base64": ref_b64, "format": "png"}
        rw, rh   = Image.open(ref_path).size
        ref_sized = {"image": ref_img, "size": {"width": rw, "height": rh}}
        body["reference_images"] = [ref_sized]
        body["style_image"]      = ref_sized

    status, r = api_post("/generate-image-v2", body)
    if status != 202:
        raise RuntimeError(f"generate-image-v2 returned {status}: {r}")

    result = poll_job(r["background_job_id"])
    images = result.get("last_response", {}).get("images", [])
    if not images:
        raise RuntimeError("No images returned")

    print(f"\n  Saved to: {TMP_DIR}")
    for i, img in enumerate(images):
        path = TMP_DIR / f"{crystal_id}_cand_{i}.png"
        save_image(img, path)
        print(f"    cand_{i}: {path.name}  ({img['width']}x{img['height']})")

    print(f"\n  Review, then run:")
    print(f"    python gen_crystals.py finalize {crystal_id} <cand_number>")


def run_finalize(crystal_id, cand_n):
    if crystal_id not in CRYSTALS:
        raise ValueError(f"Unknown crystal '{crystal_id}'. Known: {list(CRYSTALS)}")

    src = TMP_DIR / f"{crystal_id}_cand_{cand_n}.png"
    if not src.exists():
        raise FileNotFoundError(f"Candidate not found: {src}")

    print(f"\n  Finalizing {crystal_id} from cand_{cand_n}...")

    img = Image.open(src).convert("RGBA")
    img = crop_transparent_edges(img)

    out_path = OUT_DIR / f"{crystal_id}.png"
    img.save(str(out_path))
    print(f"  Saved {img.size[0]}x{img.size[1]} RGBA → {out_path}")
    print(f"\n  Done.")


def run_generate_all():
    print(f"\n  Generating all {len(CRYSTALS)} crystals sequentially...")
    for crystal_id in CRYSTALS:
        try:
            run_generate(crystal_id)
        except Exception as e:
            print(f"\n  ERROR on {crystal_id}: {e}")
            print("  Continuing with next...")

# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "generate":
        run_generate(sys.argv[2])
    elif len(sys.argv) == 4 and sys.argv[1] == "finalize":
        run_finalize(sys.argv[2], sys.argv[3])
    elif len(sys.argv) == 2 and sys.argv[1] == "generate-all":
        run_generate_all()
    else:
        print("Usage:")
        print(f"  python {sys.argv[0]} generate <crystal_id>")
        print(f"  python {sys.argv[0]} finalize <crystal_id> <cand_number>")
        print(f"  python {sys.argv[0]} generate-all")
        print(f"\nKnown crystals ({len(CRYSTALS)}):")
        for cid in CRYSTALS:
            print(f"  {cid}")
