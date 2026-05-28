"""
gen_qi_variants.py -- generate two batches of 64x64 qi particle variants:
  simple  -- clean minimal glowing bubbles (great for primary body colour)
  detail  -- orbs with flow lines / qi wisps (accent ring for secondary colour)

Both batches use qi_orb_bright.png as the shape reference so the output stays
round and compact. Variety comes from the description, not from a style_image
(which we learned pulls too hard towards the reference art style).

Output: tmp/qi_particles/qi_var_simple_cand_N.png  (N=0..15)
        tmp/qi_particles/qi_var_detail_cand_N.png  (N=0..15)

Usage:
    python scripts/gen_qi_variants.py generate simple
    python scripts/gen_qi_variants.py generate detail
    python scripts/gen_qi_variants.py generate         <- both batches
    python scripts/gen_qi_variants.py finalize simple <n>
    python scripts/gen_qi_variants.py finalize detail  <n>
"""

import json, base64, time, sys
from pathlib import Path
import urllib.request, urllib.error
from PIL import Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT      = Path(__file__).parent.parent
TMP_DIR   = ROOT / "tmp/qi_particles"
OUT_DIR   = ROOT / "public/sprites/vfx/qi_particles"
SHAPE_REF = ROOT / "public/sprites/vfx/qi_particles/qi_orb_bright.png"
API_KEY   = "886d28c4-fb31-429d-832e-1242e312160e"
BASE_URL  = "https://api.pixellab.ai/v2"

TMP_DIR.mkdir(parents=True, exist_ok=True)

# ── Descriptions ──────────────────────────────────────────────────────────────

DESCRIPTIONS = {
    "simple": (
        "Pixel art. One isolated glowing ball floating in the centre of a transparent canvas. "
        "Nothing else in the image. "
        "The ball has three concentric colour rings: dark 1px outer border, "
        "pale blue-cyan body, bright white-yellow centre. "
        "Flat fills, crisp edges. "
        "NO person. NO human. NO hands. NO body. NO scene. NO background elements. "
        "ONLY the ball. Isolated object on a fully transparent background."
    ),
    "detail": (
        "Pixel art. One isolated glowing ball with short light rays, "
        "floating in the centre of a transparent canvas. "
        "Nothing else in the image. "
        "The ball has three concentric colour rings: dark 1px outer border, "
        "blue-cyan body, bright white core. "
        "4 to 6 very short straight pixel lines (2-3 pixels each) point outward "
        "from the ball like a star or sparkle shape. "
        "NO person. NO human. NO hands. NO body. NO scene. NO background elements. "
        "ONLY the ball with its small star-point rays. "
        "Isolated object on a fully transparent background."
    ),
}

# ── API helpers ───────────────────────────────────────────────────────────────

def _headers():
    return {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

def api_post(path, body):
    data = json.dumps(body).encode()
    req  = urllib.request.Request(f"{BASE_URL}{path}", data=data, headers=_headers())
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
    px   = img.load()
    col  = lambda x: any(px[x, y][3] > 10 for y in range(h))
    row  = lambda y: any(px[x, y][3] > 10 for x in range(w))
    l = next((x for x in range(w)         if col(x)), 0)
    r = next((x for x in range(w-1,-1,-1) if col(x)), w-1)
    t = next((y for y in range(h)         if row(y)), 0)
    b = next((y for y in range(h-1,-1,-1) if row(y)), h-1)
    return img.crop((l, t, r+1, b+1))


# ── Generate ──────────────────────────────────────────────────────────────────

def run_generate(style):
    desc = DESCRIPTIONS[style]
    pid  = f"qi_var_{style}"
    print(f"\nGenerating {pid} at 64x64...")

    body = {
        "description": desc,
        "image_size":  {"width": 64, "height": 64},
        "no_background": True,
    }

    if SHAPE_REF.exists():
        shape_b64 = base64.b64encode(SHAPE_REF.read_bytes()).decode()
        sw, sh    = Image.open(SHAPE_REF).size
        body["reference_images"] = [
            {"image": {"type": "base64", "base64": shape_b64, "format": "png"},
             "size":  {"width": sw, "height": sh}}
        ]
        print(f"  Shape ref: {SHAPE_REF.name}  ({sw}x{sh})")
    else:
        print(f"  (no shape ref found at {SHAPE_REF})")

    status, r = api_post("/generate-image-v2", body)
    if status != 202:
        raise RuntimeError(f"generate-image-v2 returned {status}: {r}")

    result = poll_job(r["background_job_id"])
    images = result.get("last_response", {}).get("images", [])
    if not images:
        raise RuntimeError("No images in response")

    paths = []
    for i, img in enumerate(images):
        p = TMP_DIR / f"{pid}_cand_{i}.png"
        save_image(img, p)
        paths.append(p)
        print(f"  cand_{i}: {p.name}  ({img['width']}x{img['height']})")

    print(f"\nSaved {len(paths)} candidates to {TMP_DIR.relative_to(ROOT)}")
    print(f"Run: python scripts/gen_qi_variants.py finalize {style} <n>")
    return paths


# ── Finalize ──────────────────────────────────────────────────────────────────

def run_finalize(style, cand_n):
    pid  = f"qi_var_{style}"
    src  = TMP_DIR / f"{pid}_cand_{cand_n}.png"
    if not src.exists():
        raise FileNotFoundError(f"Candidate not found: {src}")
    img = Image.open(src).convert("RGBA")
    img = crop_transparent_edges(img)
    out = OUT_DIR / f"{pid}.png"
    img.save(str(out))
    print(f"Finalized -> {out.relative_to(ROOT)}  ({img.size[0]}x{img.size[1]})")


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    cmd    = sys.argv[1] if len(sys.argv) > 1 else "generate"
    styles = ["simple", "detail"]

    if cmd == "generate":
        targets = [sys.argv[2]] if len(sys.argv) > 2 and sys.argv[2] in styles else styles
        for s in targets:
            run_generate(s)
    elif cmd == "finalize":
        if len(sys.argv) < 4:
            print("Usage: python scripts/gen_qi_variants.py finalize <simple|detail> <n>")
            sys.exit(1)
        style  = sys.argv[2]
        cand_n = int(sys.argv[3])
        run_finalize(style, cand_n)
    else:
        print("Usage: python scripts/gen_qi_variants.py [generate [simple|detail]] | [finalize <style> <n>]")
