"""
gen_orbital_vfx.py — Crimson Aura orbital VFX asset generator for MartialArtsIdle.

Generates the small bodies that orbit the cultivator while the premium
Crimson Aura (x2) buff is active:

  crimson_orb    — a glowing sphere of condensed crimson qi
  crimson_shard  — a sharp faceted blood-crystal fragment

Each is ONE call at 128x128 with no_background, which returns the 2x2 grid
(4 candidates). Pick one (or several) to finalize.

WORKFLOW (2 steps per asset):
  1. Generate candidates:
       python scripts/gen_orbital_vfx.py generate crimson_orb
       -> saves candidates to tmp/orbital_vfx_gen/
  2. Finalize chosen candidate:
       python scripts/gen_orbital_vfx.py finalize crimson_orb <cand_number>
       -> crops transparent edges, saves to public/vfx/<id>.png

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

# -----------------------------------------------------------------------------
# Configuration (shares the project PixelLab account used by the other gens)
# -----------------------------------------------------------------------------

API_KEY  = "886d28c4-fb31-429d-832e-1242e312160e"
BASE_URL = "https://api.pixellab.ai/v2"
OUT_DIR  = Path(__file__).parent.parent / "public/vfx"
TMP_DIR  = Path(__file__).parent.parent / "tmp/orbital_vfx_gen"
OUT_DIR.mkdir(parents=True, exist_ok=True)
TMP_DIR.mkdir(parents=True, exist_ok=True)

# -----------------------------------------------------------------------------
# HTTP helpers
# -----------------------------------------------------------------------------

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

# -----------------------------------------------------------------------------
# Art style anchor (shared)
# -----------------------------------------------------------------------------

S = (
    "Xianxia cultivation fantasy pixel art VFX object. "
    "16-bit style, limited palette, clean crisp pixels. "
    "NO hard dark outline stroke -- the silhouette is defined by its own glow and light. "
    "Fully transparent background, the object floats alone in empty space, "
    "centred in frame with room around it for glow. "
    "Single bold readable shape that stays legible when shrunk small. "
    "No western fantasy aesthetics, no UI chrome, no text, no caption, no labels, "
    "no ground shadow, no character, no background scenery."
)

# -----------------------------------------------------------------------------
# Asset definitions
# -----------------------------------------------------------------------------

ASSETS = {

    # Glowing sphere of condensed crimson qi -- the orbiting "orb" body.
    "crimson_orb": {
        "size": (128, 128),
        "desc": (
            "A glowing round orb of condensed crimson qi energy, a single luminous sphere. "
            "TRANSLUCENT and glassy like coloured glass or a bubble of light -- you can see through it, "
            "with soft semi-transparent alpha edges that fade into the air instead of a hard solid fill. "
            "A bright white-hot core glows at the centre, blooming outward through vivid translucent crimson, "
            "deepening to a faint blood-red rim that fades to nearly transparent at the very edge. "
            "A thin warm gold sheen catches the edge. A few tiny bright sparks drift just off the surface. "
            "Ethereal and luminous from within, the same see-through quality as this game's qi particle orbs, but crimson. "
            "Palette: white-hot core (#fff2f0), translucent crimson (#e23b54), deep blood-red (#7a0f1e), faint gold sheen (#e8b54a). "
            f"{S}"
        ),
    },

    # Sharp faceted blood-crystal fragment -- the orbiting "shard" body.
    "crimson_shard": {
        "size": (128, 128),
        # style_image only (not reference_images) so we borrow the crystal's
        # facet/translucent TEXTURE without forcing its cluster shape; the prompt
        # drives the single-fragment shape and the crimson recolour.
        "ref": Path(__file__).parent.parent / "public/crystals/crystal_6.png",
        "desc": (
            "A single sharp fragment broken off a crimson qi crystal -- one jagged angular shard, NOT a full cluster. "
            "It has the SAME faceted translucent crystalline texture as the reference crystal: clean geometric facets, "
            "a glassy semi-transparent body you can see light through, a bright internal glow along the fracture lines, "
            "sharp crystalline edges catching highlights. "
            "But where the reference crystal is cool violet, THIS fragment is deep CRIMSON and blood-red all over -- "
            "a shard of a crimson version of the same qi stone. Strongly crimson, no blue, no purple. "
            "Translucent alpha: the thin edges fade to nearly transparent and light passes through the facets. "
            "A faint warm glow bleeds off the sharpest tip. "
            "Palette: deep crimson (#9c1228), bright crimson facet highlights (#e23b54), white-hot inner fracture glow (#fff0f0), faint gold edge (#e8b54a). "
            f"{S}"
        ),
    },
}

# -----------------------------------------------------------------------------
# Post-processing
# -----------------------------------------------------------------------------

def crop_transparent_edges(img):
    """Trim fully-transparent border rows/columns from an RGBA image."""
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
    print(f"  Cropped: {w}x{h} -> {cropped.size[0]}x{cropped.size[1]}")
    return cropped

# -----------------------------------------------------------------------------
# Pipeline steps
# -----------------------------------------------------------------------------

def run_generate(asset_id):
    if asset_id not in ASSETS:
        raise ValueError(f"Unknown asset '{asset_id}'. Known: {list(ASSETS)}")

    cfg = ASSETS[asset_id]
    w, h = cfg["size"]

    print(f"\n{'='*60}")
    print(f"  Generating: {asset_id}  ({w}x{h})")
    print(f"{'='*60}")

    body = {
        "description": cfg["desc"],
        "image_size":  {"width": w, "height": h},
        "no_background": True,
    }

    # Optional texture reference (style_image only — vibe/facets, not shape).
    ref = cfg.get("ref")
    if ref and Path(ref).exists():
        ref_b64   = base64.b64encode(Path(ref).read_bytes()).decode()
        rw, rh    = Image.open(ref).size
        ref_sized = {"image": {"type": "base64", "base64": ref_b64, "format": "png"},
                     "size":  {"width": rw, "height": rh}}
        body["style_image"] = ref_sized
        print(f"  Texture style ref: {Path(ref).name}  ({rw}x{rh})")

    status, r = api_post("/generate-image-v2", body)
    if status != 202:
        raise RuntimeError(f"generate-image-v2 returned {status}: {r}")

    result = poll_job(r["background_job_id"])
    images = result.get("last_response", {}).get("images", [])
    if not images:
        raise RuntimeError("No images returned")

    print(f"\n  Saved to: {TMP_DIR}")
    for i, img in enumerate(images):
        path = TMP_DIR / f"{asset_id}_cand_{i}.png"
        save_image(img, path)
        print(f"    cand_{i}: {path.name}  ({img['width']}x{img['height']})")

    print(f"\n  Review, then run:")
    print(f"    python scripts/gen_orbital_vfx.py finalize {asset_id} <cand_number>")


def run_finalize(asset_id, cand_n):
    if asset_id not in ASSETS:
        raise ValueError(f"Unknown asset '{asset_id}'. Known: {list(ASSETS)}")

    src = TMP_DIR / f"{asset_id}_cand_{cand_n}.png"
    if not src.exists():
        raise FileNotFoundError(f"Candidate not found: {src}")

    print(f"\n  Finalizing {asset_id} from cand_{cand_n}...")
    img = Image.open(src).convert("RGBA")
    img = crop_transparent_edges(img)

    out_path = OUT_DIR / f"{asset_id}.png"
    img.save(str(out_path))
    print(f"  Saved {img.size[0]}x{img.size[1]} RGBA -> {out_path}")
    print(f"\n  Done.")


def run_finalize_all(asset_id):
    """Crop + save EVERY candidate as <asset_id>_<n>.png (for mixed VFX sets)."""
    if asset_id not in ASSETS:
        raise ValueError(f"Unknown asset '{asset_id}'. Known: {list(ASSETS)}")
    cands = sorted(TMP_DIR.glob(f"{asset_id}_cand_*.png"))
    if not cands:
        raise FileNotFoundError(f"No candidates for {asset_id} in {TMP_DIR}")
    print(f"\n  Finalizing all {len(cands)} candidates of {asset_id}...")
    for src in cands:
        n = src.stem.split("_cand_")[-1]
        img = crop_transparent_edges(Image.open(src).convert("RGBA"))
        out_path = OUT_DIR / f"{asset_id}_{n}.png"
        img.save(str(out_path))
        print(f"    cand_{n} -> {out_path.name}  ({img.size[0]}x{img.size[1]})")
    print(f"\n  Done. {len(cands)} files in {OUT_DIR}")


def run_finalize_as(asset_id, cand_n, out_name):
    """Crop a specific candidate and save it under an explicit public/vfx name."""
    src = TMP_DIR / f"{asset_id}_cand_{cand_n}.png"
    if not src.exists():
        raise FileNotFoundError(f"Candidate not found: {src}")
    img = crop_transparent_edges(Image.open(src).convert("RGBA"))
    out = OUT_DIR / out_name
    img.save(str(out))
    print(f"  {src.name} -> {out.name}  ({img.size[0]}x{img.size[1]})")

# -----------------------------------------------------------------------------
# CLI
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "generate":
        run_generate(sys.argv[2])
    elif len(sys.argv) == 4 and sys.argv[1] == "finalize":
        run_finalize(sys.argv[2], sys.argv[3])
    elif len(sys.argv) == 3 and sys.argv[1] == "finalize-all":
        run_finalize_all(sys.argv[2])
    elif len(sys.argv) == 5 and sys.argv[1] == "finalize-as":
        run_finalize_as(sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        print("Usage:")
        print(f"  python {sys.argv[0]} generate <asset_id>")
        print(f"  python {sys.argv[0]} finalize <asset_id> <cand_number>")
        print(f"\nKnown assets ({len(ASSETS)}):")
        for aid in ASSETS:
            print(f"  {aid}")
