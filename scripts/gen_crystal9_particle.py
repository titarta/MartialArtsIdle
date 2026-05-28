"""
gen_crystal9_particle.py — generate a 128x128 qi particle styled after
the tier-9 crystal palette for the particle-mask pipeline demo.

Crystal 9 palette:
  Primary zone  — pale violet outer shell  (#cc88ff, #a040c8)
  Secondary zone — warm amber-gold inner   (#ffcc44, #ffaa22)
  Shine zone    — blazing white-yellow core (#fffacc, #ffffff)

The particle is painted with these real colours so we can:
  1. See what a two-accent particle looks like at game quality
  2. Run colour-region extraction on it (hue-based, not just luminance)
     to produce primary / secondary / shine masks automatically

Output: tmp/qi_particles/crystal9_orb_cand_N.png (4 candidates at 128px)

Usage:
    python scripts/gen_crystal9_particle.py generate
    python scripts/gen_crystal9_particle.py finalize <cand_n>
"""

import json, base64, time, sys
from pathlib import Path
import urllib.request, urllib.error
from PIL import Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT        = Path(__file__).parent.parent
TMP_DIR     = ROOT / "tmp/qi_particles"
OUT_DIR     = ROOT / "public/sprites/vfx/qi_particles"
SHAPE_REF   = ROOT / "public/sprites/vfx/qi_particles/qi_orb_bright.png"   # locks shape
COLOUR_REF  = ROOT / "public/crystals/crystal_9.png"                        # locks palette
API_KEY     = "886d28c4-fb31-429d-832e-1242e312160e"
BASE_URL    = "https://api.pixellab.ai/v2"
PID         = "crystal9_orb"

TMP_DIR.mkdir(parents=True, exist_ok=True)

DESCRIPTION = (
    "Pixel art VFX particle: a small glowing energy orb on a fully transparent background. "
    "Simple round ball shape exactly like the reference image. No crystal facets, no prism, no complex shapes. "
    "Colours from edge to centre: "
    "thin 1px dark outline, "
    "pale violet outer ring (#cc88ff to #a040c8), "
    "warm amber-gold inner body (#ffcc44 to #ffaa22), "
    "blazing white-yellow core (#fffacc, #ffffff). "
    "Three concentric colour bands, flat pixel fills, crisp edges. "
    "Transparent background."
)


def _headers():
    return {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

def api_post(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(f"{BASE_URL}{path}", data=data, headers=_headers())
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.load(resp)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode()[:600]}") from e

def api_get(path):
    req = urllib.request.Request(f"{BASE_URL}{path}", headers=_headers())
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)

def poll_job(job_id, max_wait=600):
    print(f"  polling {job_id[:8]}...", end="", flush=True)
    for _ in range(max_wait // 5):
        time.sleep(5)
        r = api_get(f"/background-jobs/{job_id}")
        if r.get("status") == "completed":
            print(" done")
            return r
        if r.get("status") == "failed":
            raise RuntimeError(f"Job failed: {r}")
        print(".", end="", flush=True)
    raise TimeoutError(f"Job {job_id} timed out")

def decode_b64(b64):
    if "," in b64: b64 = b64.split(",", 1)[1]
    return base64.b64decode(b64)

def save_image(img_obj, path):
    if img_obj.get("type") == "rgba_bytes":
        Image.frombytes(
            "RGBA", (img_obj["width"], img_obj["height"]),
            decode_b64(img_obj["base64"])
        ).save(str(path))
    else:
        path.write_bytes(decode_b64(img_obj["base64"]))

def crop_transparent_edges(img):
    w, h = img.size
    px = img.load()
    col = lambda x: any(px[x, y][3] > 10 for y in range(h))
    row = lambda y: any(px[x, y][3] > 10 for x in range(w))
    l = next((x for x in range(w)           if col(x)), 0)
    r = next((x for x in range(w-1,-1,-1)   if col(x)), w-1)
    t = next((y for y in range(h)           if row(y)), 0)
    b = next((y for y in range(h-1,-1,-1)   if row(y)), h-1)
    return img.crop((l, t, r+1, b+1))


def run_generate():
    print(f"\nGenerating {PID} at 64x64 (crystal-9 palette, dual-reference)...")
    body = {
        "description": DESCRIPTION,
        "image_size":  {"width": 64, "height": 64},
        "no_background": True,
    }
    # Shape reference: locks the simple round orb silhouette
    if SHAPE_REF.exists():
        shape_b64 = base64.b64encode(SHAPE_REF.read_bytes()).decode()
        sw, sh    = Image.open(SHAPE_REF).size
        body["reference_images"] = [
            {"image": {"type": "base64", "base64": shape_b64, "format": "png"},
             "size":  {"width": sw, "height": sh}}
        ]
        print(f"  Shape ref:  {SHAPE_REF.name}  ({sw}x{sh})")
    else:
        print(f"  (no shape ref at {SHAPE_REF})")

    # Colours are baked into the description as hex values instead of a style_image
    # (style_image with a crystal PNG pulled the model towards crystal shapes, not particle shapes)

    status, r = api_post("/generate-image-v2", body)
    if status != 202:
        raise RuntimeError(f"generate-image-v2 returned {status}: {r}")

    result = poll_job(r["background_job_id"])
    images = result.get("last_response", {}).get("images", [])
    if not images:
        raise RuntimeError("No images in response")

    paths = []
    for i, img in enumerate(images):
        p = TMP_DIR / f"{PID}_cand_{i}.png"
        save_image(img, p)
        paths.append(p)
        print(f"  cand_{i}: {p.name}  ({img['width']}x{img['height']})")

    print(f"\nSaved {len(paths)} candidates to {TMP_DIR.relative_to(ROOT)}")
    print(f"Review, then run: python scripts/gen_crystal9_particle.py finalize <n>")
    return paths


def run_finalize(cand_n):
    src = TMP_DIR / f"{PID}_cand_{cand_n}.png"
    if not src.exists():
        raise FileNotFoundError(f"Candidate not found: {src}")
    img = Image.open(src).convert("RGBA")
    img = crop_transparent_edges(img)
    out = OUT_DIR / f"{PID}.png"
    img.save(str(out))
    print(f"Finalized -> {out.relative_to(ROOT)}  ({img.size[0]}x{img.size[1]})")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "generate"
    if cmd == "generate":
        run_generate()
    elif cmd == "finalize":
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 0
        run_finalize(n)
    else:
        print("Usage: python scripts/gen_crystal9_particle.py [generate|finalize <n>]")
